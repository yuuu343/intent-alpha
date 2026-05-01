#!/usr/bin/env node
// scripts/validate-mapping.mjs <action> [args]
//
// Measures precision of the 12-topic regex taxonomy used by cross-reference.mjs
// (and downstream by the Intent Lattice / Compute Shadow surface). The Matrix
// only means something if "matched as topic X" actually denotes topic X — this
// is the gate.
//
// Workflow:
//   1. sample → emits a markdown checklist of N matched items per (topic, source)
//   2. admin reads each item and checks the box if mapping is correct
//   3. score → reads back the markdown, prints precision per (topic, source),
//      exits 0 iff every cell with N >= MIN_N hits >= 70% precision
//
// Recall is not measured (would need negative annotation across the corpus).
// Sampling is "first N matches by source order" — adequate for spot-checking
// regex behavior, not for statistical confidence intervals.
//
// Usage:
//   node scripts/validate-mapping.mjs sample <entity> [--n 5] [--sources jobs,arxiv,github]
//   node scripts/validate-mapping.mjs score <validation-file.md>

import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { topicRegex, projectText, topicNames, isResearchRole } from './_topics.mjs';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const today = () => new Date().toISOString().slice(0, 10);

const PRECISION_GATE = 0.70;
const MIN_N_FOR_GATE = 3; // cells with fewer annotated items skip the gate (noted in report)

async function loadLatest(dir) {
  if (!existsSync(dir)) return null;
  const files = (await readdir(dir)).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
  if (!files.length) return null;
  const file = path.join(dir, files[files.length - 1]);
  return { file, data: JSON.parse(await readFile(file, 'utf8')) };
}

async function loadSources(entity) {
  const jobs  = await loadLatest(path.join(ROOT, 'data', 'snapshots', entity));
  const arxiv = await loadLatest(path.join(ROOT, 'data', 'arxiv', entity));
  const gh    = (await loadLatest(path.join(ROOT, 'data', 'github', entity)))
              ?? (await loadLatest(path.join(ROOT, 'data', 'github', `${entity}s`)));
  return {
    jobs:   jobs  ? { items: jobs.data.jobs   ?? [], file: jobs.file  } : null,
    arxiv:  arxiv ? { items: arxiv.data.papers ?? [], file: arxiv.file } : null,
    github: gh    ? { items: gh.data.repos    ?? [], file: gh.file    } : null,
  };
}

function shortLabel(item, source) {
  if (source === 'jobs') {
    const dept = item.department ? ` · ${item.department}` : '';
    return `${item.title}${dept}`;
  }
  if (source === 'arxiv')  return `${item.title}`;
  if (source === 'github') return `${item.name} — ${(item.description ?? '').slice(0, 80)}`;
  return '';
}

