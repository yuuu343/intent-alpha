// remark-job-links — turn dispatch-body inline-code job IDs into hyperlinks
// to the original posting on the company's careers board.
//
// We accumulate id → url across all snapshots in data/snapshots/<slug>/*.json
// at plugin-init time. Inline code that matches a job-id pattern (numeric,
// 8–12 digits) gets replaced with a link node wrapping the same inline code.
//
// Why a remark plugin and not manual <a> tags in MDX: the same job ID may
// appear across many dispatches and the URL is authoritative in the snapshot,
// so build-time resolution keeps the body text simple and the data the source
// of truth.

import fs from 'node:fs';
import path from 'node:path';

let jobMapCache = null;

function buildJobMap() {
  if (jobMapCache) return jobMapCache;
  const map = new Map();
  const SNAPSHOTS = path.resolve(process.cwd(), 'data', 'snapshots');
  if (!fs.existsSync(SNAPSHOTS)) {
    jobMapCache = map;
    return map;
  }
  const slugs = fs.readdirSync(SNAPSHOTS);
  for (const slug of slugs) {
    const dir = path.join(SNAPSHOTS, slug);
    let stat;
    try { stat = fs.statSync(dir); } catch { continue; }
    if (!stat.isDirectory()) continue;
    const files = fs.readdirSync(dir).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    for (const f of files) {
      try {
        const snap = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
        for (const j of (snap.jobs ?? [])) {
          if (j.id != null && j.url) map.set(String(j.id), j.url);
        }
      } catch { /* skip malformed snapshots */ }
    }
  }
  jobMapCache = map;
  return map;
}

const JOB_ID_RE = /^\d{8,12}$/;

function walk(node, fn, idx, parent) {
  if (!node || typeof node !== 'object') return;
  fn(node, idx, parent);
  if (Array.isArray(node.children)) {
    // Iterate over a snapshot of indexes since fn may replace nodes.
    for (let i = 0; i < node.children.length; i++) {
      walk(node.children[i], fn, i, node);
    }
  }
}

export function remarkJobLinks() {
  const map = buildJobMap();
  return function transformer(tree) {
    walk(tree, (node, index, parent) => {
      if (!parent || index == null) return;
      if (node.type !== 'inlineCode') return;
      const id = node.value;
      if (typeof id !== 'string' || !JOB_ID_RE.test(id)) return;
      const url = map.get(id);
      if (!url) return;
      // Replace the inlineCode node with a link wrapping it.
      parent.children[index] = {
        type: 'link',
        url,
        title: null,
        data: { hProperties: { rel: 'noopener', target: '_blank' } },
        children: [{ type: 'inlineCode', value: id }],
      };
    });
  };
}
