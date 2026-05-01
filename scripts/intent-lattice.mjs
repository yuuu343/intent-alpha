#!/usr/bin/env node
// scripts/intent-lattice.mjs <lab>
//
// Computes the intent–alpha lattice data for one frontier lab:
// for each of the 12 topics, count (a) research/engineering jobs that mention
// the topic — the "Do" axis — and (b) papers in the lab's per-entity arxiv
// snapshot that mention the topic — the "Say" axis.
//
// Mapping is the validated regex set from _topics.mjs (per-source — TOPICS for
// jobs, TOPICS_ARXIV for arxiv where keyword overload required tightening).
// Job pool is filtered through isResearchRole (drops legal/sales/customer-success
// roles whose titles incidentally match topic keywords).
//
// Writes data/intent-lattice/<lab>/<YYYY-MM-DD>.json with shape sufficient for
// the Astro Lattice component to render without further processing.

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { topicRegex, projectText, topicNames, isResearchRole } from './_topics.mjs';

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

async function main() {
  const lab = process.argv[2];
  if (!lab) {
    console.error('usage: node scripts/intent-lattice.mjs <lab>');
    process.exit(1);
  }

  const jobsRaw  = await loadLatest(path.join(ROOT, 'data', 'snapshots', lab));
  const arxivRaw = await loadLatest(path.join(ROOT, 'data', 'arxiv', lab));
  if (!jobsRaw) {
    console.error(`no jobs data for ${lab}`);
    process.exit(1);
  }

  const allJobs   = jobsRaw.data.jobs   ?? [];
  const allPapers = arxivRaw ? (arxivRaw.data.papers ?? []) : [];

  // Pool of research/engineering jobs (drops sales/legal/support).
  const researchJobs = allJobs.filter((j) => isResearchRole(j.title, j.department));

  const topics = topicNames().map((topic) => {
    const jobsRe   = topicRegex(topic, 'jobs');
    const arxivRe  = topicRegex(topic, 'arxiv');
    const matchedJobs   = researchJobs.filter((j) => jobsRe.test(projectText(j, 'jobs')));
    const matchedPapers = allPapers.filter((p) => arxivRe.test(projectText(p, 'arxiv')));
    return {
      topic,
      jobs: matchedJobs.length,
      arxiv: matchedPapers.length,
      // Sample titles for hover detail — first 3 of each.
      sampleJobs:   matchedJobs.slice(0, 3).map((j) => ({ title: j.title, url: j.url, department: j.department ?? null })),
      sampleArxiv:  matchedPapers.slice(0, 3).map((p) => ({ title: p.title, url: p.url, published: p.published })),
    };
  });

  // Quadrant assignment uses median of non-zero values to set thresholds.
  // Topics with zero on either axis go to Q3 (dead end) by definition.
  const jobsValues  = topics.map((t) => t.jobs).filter((v) => v > 0).sort((a, b) => a - b);
  const arxivValues = topics.map((t) => t.arxiv).filter((v) => v > 0).sort((a, b) => a - b);
  const median = (arr) => arr.length === 0 ? 0 : arr[Math.floor(arr.length / 2)];
  const jobsThreshold  = median(jobsValues);
  const arxivThreshold = median(arxivValues);

  for (const t of topics) {
    const highDo  = t.jobs  >  jobsThreshold;
    const highSay = t.arxiv >  arxivThreshold;
    if      (highSay && highDo)   t.quadrant = 'Q1'; // The Core
    else if (highSay && !highDo)  t.quadrant = 'Q2'; // The Decoy
    else if (!highSay && highDo)  t.quadrant = 'Q4'; // Hiring leads publishing
    else                          t.quadrant = 'Q3'; // Dead Ends / off-field
  }

  const out = {
    lab,
    computedAt: new Date().toISOString(),
    sources: {
      jobs:  path.relative(ROOT, jobsRaw.file),
      arxiv: arxivRaw ? path.relative(ROOT, arxivRaw.file) : null,
    },
    totals: {
      jobs: allJobs.length,
      researchJobs: researchJobs.length,
      arxiv: allPapers.length,
    },
    thresholds: { jobs: jobsThreshold, arxiv: arxivThreshold },
    topics,
  };

  const dir = path.join(ROOT, 'data', 'intent-lattice', lab);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));

  // Summary table to console.
  console.log(`\n=== ${lab} intent–alpha lattice (research jobs ${researchJobs.length}/${allJobs.length} · papers ${allPapers.length}) ===\n`);
  console.log('topic'.padEnd(22) + 'jobs'.padStart(6) + 'arxiv'.padStart(8) + '  quad');
  console.log('-'.repeat(44));
  for (const t of topics) {
    console.log(
      t.topic.padEnd(22) +
      String(t.jobs).padStart(6) +
      String(t.arxiv).padStart(8) +
      `  ${t.quadrant}`
    );
  }
  console.log(`\nthresholds: jobs > ${jobsThreshold}, arxiv > ${arxivThreshold}`);
  console.log(`wrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
