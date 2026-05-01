#!/usr/bin/env node
// scripts/cross-reference.mjs <entity>
//
// Joins three primary sources for a given entity into one topic table:
//   - jobs:   data/snapshots/<slug>/<latest>.json
//   - arxiv:  data/arxiv/<entity>/<latest>.json
//   - github: data/github/<org>/<latest>.json    (org tried as <entity> then <entity>s)
//
// For each curated topic regex, counts hits across the three sources.
// This is the editorial backbone for the deep-dispatch piece — the layer
// where "hiring up + papers up + commits up" co-incidence becomes visible.
//
// Output: data/cross-ref/<entity>/<YYYY-MM-DD>.json

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TOPICS } from './_topics.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const today = () => new Date().toISOString().slice(0, 10);

async function loadLatest(dir) {
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) return null;
  const file = path.join(dir, files[files.length - 1]);
  return { file, data: JSON.parse(await readFile(file, 'utf8')) };
}

function countMatches(items, getText) {
  const out = {};
  for (const label of Object.keys(TOPICS)) out[label] = 0;
  for (const it of items) {
    const text = getText(it);
    if (!text) continue;
    for (const [label, re] of Object.entries(TOPICS)) {
      if (re.test(text)) out[label]++;
    }
  }
  return out;
}

async function main() {
  const entity = process.argv[2];
  if (!entity) {
    console.error('usage: node scripts/cross-reference.mjs <entity>');
    process.exit(1);
  }

  const jobs  = await loadLatest(path.join(ROOT, 'data', 'snapshots', entity));
  const arxiv = await loadLatest(path.join(ROOT, 'data', 'arxiv', entity));
  const gh    = (await loadLatest(path.join(ROOT, 'data', 'github', entity)))
              ?? (await loadLatest(path.join(ROOT, 'data', 'github', `${entity}s`)));
  const ghDeps = (await loadLatest(path.join(ROOT, 'data', 'github-dependents', entity)))
              ?? (await loadLatest(path.join(ROOT, 'data', 'github-dependents', `${entity}s`)));

  if (!jobs && !arxiv && !gh) {
    console.error(`no source data for ${entity} — run fetch-jobs / fetch-arxiv / fetch-github first`);
    process.exit(1);
  }

  const jobMatches   = jobs  ? countMatches(jobs.data.jobs ?? [],     (j) => j.title) : null;
  const arxivMatches = arxiv ? countMatches(arxiv.data.papers ?? [], (p) => `${p.title} ${p.summary}`) : null;
  const ghMatches    = gh    ? countMatches(gh.data.repos ?? [],     (r) => `${r.name} ${r.description ?? ''} ${(r.recentCommits ?? []).map((c) => c.message).join(' ')}`) : null;

  // Adoption-weighted GitHub: dependents (Repositories + Packages) carry 0.8,
  // stars 0.2. Repos with no dependents data fall back to stars-only weight,
  // so the metric degrades gracefully when github-dependents hasn't been run.
  const depByRepo = new Map();
  if (ghDeps) {
    for (const r of (ghDeps.data.rows ?? [])) {
      const reps = typeof r.repositories === 'number' ? r.repositories : 0;
      const pkgs = typeof r.packages === 'number' ? r.packages : 0;
      depByRepo.set(r.repo, reps + pkgs);
    }
  }
  let ghAdoption = null;
  if (gh) {
    ghAdoption = {};
    for (const label of Object.keys(TOPICS)) ghAdoption[label] = 0;
    for (const r of (gh.data.repos ?? [])) {
      const text = `${r.name} ${r.description ?? ''} ${(r.recentCommits ?? []).map((c) => c.message).join(' ')}`;
      const stars = r.stars ?? 0;
      const deps = depByRepo.get(r.name) ?? 0;
      const weight = stars * 0.2 + deps * 0.8;
      for (const [label, re] of Object.entries(TOPICS)) {
        if (re.test(text)) ghAdoption[label] += weight;
      }
    }
    // Round for readability
    for (const k of Object.keys(ghAdoption)) ghAdoption[k] = Math.round(ghAdoption[k]);
  }

  const rows = Object.keys(TOPICS).map((label) => ({
    topic: label,
    jobs:        jobMatches   ? jobMatches[label]   : null,
    arxiv:       arxivMatches ? arxivMatches[label] : null,
    github:      ghMatches    ? ghMatches[label]    : null,
    githubAdopt: ghAdoption   ? ghAdoption[label]   : null,
  }));

  const out = {
    entity,
    computedAt: new Date().toISOString(),
    sources: {
      jobs:   jobs   ? path.relative(ROOT, jobs.file)   : null,
      arxiv:  arxiv  ? path.relative(ROOT, arxiv.file)  : null,
      github: gh     ? path.relative(ROOT, gh.file)     : null,
    },
    totals: {
      jobs:   jobs  ? (jobs.data.jobs ?? []).length    : 0,
      arxiv:  arxiv ? (arxiv.data.papers ?? []).length : 0,
      github: gh    ? (gh.data.repos ?? []).length     : 0,
    },
    topics: rows,
  };

  const dir = path.join(ROOT, 'data', 'cross-ref', entity);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));

  console.log(`\n=== ${entity} cross-reference (${out.totals.jobs} jobs, ${out.totals.arxiv} papers, ${out.totals.github} repos${ghDeps ? ', adoption-weighted' : ''}) ===\n`);
  console.log('topic'.padEnd(22) + 'jobs'.padStart(6) + 'arxiv'.padStart(8) + 'github'.padStart(8) + 'adopt'.padStart(8));
  console.log('-'.repeat(52));
  for (const r of rows) {
    console.log(
      r.topic.padEnd(22) +
      String(r.jobs ?? '-').padStart(6) +
      String(r.arxiv ?? '-').padStart(8) +
      String(r.github ?? '-').padStart(8) +
      String(r.githubAdopt ?? '-').padStart(8)
    );
  }
  console.log(`\nwrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
