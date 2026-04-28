#!/usr/bin/env node
// Fetches job postings from each company's public ATS endpoint
// and writes a dated snapshot. Computes a diff vs the most recent
// prior snapshot and prints a summary.
//
// Usage:
//   node scripts/fetch-jobs.mjs               # fetch all companies
//   node scripts/fetch-jobs.mjs anthropic     # fetch one company by slug
//
// Output:
//   data/snapshots/<slug>/<YYYY-MM-DD>.json
//   data/snapshots/<slug>/_latest.json   (symlink-equivalent: copy of newest)

import { readdir, readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const COMPANIES_DIR = path.join(ROOT, 'src', 'data', 'companies');
const SNAPSHOTS_DIR = path.join(ROOT, 'data', 'snapshots');

const today = () => new Date().toISOString().slice(0, 10);

const UA = 'IntentAlphaBot/0.1 (+https://intent-alpha.pages.dev; respectful-fetch)';

async function loadCompanies(filterSlug) {
  const files = (await readdir(COMPANIES_DIR)).filter((f) => f.endsWith('.json'));
  const out = [];
  for (const f of files) {
    const c = JSON.parse(await readFile(path.join(COMPANIES_DIR, f), 'utf8'));
    if (!filterSlug || c.slug === filterSlug) out.push(c);
  }
  return out;
}

async function fetchGreenhouse(token) {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(token)}/jobs?content=true`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error(`greenhouse ${token}: HTTP ${res.status}`);
  const json = await res.json();
  return (json.jobs ?? []).map((j) => ({
    id: String(j.id),
    title: j.title,
    location: j.location?.name ?? null,
    department: (j.departments ?? []).map((d) => d.name).join(' / ') || null,
    updated_at: j.updated_at ?? null,
    url: j.absolute_url ?? null,
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
  }));
}

async function fetchOne(company) {
  switch (company.ats) {
    case 'greenhouse': return fetchGreenhouse(company.atsIdentifier);
    case 'lever': return fetchLever(company.atsIdentifier);
    case 'workday': throw new Error(`workday adapter not implemented (company: ${company.slug})`);
    default: throw new Error(`unknown ats: ${company.ats}`);
  }
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

async function main() {
  const filter = process.argv[2];
  const companies = await loadCompanies(filter);
  if (companies.length === 0) {
    console.error('No companies matched.');
    process.exit(1);
  }

  await mkdir(SNAPSHOTS_DIR, { recursive: true });
  const date = today();
  const summary = [];

  for (const c of companies) {
    process.stdout.write(`[${c.slug}] fetching ${c.ats}/${c.atsIdentifier} ... `);
    try {
      const jobs = await fetchOne(c);
      const prev = await loadPreviousSnapshot(c.slug);
      const diff = diffJobs(prev?.jobs, jobs);
      const snapshot = {
        company: c.slug,
        ats: c.ats,
        atsIdentifier: c.atsIdentifier,
        fetchedAt: new Date().toISOString(),
        count: jobs.length,
        jobs,
      };
      const dir = path.join(SNAPSHOTS_DIR, c.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, `${date}.json`), JSON.stringify(snapshot, null, 2));
      console.log(`${jobs.length} jobs (+${diff.added.length} / -${diff.removed.length})`);
      summary.push({ slug: c.slug, count: jobs.length, added: diff.added.length, removed: diff.removed.length });
    } catch (err) {
      console.log(`FAILED: ${err.message}`);
      summary.push({ slug: c.slug, error: err.message });
    }
  }

  console.log('\n--- summary ---');
  for (const s of summary) {
    if (s.error) console.log(`  ${s.slug}: ERROR — ${s.error}`);
    else console.log(`  ${s.slug}: ${s.count} jobs (+${s.added} / -${s.removed})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