function shortContext(item, source) {
  if (source === 'jobs') {
    // Strip HTML, drop the "About Anthropic"-style intro that repeats across
    // every posting from the same company, then take a slice of the remainder.
    const stripped = (item.body ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
    const intro = /(About\s+(?:Anthropic|OpenAI|Cohere|Mistral|us|the (?:team|company|role))|Anthropic['’]s mission|Our mission)/i;
    let body = stripped;
    const m = intro.exec(body);
    if (m) {
      // Skip past intro paragraph (~first sentence after boilerplate marker)
      body = body.slice(m.index + 200);
    }
    return body.slice(0, 280);
  }
  if (source === 'arxiv') {
    return (item.summary ?? '').slice(0, 280).replace(/\s+/g, ' ');
  }
  if (source === 'github') {
    return (item.recentCommits ?? []).slice(0, 3).map((c) => c.message?.slice(0, 80)).filter(Boolean).join(' · ');
  }
  return '';
}

function itemUrl(item, source) {
  if (source === 'jobs')   return item.url ?? '';
  if (source === 'arxiv')  return item.url ?? '';
  if (source === 'github') return `https://github.com/${item.org ?? ''}/${item.name ?? ''}`;
  return '';
}

async function actionSample(args) {
  const entity = args[0];
  if (!entity) {
    console.error('usage: node scripts/validate-mapping.mjs sample <entity> [--n 5] [--sources jobs,arxiv,github]');
    process.exit(1);
  }
  let n = 5;
  let sources = ['jobs', 'arxiv', 'github'];
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--n') n = parseInt(args[++i], 10) || n;
    if (args[i] === '--sources') sources = args[++i].split(',').map((s) => s.trim());
  }

  const data = await loadSources(entity);
  const out = [];
  out.push(`# Mapping validation — ${entity} — ${today()}`);
  out.push('');
  out.push('Check the box if the matched item is genuinely about the named topic.');
  out.push('Leave unchecked if it is a false positive (regex matched on incidental wording).');
  out.push('Skip the cell entirely if it is ambiguous.');
  out.push('');
  out.push('Re-run `node scripts/validate-mapping.mjs score <this-file>` to get the precision report.');
  out.push('');

  for (const source of sources) {
    const src = data[source];
    if (!src) {
      out.push(`## ${source} — (no data)`);
      out.push('');
      continue;
    }
    out.push(`## ${source} — ${src.items.length} items`);
    out.push(`source: \`${path.relative(ROOT, src.file)}\``);
    out.push('');

    for (const topic of topicNames()) {
      const re = topicRegex(topic, source);
      // For jobs, apply the role filter (research/engineering substance) before
      // matching the topic regex — this is what the Matrix surface will count.
      // For arxiv / github, role filtering doesn't apply.
      const pool = source === 'jobs'
        ? src.items.filter((it) => isResearchRole(it.title, it.department))
        : src.items;
      const matched = pool.filter((it) => re.test(projectText(it, source)));
      const sample = matched.slice(0, n);
      out.push(`### ${source} · ${topic} — matched ${matched.length}, sampling first ${sample.length}`);
      if (sample.length === 0) {
        out.push('_(no matches)_');
        out.push('');
        continue;
      }
      for (const it of sample) {
        const label = shortLabel(it, source);
        const ctx = shortContext(it, source);
        const url = itemUrl(it, source);
        out.push(`- [ ] **${label}**${url ? ` — [link](${url})` : ''}`);
        if (ctx) out.push(`      \`${ctx}\``);
      }
      out.push('');
    }
  }

  await mkdir(path.join(ROOT, 'data', 'validation'), { recursive: true });
  const file = path.join(ROOT, 'data', 'validation', `${entity}-${today()}.md`);
  await writeFile(file, out.join('\n'));
  console.log(`wrote → ${path.relative(ROOT, file)}`);
  console.log(`open the file, check boxes for true positives, then run:`);
  console.log(`  node scripts/validate-mapping.mjs score ${path.relative(ROOT, file)}`);
}

async function actionScore(args) {
  const file = args[0];
  if (!file) {
    console.error('usage: node scripts/validate-mapping.mjs score <validation-file.md>');
    process.exit(1);
  }
  const text = await readFile(path.resolve(file), 'utf8');
  const lines = text.split('\n');

  // State machine: track current source / topic from headings, count
  // checked-vs-total checkbox lines per cell.
  let source = null;
  let topic = null;
  const cells = []; // { source, topic, total, checked }
  const cellMap = new Map();
  const cellKey = (s, t) => `${s}|${t}`;
  const ensureCell = (s, t) => {
    const k = cellKey(s, t);
    if (!cellMap.has(k)) {
      const c = { source: s, topic: t, total: 0, checked: 0 };
      cellMap.set(k, c);
      cells.push(c);
    }
    return cellMap.get(k);
  };

  const sourceHeading = /^## (\w+) —/;
  const topicHeading = /^### (\w+) · (\w+) /;
  const checkbox = /^- \[( |x|X)\]/;

  for (const line of lines) {
    let m;
    if ((m = sourceHeading.exec(line))) {
      source = m[1];
      topic = null;
      continue;
    }
    if ((m = topicHeading.exec(line))) {
      source = m[1];
      topic = m[2];
      continue;
    }
    if (source && topic && (m = checkbox.exec(line))) {
      const cell = ensureCell(source, topic);
      cell.total++;
      if (m[1] === 'x' || m[1] === 'X') cell.checked++;
    }
  }

  // Report
  console.log(`\n=== precision report — ${path.basename(file)} ===\n`);
  console.log('source'.padEnd(8) + 'topic'.padEnd(20) + 'n'.padStart(4) + 'tp'.padStart(4) + 'precision'.padStart(11) + '  gate');
  console.log('-'.repeat(56));
  let failed = 0;
  let evaluated = 0;
  let skipped = 0;
  for (const c of cells) {
    if (c.total === 0) continue;
    const p = c.checked / c.total;
    const evalable = c.total >= MIN_N_FOR_GATE;
    let mark;
    if (!evalable) {
      mark = 'skip (n<3)';
      skipped++;
    } else if (p >= PRECISION_GATE) {
      mark = 'pass';
      evaluated++;
    } else {
      mark = 'FAIL';
      evaluated++;
      failed++;
    }
    console.log(
      c.source.padEnd(8) +
      c.topic.padEnd(20) +
      String(c.total).padStart(4) +
      String(c.checked).padStart(4) +
      `${(p * 100).toFixed(0)}%`.padStart(11) +
      `  ${mark}`
    );
  }
  console.log('-'.repeat(56));
  console.log(`evaluated cells: ${evaluated}, passed: ${evaluated - failed}, failed: ${failed}, skipped (n<3): ${skipped}`);
  console.log(`gate: every evaluated cell must reach precision >= ${(PRECISION_GATE * 100).toFixed(0)}%`);
  if (failed > 0) {
    console.log(`\nresult: FAIL — ${failed} cell(s) below gate. Matrix should not ship until regex is tightened or sample reannotated.`);
    process.exit(1);
  }
  if (evaluated === 0) {
    console.log(`\nresult: NO DATA — annotate at least one cell with n >= 3 to evaluate.`);
    process.exit(2);
  }
  console.log(`\nresult: PASS`);
}

async function main() {
  const [action, ...rest] = process.argv.slice(2);
  if (action === 'sample') return actionSample(rest);
  if (action === 'score')  return actionScore(rest);
  console.error('usage:');
  console.error('  node scripts/validate-mapping.mjs sample <entity> [--n 5] [--sources jobs,arxiv,github]');
  console.error('  node scripts/validate-mapping.mjs score <validation-file.md>');
  process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
