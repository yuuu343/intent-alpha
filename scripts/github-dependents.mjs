#!/usr/bin/env node
// scripts/github-dependents.mjs <org> [--top N] [--repos repo1,repo2,...]
//
// Fetches the GitHub /network/dependents page for each repo and parses the
// "Repositories" and "Packages" counts from the tab labels. This is the
// embeddedness metric Gemini round-3 critique asked for: less vanity than
// star count, closer to actual third-party use.
//
// HTML scrape (GitHub does not expose dependents via REST or GraphQL).
// Counts are best-effort; format may shift, in which case the regex needs
// updating. Polite 2s delay between requests; no auth needed for public.
//
// Defaults to the org's top-N repos by stars from the most recent
// data/github/<org>/<date>.json snapshot.
//
// Output: data/github-dependents/<org>/<YYYY-MM-DD>.json

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const today = () => new Date().toISOString().slice(0, 10);
const UA = 'IntentAlphaBot/0.2 (+https://intent-alpha.hide3desudesu.workers.dev; respectful-fetch)';
const DELAY_MS = 2000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function loadLatestGhSnapshot(org) {
  const dir = path.join(ROOT, 'data', 'github', org);
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) return null;
  return JSON.parse(await readFile(path.join(dir, files[files.length - 1]), 'utf8'));
}

async function fetchDependentsPage(owner, repo) {
  const url = `https://github.com/${owner}/${repo}/network/dependents`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' } });
  if (!res.ok) return { url, error: `HTTP ${res.status}` };
  const html = await res.text();
  return { url, html };
}

function parseDependentCounts(html) {
  // GitHub renders dependent-type tabs like:
  //   <a href="...?dependent_type=REPOSITORY">Repositories <span class="Counter">12,345</span></a>
  // Both Counter spans appear in tab order: Repositories first, Packages second.
  // We extract counts by scoping near the dependent_type query parameter.
  const out = { repositories: null, packages: null };
  const repoMatch = html.match(/dependent_type=REPOSITORY[\s\S]{0,800}?<span[^>]*class="[^"]*Counter[^"]*"[^>]*>\s*([\d,]+)\s*<\/span>/);
  if (repoMatch) out.repositories = parseInt(repoMatch[1].replace(/,/g, ''), 10);
  const pkgMatch = html.match(/dependent_type=PACKAGE[\s\S]{0,800}?<span[^>]*class="[^"]*Counter[^"]*"[^>]*>\s*([\d,]+)\s*<\/span>/);
  if (pkgMatch) out.packages = parseInt(pkgMatch[1].replace(/,/g, ''), 10);
  // Fallback: first two Counter spans in document order.
  if (out.repositories === null && out.packages === null) {
    const counters = [];
    const cRe = /<span[^>]*Counter[^>]*>\s*([\d,]+)\s*<\/span>/g;
    let m;
    while ((m = cRe.exec(html)) && counters.length < 4) counters.push(parseInt(m[1].replace(/,/g, ''), 10));
    if (counters.length > 0) out.repositories = counters[0];
    if (counters.length > 1) out.packages = counters[1];
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) { console.error('usage: node scripts/github-dependents.mjs <org> [--top N] [--repos r1,r2,...]'); process.exit(1); }
  const org = args[0];
  let topN = 10;
  let explicitRepos = null;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--top') topN = parseInt(args[++i], 10) || topN;
    if (args[i] === '--repos') explicitRepos = (args[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
  }

  let repoNames;
  if (explicitRepos) {
    repoNames = explicitRepos;
  } else {
    const snap = await loadLatestGhSnapshot(org);
    if (!snap) { console.error(`no github snapshot for ${org} — run fetch-github.mjs first`); process.exit(1); }
    repoNames = (snap.repos ?? [])
      .slice()
      .sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0))
      .slice(0, topN)
      .map((r) => r.name);
  }

  console.log(`[gh-deps] org=${org} repos=${repoNames.length} (delay ${DELAY_MS}ms)`);

  const rows = [];
  for (let i = 0; i < repoNames.length; i++) {
    const repo = repoNames[i];
    if (i > 0) await sleep(DELAY_MS);
    const { url, html, error } = await fetchDependentsPage(org, repo);
    if (error) {
      console.log(`[gh-deps] ${repo}: ${error}`);
      rows.push({ repo, url, error });
      continue;
    }
    const counts = parseDependentCounts(html);
    rows.push({ repo, url, ...counts });
    console.log(`[gh-deps] ${repo}: repositories=${counts.repositories ?? '-'} packages=${counts.packages ?? '-'}`);
  }

  const out = {
    org,
    fetchedAt: new Date().toISOString(),
    note: "Counts are scraped from /network/dependents tab labels. Repositories and Packages tabs separately. Format may shift; see parseDependentCounts in this script for the regex.",
    rows,
  };

  const dir = path.join(ROOT, 'data', 'github-dependents', org);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));
  console.log(`\nwrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
