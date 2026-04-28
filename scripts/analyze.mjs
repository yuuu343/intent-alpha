#!/usr/bin/env node
// scripts/analyze.mjs <slug> [--regex term1,term2,...]
//
// Reads the latest snapshot for one company and prints, in order:
//   1. department breakdown (top 15)
//   2. predefined-cluster counts (AI/ML, silicon, security, GTM, ...)
//   3. title trigrams that occur ≥3 times (raw signal candidates)
//   4. optional --regex grouping with sample IDs
//
// Designed as the first step of a hypothesis cycle: replaces the ad-hoc
// `node -e ...` invocations the orchestrator was doing manually.
//
// Usage:
//   node scripts/analyze.mjs nvidia
//   node scripts/analyze.mjs anthropic --regex compute,datacenter,colocation

import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SNAPSHOTS = path.join(ROOT, 'data', 'snapshots');

const STOPWORDS = new Set([
  'and','or','of','for','in','on','to','the','a','an','at','by','with','as','from',
  'is','are','be','it','this','that','&','/','-','—','vs','via','per','our',
  'engineer','manager','senior','staff','principal','sr','jr','lead','head',
]);

// Default cluster catalogue. Each entry maps a label to a regex applied
// against the job `title` field. Keep regexes specific enough that signal/noise
// is meaningful — broad terms (e.g., bare "engineer") would dominate every cluster.
const DEFAULT_CLUSTERS = {
  ai_ml:        /(machine learning|ml engineer|deep learning|\bllm\b|generative|genai|ai (?:platform|infra|engineer|research|safety|reliability))/i,
  agents:       /(agent|agentic|orchestration|tool use|reasoning model)/i,
  inference:    /(inference|model serving|tensorrt|\btrt\b|triton|ray serve)/i,
  training:     /(training|fine.?tune|pretraining|foundation model|distillation|rlhf|reinforcement learning)/i,
  silicon:      /(\basic\b|silicon|chip design|verification engineer|physical design|\brtl\b|risc-?v|fpga|hardware engineer|hardware design)/i,
  datacenter:   /(datacenter|data centre|colocation|capex|capacity planning|power and cooling|fabric|infiniband|nvlink|switch fabric)/i,
  cloud_infra:  /(infrastructure|\bsre\b|reliability engineer|kubernetes|cloud platform|capacity engineer|fleet)/i,
  security:     /(security|trust and safety|red.?team|incident response|threat|vulnerability|\bgrc\b|zero.?trust)/i,
  sales_gtm:    /(account executive|field sales|enterprise sales|business development|sales engineer|customer success|account manager|forward deployed)/i,
  legal:        /(counsel|legal|compliance|trade compliance|product counsel)/i,
  finance:      /(accounting|finance|audit|\btax\b|treasury|deal desk)/i,
  developer:    /(developer (?:advocate|relations|experience)|\bsdk\b|api product|community engineer)/i,
  robotics_av:  /(robot|isaac|humanoid|simulation engineer|autonomous|self.driv|automotive|adas)/i,
  multimodal:   /(audio|voice|speech|video|vision|multimodal|image|\b3d\b)/i,
  bio_health:   /(biology|life science|\bhealth\b|medical|clinical|drug discovery|biotech)/i,
};

async function loadLatest(slug) {
  const dir = path.join(SNAPSHOTS, slug);
  if (!existsSync(dir)) throw new Error(`no snapshot directory for "${slug}"`);
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) throw new Error(`no dated snapshots in ${dir}`);
  const file = path.join(dir, files[files.length - 1]);
  const j = JSON.parse(await readFile(file, 'utf8'));
  return { ...j, _file: files[files.length - 1] };
}

function topByKey(jobs, key, n = 15) {
  const counts = {};
  for (const j of jobs) {
    const v = (j[key] || '(none)').toString();
    counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function topTrigrams(jobs, n = 15) {
  const counts = {};
  for (const j of jobs) {
    const tokens = (j.title || '').toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t && !STOPWORDS.has(t));
    for (let i = 0; i + 2 < tokens.length; i++) {
      const tri = tokens.slice(i, i + 3).join(' ');
      counts[tri] = (counts[tri] || 0) + 1;
    }
  }
  return Object.entries(counts).filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1]).slice(0, n);
}

function clusterCounts(jobs, clusters) {
  const out = [];
  for (const [name, re] of Object.entries(clusters)) {
    const matched = jobs.filter((j) => re.test(j.title || ''));
    const sample = matched.slice(0, 4).map((m) => `${m.id}  ${m.title.slice(0, 65)}`);
    out.push([name, matched.length, sample]);
  }
  return out.sort((a, b) => b[1] - a[1]);
}

const fmt = (n, w = 4) => String(n).padStart(w);

async function main() {
  const args = process.argv.slice(2);
  if (!args.length) {
    console.error('usage: node scripts/analyze.mjs <slug> [--regex term1,term2,...]');
    process.exit(1);
  }
  const slug = args[0];
  const regexFlag = args.indexOf('--regex');
  const customTerms = regexFlag >= 0 ? (args[regexFlag + 1] || '').split(',').map((s) => s.trim()).filter(Boolean) : null;

  const snap = await loadLatest(slug);
  console.log(`\n=== ${slug} — snapshot ${snap._file} (${snap.count} jobs, ATS ${snap.ats}) ===\n`);

  console.log('--- top departments ---');
  for (const [d, c] of topByKey(snap.jobs, 'department', 15)) {
    console.log(`  ${fmt(c)}  ${d.length > 70 ? d.slice(0, 70) + '…' : d}`);
  }

  console.log('\n--- cluster counts ---');
  for (const [name, c, ex] of clusterCounts(snap.jobs, DEFAULT_CLUSTERS)) {
    console.log(`  ${fmt(c)}  ${name}`);
    if (c > 0 && c <= 6) for (const e of ex) console.log(`        ${e}`);
  }

  console.log('\n--- top trigrams (≥3 occurrences) ---');
  for (const [t, c] of topTrigrams(snap.jobs, 20)) {
    console.log(`  ${fmt(c)}  ${t}`);
  }

  if (customTerms && customTerms.length) {
    const re = new RegExp('(' + customTerms.join('|') + ')', 'i');
    const matched = snap.jobs.filter((j) => re.test(j.title || ''));
    console.log(`\n--- custom regex (${customTerms.join(', ')}) → ${matched.length} matches ---`);
    for (const m of matched.slice(0, 12)) {
      console.log(`  ${m.id}  ${m.title.slice(0, 80)}`);
    }
  }

  console.log();
}

main().catch((e) => { console.error(e); process.exit(1); });
