#!/usr/bin/env node
// scripts/vocab-shift.mjs <slug> [--top N]
//
// For one company's snapshot history, computes:
//   - top n-grams per snapshot (titles only — snapshots don't carry full JD)
//   - bigram shifts: terms whose count moved significantly between snapshots
//
// This is one of the two signature metrics: the goal is to surface vocabulary
// drift like "RLHF" → "post-training" → "preference modeling" before it
// shows up in headcount totals.
//
// Output: data/vocab-shift/<slug>/<YYYY-MM-DD>.json

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SNAPSHOTS = path.join(ROOT, 'data', 'snapshots');
const today = () => new Date().toISOString().slice(0, 10);

const STOPWORDS = new Set([
  'and','or','of','for','in','on','to','the','a','an','at','by','with','as','from',
  'is','are','be','it','this','that','&','/','-','—','vs','via','per','our',
  'engineer','manager','senior','staff','principal','sr','jr','lead','head',
  'director','vp','intern','contractor','full','time','part','remote','onsite',
]);

function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t && !STOPWORDS.has(t) && t.length > 1);
}

function ngrams(tokens, n) {
  const out = [];
  for (let i = 0; i + n <= tokens.length; i++) out.push(tokens.slice(i, i + n).join(' '));
  return out;
}

function counts(jobs, n) {
  const c = {};
  for (const j of jobs) {
    for (const g of ngrams(tokenize(j.title || ''), n)) c[g] = (c[g] || 0) + 1;
  }
  return c;
}

function topEntries(map, k) {
  return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, k);
}

async function loadSnapshots(slug) {
  const dir = path.join(SNAPSHOTS, slug);
  if (!existsSync(dir)) throw new Error(`no snapshots for "${slug}"`);
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
    out.push({ date: f.replace('.json', ''), data });
  }
  return out;
}

function diffCounts(before, after) {
  const all = new Set([...Object.keys(before), ...Object.keys(after)]);
  const shifts = [];
  for (const term of all) {
    const b = before[term] || 0;
    const a = after[term] || 0;
    if (b === 0 && a < 3) continue;
    if (a === 0 && b < 3) continue;
    shifts.push({ term, before: b, after: a, delta: a - b });
  }
  shifts.sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta));
  return shifts;
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('usage: node scripts/vocab-shift.mjs <slug> [--top N]');
    process.exit(1);
  }
  let top = 30;
  for (let i = 3; i < process.argv.length; i++) {
    if (process.argv[i] === '--top') top = parseInt(process.argv[++i], 10) || top;
  }

  const snaps = await loadSnapshots(slug);
  if (snaps.length === 0) { console.error('no snapshots'); process.exit(1); }

  const windows = snaps.map((s) => {
    const c2 = counts(s.data.jobs ?? [], 2);
    const c1 = counts(s.data.jobs ?? [], 1);
    return {
      date: s.date,
      total: (s.data.jobs ?? []).length,
      topUnigrams: topEntries(c1, top),
      topBigrams:  topEntries(c2, top),
    };
  });

  const shifts = [];
  for (let i = 1; i < snaps.length; i++) {
    const before = counts(snaps[i - 1].data.jobs ?? [], 2);
    const after  = counts(snaps[i].data.jobs ?? [], 2);
    shifts.push({
      from: snaps[i - 1].date,
      to:   snaps[i].date,
      bigramShifts: diffCounts(before, after).slice(0, top),
    });
  }

  const out = {
    slug,
    computedAt: new Date().toISOString(),
    snapshotCount: snaps.length,
    windows,
    shifts,
  };

  const dir = path.join(ROOT, 'data', 'vocab-shift', slug);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));

  console.log(`\n=== ${slug} vocab (${snaps.length} snapshot${snaps.length === 1 ? '' : 's'}) ===\n`);
  for (const w of windows) {
    console.log(`-- ${w.date} (${w.total} jobs) — top bigrams:`);
    for (const [b, c] of w.topBigrams.slice(0, 12)) console.log(`     ${String(c).padStart(4)}  ${b}`);
  }
  if (shifts.length === 0) {
    console.log('\n(no historical shifts — only one snapshot. Re-run after the next fetch cycle.)');
  } else {
    for (const s of shifts) {
      console.log(`\n-- shift ${s.from} → ${s.to} (top by |Δ|):`);
      for (const sh of s.bigramShifts.slice(0, 12)) {
        const sign = sh.delta >= 0 ? '+' : '';
        console.log(`     ${sign}${sh.delta}`.padStart(6) + `  ${sh.term}  (${sh.before} → ${sh.after})`);
      }
    }
  }
  console.log(`\nwrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
