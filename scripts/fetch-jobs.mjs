#!/usr/bin/env node
// Fetches job postings from each company's public ATS endpoint
// and writes a dated snapshot. Computes a diff vs the most recent
// prior snapshot and prints a summary.
//
// Usage:
//   node scripts/fetch-jobs.mjs               # fetch all companies
//   node scripts/fetch-jobs.mjs anthropic     # fetch one company by slug
//   node scripts/fetch-jobs.mjs --concurrency 6
//
// Output:
//   data/snapshots/<slug>/<YYYY-MM-DD>.json

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const COMPANIES_DIR = path.join(ROOT, 'src', 'data', 'companies');
const SNAPSHOTS_DIR = path.join(ROOT, 'data', 'snapshots');

const today = () => new Date().toISOString().slice(0, 10);
const UA = 'IntentAlphaBot/0.2 (+https://intent-alpha.hide3desudesu.workers.dev; respectful-fetch)';

// Strip HTML, decode common entities, collapse whitespace, cap at maxChars.
// Used to capture JD body text without bloating snapshot files. The body
// powers tech-stack co-occurrence analysis; titles alone are too sparse to
// resolve interpretation ambiguities (e.g. PROV-010's BD (a)/(b) question).
function cleanBody(input, maxChars = 3000) {
  if (!input) return null;
  let text = String(input)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length > maxChars) text = text.slice(0, maxChars).trim() + '…';
  return text;
}

// ---------- adapters ----------

async function fetchGreenhouse(token) {
  // content=true is required for `departments` and `offices`; we now also
  // capture a cleaned, capped body for vocab / tech-stack analysis.
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`greenhouse ${token}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.jobs ?? []).map((j) => ({
    id: String(j.id),
    title: j.title,
    location: j.location?.name ?? null,
    department: (j.departments ?? []).map((d) => d.name).join(' / ') || null,
    offices: (j.offices ?? []).map((o) => o.name).join(' / ') || null,
    updated_at: j.updated_at ?? null,
    url: j.absolute_url ?? null,
    body: cleanBody(j.content),
  }));
}

async function fetchLever(token) {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(token)}?mode=json`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`lever ${token}: HTTP ${res.status}`);
  const json = await res.json();
  return (Array.isArray(json) ? json : []).map((j) => ({
    id: String(j.id),
    title: j.text,
    location: j.categories?.location ?? null,
    department: j.categories?.team ?? j.categories?.department ?? null,
    updated_at: j.createdAt ? new Date(j.createdAt).toISOString() : null,
    url: j.hostedUrl ?? null,
    body: cleanBody(j.descriptionPlain ?? j.description),
  }));
}

// Workday public endpoint pattern:
//   POST https://<host>/wday/cxs/<tenant>/<site>/jobs
//   { appliedFacets:{}, limit:20, offset:0, searchText:"" }
// Pagination via offset; some tenants accept higher limit, default 20 is universal.
async function fetchWorkday(cfg) {
  if (!cfg?.host || !cfg.tenant || !cfg.site) {
    throw new Error('workday: missing host/tenant/site');
  }
  const url = `https://${cfg.host}/wday/cxs/${cfg.tenant}/${cfg.site}/jobs`;
  const all = [];
  const limit = 20;
  const maxPages = 50; // hard cap = 1000 jobs / company
  for (let page = 0; page < maxPages; page++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': UA,
      },
      body: JSON.stringify({ appliedFacets: {}, limit, offset: page * limit, searchText: '' }),
    });
    if (!res.ok) throw new Error(`workday ${cfg.tenant}/${cfg.site}: HTTP ${res.status}`);
    const json = await res.json();
    const list = json.jobPostings ?? [];
    if (list.length === 0) break;
    for (const j of list) {
      const id = (j.bulletFields && j.bulletFields[0]) || j.externalPath || j.title;
      all.push({
        id: String(id),
        title: j.title,
        location: j.locationsText ?? null,
        department: null, // Workday public API rarely includes this; would need /jobs/<path> for details
        updated_at: j.postedOn ?? null,
        url: j.externalPath ? `https://${cfg.host}${j.externalPath}` : null,
      });
    }
    // Workday's CXS API returns total only on the first page; on later pages
    // it sometimes returns total=0 even when more jobs exist. Trust total only
    // when it's meaningful (>0 and >= what we have so far).
    const total = typeof json.total === 'number' && json.total > 0 ? json.total : null;
    if (total !== null && all.length >= total) break;
    if (list.length < limit) break;
  }
  return all;
}

async function fetchAshby(token) {
  // Ashby public job board JSON
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(token)}?includeCompensation=false`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`ashby ${token}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.jobs ?? []).map((j) => ({
    id: String(j.id),
    title: j.title,
    location: j.location ?? j.locationName ?? null,
    department: j.department ?? j.departmentName ?? null,
    updated_at: j.publishedAt ?? j.updatedAt ?? null,
    url: j.jobUrl ?? null,
    body: cleanBody(j.descriptionPlain ?? j.descriptionHtml),
  }));
}

