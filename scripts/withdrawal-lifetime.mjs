#!/usr/bin/env node
// scripts/withdrawal-lifetime.mjs <slug>
//
// FRAMEWORK ONLY — signature metric scaffolded ahead of multi-snapshot data.
//
// For each posting that appears in an earlier snapshot but disappears in a
// later one, computes its observed lifetime in days. A short lifetime (<14d)
// suggests strategic correction (the role was withdrawn, not filled); a long
// lifetime (>120d) suggests a hiring backlog. The distribution of lifetimes
// is itself a signal of how decisively a company prunes its hiring plan.
//
// With one snapshot the framework just emits the file structure and reports
// readiness; subsequent fetch cycles automatically populate it.
//
// Output: data/withdrawal/<slug>/<YYYY-MM-DD>.json

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const SNAPSHOTS = path.join(ROOT, 'data', 'snapshots');
const today = () => new Date().toISOString().slice(0, 10);

async function loadSnapshots(slug) {
  const dir = path.join(SNAPSHOTS, slug);
  if (!existsSync(dir)) throw new Error(`no snapshots for "${slug}"`);
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  const out = [];
  for (const f of files) {
    const data = JSON.parse(await readFile(path.join(dir, f), 'utf8'));
    out.push({ date: f.replace('.json', ''), jobs: data.jobs ?? [] });
  }
  return out;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(b) - Date.parse(a)) / (24 * 60 * 60 * 1000));
}

function computeLifetimes(snaps) {
  const firstSeen = new Map();
  const lastSeen  = new Map();
  const titleOf   = new Map();
  for (const s of snaps) {
    for (const j of s.jobs) {
      if (!firstSeen.has(j.id)) firstSeen.set(j.id, s.date);
      lastSeen.set(j.id, s.date);
      titleOf.set(j.id, j.title);
    }
  }
  const latest = snaps[snaps.length - 1].date;
  const withdrawn = [];
  const stillOpen = [];
  for (const [id, last] of lastSeen) {
    const first = firstSeen.get(id);
    const lifetime = daysBetween(first, last);
    const entry = { id, title: titleOf.get(id), firstSeen: first, lastSeen: last, lifetimeDays: lifetime };
    if (last !== latest) withdrawn.push(entry);
    else stillOpen.push(entry);
  }
  withdrawn.sort((a, b) => a.lifetimeDays - b.lifetimeDays);
  return { withdrawn, stillOpen };
}

function bucket(days) {
  if (days <= 14)  return '0–14d (likely withdrawn)';
  if (days <= 60)  return '15–60d';
  if (days <= 120) return '61–120d';
  return '120+d (backlog)';
}

// 5–95 percentile trim to suppress mis-posts (1-day) and permanent
// always-open boilerplate (year+) from inflating the centroid statistics.
function trimmedStats(values) {
  if (values.length === 0) return { count: 0, mean: 0, median: 0, kept: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const lo = sorted[Math.floor(sorted.length * 0.05)];
  const hi = sorted[Math.floor(sorted.length * 0.95)];
  const kept = sorted.filter((v) => v >= lo && v <= hi);
  if (kept.length === 0) return { count: values.length, mean: 0, median: 0, kept: 0 };
  const mean = kept.reduce((a, b) => a + b, 0) / kept.length;
  const median = kept[Math.floor(kept.length / 2)];
  return { count: values.length, mean: Math.round(mean), median, kept: kept.length, lo, hi };
}

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error('usage: node scripts/withdrawal-lifetime.mjs <slug>');
    process.exit(1);
  }

  const snaps = await loadSnapshots(slug);

  let withdrawn = [];
  let stillOpen = [];
  if (snaps.length >= 2) {
    ({ withdrawn, stillOpen } = computeLifetimes(snaps));
  }

  const buckets = {};
  for (const w of withdrawn) {
    const b = bucket(w.lifetimeDays);
    buckets[b] = (buckets[b] || 0) + 1;
  }

  const trimmed = trimmedStats(withdrawn.map((w) => w.lifetimeDays));

  const out = {
    slug,
    computedAt: new Date().toISOString(),
    snapshotCount: snaps.length,
    snapshotDates: snaps.map((s) => s.date),
    framework: {
      description: "Each posting's observed lifetime is days from first-seen to last-seen across snapshots. Postings absent from the latest snapshot are counted as withdrawn. trimmed.* stats use a 5–95 percentile cut to suppress mis-posts (1-day) and permanent boilerplate (year+).",
      buckets: ['0–14d (likely withdrawn)', '15–60d', '61–120d', '120+d (backlog)'],
      readiness: snaps.length >= 2 ? 'live' : 'awaiting second snapshot',
    },
    withdrawn,
    stillOpen,
    summary: {
      withdrawnCount: withdrawn.length,
      stillOpenCount: stillOpen.length,
      bucketCounts: buckets,
      trimmed,
    },
  };

  const dir = path.join(ROOT, 'data', 'withdrawal', slug);
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, `${today()}.json`);
  await writeFile(file, JSON.stringify(out, null, 2));

  console.log(`\n=== ${slug} withdrawal-lifetime (${snaps.length} snapshot${snaps.length === 1 ? '' : 's'}) ===\n`);
  if (snaps.length < 2) {
    console.log('framework ready; data accrues as more snapshots land.');
  } else {
    console.log(`withdrawn: ${withdrawn.length}, still open: ${stillOpen.length}`);
    for (const [b, c] of Object.entries(buckets)) console.log(`  ${b.padEnd(28)} ${c}`);
  }
  console.log(`\nwrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
