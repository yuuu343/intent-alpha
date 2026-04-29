#!/usr/bin/env node
// scripts/diffusion-velocity.mjs <entity>
//
// For each topic cluster, computes the time gap between (a) the median
// arXiv publication date for papers matching the topic, and (b) the
// median job-posting `updated_at` date for jobs matching the topic.
//
// A positive lag (jobs after papers) is the typical "research → hiring"
// direction. A negative lag (jobs before papers) suggests the company
// was hiring before the public literature surfaced — a more interesting
// signal in the other direction.
//
// Single-snapshot caveat: with only one fetch per source, the lag is a
// rough centroid comparison rather than a per-posting time-to-hire trace.
// Multi-snapshot tracking will sharpen this once data accrues.
//
// Output: data/diffusion/<entity>/<YYYY-MM-DD>.json

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const today = () => new Date().toISOString().slice(0, 10);

// Same topic regexes as cross-reference.mjs so the two views align row-for-row.
const TOPICS = {
  post_training:     /(post[- ]?training|preference modeling|\brlhf\b|\brlaif\b|\bdpo\b|\bgrpo\b|\bsft\b|\bppo\b)/i,
  pre_training:      /(pre[- ]?training|foundation model|scaling law)/i,
  interpretability:  /(interpretab|mech(?:anistic)? interp|circuit analysis|sparse autoencoder|\bsae\b|representation engineering)/i,
  alignment_safety:  /(alignment|safeguard|constitutional ai|harm reduction|red[- ]?team|trust and safety)/i,
  agents:            /(\bagent\b|agentic|tool use|orchestration|autonomous workflow|computer use)/i,
  inference_serving: /(inference|model serving|tensorrt|\btrt-?llm\b|ray serve|\bvllm\b|serving infrastructure)/i,
  multimodal:        /(multimodal|vision-?language|\bvlm\b|audio model|video model|speech model|image model)/i,
  evaluation:        /(\beval(?:uation)?\b|benchmark|model assessment)/i,
  compute_infra:     /(datacenter|colocation|\bgpu cluster\b|infiniband|nvlink|capex|capacity planning)/i,
  data_quality:      /(data quality|data curation|dataset construction|filtering pipeline)/i,
  security_eng:      /(security engineer|security research|threat model|incident response|vulnerab)/i,
  applied_fde:       /(forward[- ]deployed|applied (?:ai|engineer|ml)|deployment engineer|customer engineer)/i,
};

async function loadLatest(dir) {
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) return null;
  const file = path.join(dir, files[files.length - 1]);
  return { file, data: JSON.parse(await readFile(file, 'utf8')) };
}

function parseDates(items, getDate) {
  return items.map(getDate).filter((d) => d).map((d) => Date.parse(d)).filter(Number.isFinite);
}

function medianTs(ts) {
  if (ts.length === 0) return null;
  const sorted = [...ts].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function meanTs(ts) {
  if (ts.length === 0) return null;
  return ts.reduce((a, b) => a + b, 0) / ts.length;
}

const fmtDate = (ts) => ts === null ? null : new Date(ts).toISOString().slice(0, 10);
const daysBetween = (a, b) => (a === null || b === null) ? null : Math.round((b - a) / (24 * 60 * 60 * 1000));

async function main() {
  const entity = process.argv[2];
  if (!entity) { console.error('usage: node scripts/diffusion-velocity.mjs <entity>'); process.exit(1); }

  const jobs = await loadLatest(path.join(ROOT, 'data', 'snapshots', entity));
  const arxiv = await loadLatest(path.join(ROOT, 'data', 'arxiv', entity));
  if (!jobs || !arxiv) { console.error(`need both jobs and arxiv data for ${entity}`); process.exit(1); }

  const rows = [];
  for (const [topic, re] of Object.entries(TOPICS)) {
    const jobMatches = (jobs.data.jobs ?? []).filter((j) => re.test(j.title || ''));
    const arxivMatches = (arxiv.data.papers ?? []).filter((p) => re.test(`${p.title} ${p.summary || ''}`));

    const jobTs = parseDates(jobMatches, (j) => j.updated_at);
    const arxivTs = parseDates(arxivMatches, (p) => p.published);

    const jobMedian = medianTs(jobTs);
    const arxivMedian = medianTs(arxivTs);
    const jobMean = meanTs(jobTs);
    const arxivMean = meanTs(arxivTs);

    const lagMedian = daysBetween(arxivMedian, jobMedian);
    const lagMean = daysBetween(arxivMean, jobMean);

    rows.push({
      topic,
      jobCount: jobMatches.length,
      arxivCount: arxivMatches.length,
      jobMedian: fmtDate(jobMedian),
      arxivMedian: fmtDate(arxivMedian),
      jobMean: fmtDate(jobMean),
      arxivMean: fmtDate(arxivMean),
      lagDaysMedian: lagMedian,
      lagDaysMean: lagMean,
    });
  }

  const out = {
    entity,
    computedAt: new Date().toISOString(),
    sources: {
      jobs: path.relative(ROOT, jobs.file),
      arxiv: path.relative(ROOT, arxiv.file),
    },
    note: "Positive lag = jobs appear after papers (typical 'research → hiring' direction). Negative = jobs predate papers (company hired ahead of literature). Single-snapshot computation: each datum's date is the source's recorded timestamp (Greenhouse updated_at for jobs, arXiv published for papers); centroid comparison rather than per-posting trace.",
    rows,
  };

  const dir = path.join(ROOT, 'data', 'diffusion', entity);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));

  console.log(`\n=== ${entity} diffusion velocity (${jobs.data.jobs?.length ?? 0} jobs, ${arxiv.data.papers?.length ?? 0} papers) ===\n`);
  console.log('topic'.padEnd(20) + 'jobs'.padStart(5) + 'arxiv'.padStart(7) + ' jobMed     arxMed    lag(med)');
  console.log('-'.repeat(66));
  for (const r of rows) {
    const lagStr = r.lagDaysMedian === null ? '-' : `${r.lagDaysMedian >= 0 ? '+' : ''}${r.lagDaysMedian}d`;
    console.log(
      r.topic.padEnd(20) +
      String(r.jobCount).padStart(5) +
      String(r.arxivCount).padStart(7) + ' ' +
      String(r.jobMedian ?? '-').padEnd(11) +
      String(r.arxivMedian ?? '-').padEnd(11) +
      lagStr.padStart(8)
    );
  }
  console.log(`\nwrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