async function fetchSmartRecruiters(token) {
  // SmartRecruiters public postings API; paginates 100 at a time.
  const all = [];
  let offset = 0;
  const limit = 100;
  for (let i = 0; i < 50; i++) {
    const url = `https://api.smartrecruiters.com/v1/companies/${encodeURIComponent(token)}/postings?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`smartrecruiters ${token}: HTTP ${res.status}`);
    const json = await res.json();
    const list = json.content ?? [];
    if (list.length === 0) break;
    for (const j of list) {
      all.push({
        id: String(j.id),
        title: j.name,
        location: [j.location?.city, j.location?.country].filter(Boolean).join(', ') || null,
        department: j.department?.label ?? null,
        updated_at: j.releasedDate ?? j.updatedOn ?? null,
        url: j.ref ?? null,
      });
    }
    if (list.length < limit) break;
    offset += limit;
  }
  return all;
}

async function fetchOne(company) {
  switch (company.ats) {
    case 'greenhouse':       return fetchGreenhouse(company.atsIdentifier);
    case 'lever':            return fetchLever(company.atsIdentifier);
    case 'workday':          return fetchWorkday(company.workday);
    case 'ashby':            return fetchAshby(company.atsIdentifier);
    case 'smartrecruiters':  return fetchSmartRecruiters(company.atsIdentifier);
    case 'custom':           throw new Error(`custom adapter not implemented (${company.slug}): ${company.customNote ?? 'no note'}`);
    default: throw new Error(`unknown ats: ${company.ats}`);
  }
}

// ---------- snapshot I/O ----------

async function loadCompanies(filterSlug) {
  const files = (await readdir(COMPANIES_DIR)).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    const c = JSON.parse(await readFile(path.join(COMPANIES_DIR, f), 'utf8'));
    if (!filterSlug || c.slug === filterSlug) out.push(c);
  }
  return out;
}

async function loadPreviousSnapshot(slug) {
  const dir = path.join(SNAPSHOTS_DIR, slug);
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (files.length === 0) return null;
  const newest = files[files.length - 1];
  return JSON.parse(await readFile(path.join(dir, newest), 'utf8'));
}

function diffJobs(prevJobs, currJobs) {
  const prevById = new Map((prevJobs ?? []).map((j) => [j.id, j]));
  const currById = new Map(currJobs.map((j) => [j.id, j]));
  const added = [];
  const removed = [];
  for (const [id, j] of currById) if (!prevById.has(id)) added.push(j);
  for (const [id, j] of prevById) if (!currById.has(id)) removed.push(j);
  return { added, removed };
}

// concurrency-limited parallel runner
async function runWithConcurrency(items, n, worker) {
  const queue = items.slice();
  const out = [];
  const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      out.push(await worker(item));
    }
  });
  await Promise.all(workers);
  return out;
}

// ---------- main ----------

async function main() {
  const args = process.argv.slice(2);
  let filter = null;
  let concurrency = 4;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--concurrency') { concurrency = parseInt(args[++i], 10) || 4; }
    else if (!args[i].startsWith('--')) { filter = args[i]; }
  }

  const companies = await loadCompanies(filter);
  if (companies.length === 0) {
    console.error('No companies matched.');
    process.exit(1);
  }
  await mkdir(SNAPSHOTS_DIR, { recursive: true });
  const date = today();

  const summary = await runWithConcurrency(companies, concurrency, async (c) => {
    if (c.ats === 'custom') {
      console.log(`[${c.slug}] SKIP (custom: ${c.customNote ?? 'no fetcher'})`);
      return { slug: c.slug, skipped: true, note: c.customNote };
    }
    try {
      const jobs = await fetchOne(c);
      const prev = await loadPreviousSnapshot(c.slug);
      const diff = diffJobs(prev?.jobs, jobs);
      const snapshot = {
        company: c.slug,
        ats: c.ats,
        atsIdentifier: c.atsIdentifier ?? null,
        fetchedAt: new Date().toISOString(),
        count: jobs.length,
        jobs,
      };
      const dir = path.join(SNAPSHOTS_DIR, c.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${date}.json`), JSON.stringify(snapshot, null, 2));
      console.log(`[${c.slug}] ${jobs.length} jobs (+${diff.added.length} / -${diff.removed.length})`);
      return { slug: c.slug, count: jobs.length, added: diff.added.length, removed: diff.removed.length };
    } catch (err) {
      console.log(`[${c.slug}] FAILED: ${err.message}`);
      return { slug: c.slug, error: err.message };
    }
  });

  console.log('\n--- summary ---');
  for (const s of summary.sort((a, b) => a.slug.localeCompare(b.slug))) {
    if (s.skipped) console.log(`  ${s.slug}: SKIP (${s.note ?? '—'})`);
    else if (s.error) console.log(`  ${s.slug}: ERROR — ${s.error}`);
    else console.log(`  ${s.slug}: ${s.count} jobs (+${s.added} / -${s.removed})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
