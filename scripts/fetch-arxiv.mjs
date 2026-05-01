#!/usr/bin/env node
// scripts/fetch-arxiv.mjs <entity> [--max N] [--query "..."]
//
// Fetches arXiv papers related to a given entity.
// Strategy: combine `all:"<Entity>"` and known seed-author searches; arXiv
// does not always carry an affiliation field, so author-name matching is the
// reliable fallback. Politely throttles per arXiv API guidance (3s between
// requests).
//
// Usage:
//   node scripts/fetch-arxiv.mjs anthropic
//   node scripts/fetch-arxiv.mjs anthropic --max 400
//   node scripts/fetch-arxiv.mjs <entity> --query 'au:"X. Y." OR all:"foo"'
//
// Output: data/arxiv/<entity>/<YYYY-MM-DD>.json

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const ARXIV_DIR = path.join(ROOT, 'data', 'arxiv');

const today = () => new Date().toISOString().slice(0, 10);
const UA = 'IntentAlphaBot/0.2 (+https://intent-alpha.hide3desudesu.workers.dev; respectful-fetch)';
const ARXIV_DELAY_MS = 3100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Topic-seeded queries — used by `--topic <name>` mode to capture the broad
// arXiv field for a topic (no author/affiliation filter), so that the Intent
// Lattice can honestly distinguish "no Say signal" from "we sampled too narrow".
// Scoped to cs.LG / cs.AI / cs.CL to keep noise down.
//
// Topics omitted (security_eng, applied_fde) are not arXiv-research topics.
const TOPIC_QUERIES = {
  post_training:     '(ti:"post-training" OR ti:"RLHF" OR abs:"RLHF" OR ti:"DPO" OR ti:"GRPO" OR ti:"preference modeling" OR abs:"reinforcement learning from human feedback")',
  pre_training:      '(ti:"pre-training" OR ti:"pretraining" OR ti:"foundation model" OR ti:"scaling law")',
  interpretability:  '(ti:"interpretability" OR ti:"sparse autoencoder" OR ti:"mechanistic interpretability" OR ti:"circuit analysis" OR ti:"representation engineering")',
  alignment_safety:  '(ti:"alignment" OR ti:"constitutional AI" OR ti:"red-teaming" OR ti:"red teaming" OR ti:"AI safety")',
  agents:            '(ti:"LLM agent" OR ti:"agentic" OR ti:"tool use" OR ti:"computer use" OR ti:"autonomous workflow")',
  inference_serving: '(ti:"inference" OR ti:"serving" OR abs:"vLLM" OR abs:"TensorRT" OR ti:"speculative decoding")',
  multimodal:        '(ti:"multimodal" OR ti:"vision-language" OR ti:"VLM")',
  evaluation:        '(ti:"benchmark" OR ti:"evaluation" OR ti:"model assessment")',
  compute_infra:     '(ti:"datacenter" OR abs:"GPU cluster" OR abs:"InfiniBand" OR ti:"capacity planning")',
  data_quality:      '(ti:"data curation" OR abs:"dataset construction" OR ti:"data quality")',
};
const TOPIC_CAT_FILTER = '(cat:cs.LG OR cat:cs.AI OR cat:cs.CL)';

// Per-entity seed config. Authors broaden capture beyond affiliation strings
// (which arXiv does not always carry). Hand-curated for accuracy; future
// snapshots can grow the seed list as new researchers surface in dispatches.
const SEEDS = {
  anthropic: {
    affiliation: 'Anthropic',
    authors: [
      // Co-founders / leadership-tier
      'Dario Amodei', 'Daniela Amodei', 'Tom Brown', 'Jared Kaplan',
      'Sam McCandlish', 'Chris Olah', 'Jack Clark', 'Ben Mann',
      // Alignment / interpretability research with public papers
      'Catherine Olsson', 'Nelson Elhage', 'Saurav Kadavath', 'Tom Henighan',
      'Andy Jones', 'Deep Ganguli', 'Yuntao Bai', 'Amanda Askell',
      'Ethan Perez', 'Sam Bowman', 'Jared Mueller', 'Stanislav Fort',
      'Newton Cheng', 'Liane Lovitt',
    ],
  },
  openai: {
    affiliation: 'OpenAI',
    authors: [
      'Ilya Sutskever', 'John Schulman', 'Wojciech Zaremba', 'Greg Brockman',
      'Andrej Karpathy', 'Mark Chen', 'Jakub Pachocki', 'Lilian Weng',
      'Aleksander Madry', 'Bob McGrew',
    ],
  },
  cohere: {
    affiliation: 'Cohere',
    authors: ['Aidan Gomez', 'Nick Frosst', 'Sara Hooker'],
  },
  mistral: {
    affiliation: 'Mistral',
    authors: ['Arthur Mensch', 'Guillaume Lample', 'Timothée Lacroix'],
  },
};

function buildQuery(entity, customQuery) {
  if (customQuery) return customQuery;
  const seed = SEEDS[entity];
  if (!seed) return `all:"${entity}"`;
  const authorClauses = seed.authors.map((n) => `au:"${n}"`);
  return `(all:"${seed.affiliation}" OR ${authorClauses.join(' OR ')})`;
}

function buildTopicQuery(topic) {
  const q = TOPIC_QUERIES[topic];
  if (!q) {
    const known = Object.keys(TOPIC_QUERIES).join(', ');
    throw new Error(`unknown topic '${topic}'. known: ${known}`);
  }
  return `${TOPIC_CAT_FILTER} AND ${q}`;
}

async function arxivQuery(query, start, max) {
  const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=${start}&max_results=${max}&sortBy=submittedDate&sortOrder=descending`;
  const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/atom+xml' } });
  if (!res.ok) throw new Error(`arxiv: HTTP ${res.status}`);
  return await res.text();
}

function parseEntries(xml) {
  const entries = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const body = m[1];
    const get = (tag) => {
      const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`);
      const r = re.exec(body);
      return r ? r[1].trim() : null;
    };
    const id = get('id');
    const title = (get('title') || '').replace(/\s+/g, ' ').trim();
    const summary = (get('summary') || '').replace(/\s+/g, ' ').trim();
    const published = get('published');
    const updated = get('updated');

    const authors = [];
    const affiliations = [];
    const authorRe = /<author>([\s\S]*?)<\/author>/g;
    let am;
    while ((am = authorRe.exec(body))) {
      const ab = am[1];
      const name = (/<name>([\s\S]*?)<\/name>/.exec(ab) || [])[1];
      const aff = (/<arxiv:affiliation>([\s\S]*?)<\/arxiv:affiliation>/.exec(ab) || [])[1];
      if (name) authors.push(name.trim());
      if (aff) affiliations.push(aff.trim());
    }

    const categories = [];
    const catRe = /<category[^>]*term="([^"]+)"/g;
    let cm;
    while ((cm = catRe.exec(body))) categories.push(cm[1]);

    const arxivId = id ? id.replace(/^https?:\/\/arxiv\.org\/abs\//, '').split('v')[0] : null;
    entries.push({
      arxivId,
      url: id,
      title,
      authors,
      affiliations: [...new Set(affiliations)],
      categories,
      published,
      updated,
      summary: summary.slice(0, 1200),
    });
  }
  return entries;
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('usage:');
    console.error('  node scripts/fetch-arxiv.mjs <entity> [--max N] [--query "..."]');
    console.error('  node scripts/fetch-arxiv.mjs --topic <topic> [--max N]');
    process.exit(1);
  }
  let maxTotal = 200;
  let customQuery = null;
  let topic = null;
  let entity = null;
  if (args[0] === '--topic') {
    topic = args[1];
    if (!topic) {
      console.error(`available topics: ${Object.keys(TOPIC_QUERIES).join(', ')}`);
      process.exit(1);
    }
    entity = `_topic_${topic}`;
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--max') maxTotal = parseInt(args[++i], 10) || maxTotal;
    }
  } else {
    entity = args[0];
    for (let i = 1; i < args.length; i++) {
      if (args[i] === '--max') maxTotal = parseInt(args[++i], 10) || maxTotal;
      if (args[i] === '--query') customQuery = args[++i];
    }
  }
  const query = topic ? buildTopicQuery(topic) : buildQuery(entity, customQuery);
  console.log(`[arxiv] ${topic ? `topic=${topic}` : `entity=${entity}`} query=${query} max=${maxTotal}`);

  const pageSize = 50;
  const all = [];
  const seen = new Set();
  for (let start = 0; start < maxTotal; start += pageSize) {
    const max = Math.min(pageSize, maxTotal - start);
    const xml = await arxivQuery(query, start, max);
    const entries = parseEntries(xml);
    if (entries.length === 0) break;
    for (const e of entries) {
      if (e.arxivId && !seen.has(e.arxivId)) {
        seen.add(e.arxivId);
        all.push(e);
      }
    }
    console.log(`[arxiv] start=${start} got=${entries.length} total=${all.length}`);
    if (entries.length < max) break;
    await sleep(ARXIV_DELAY_MS);
  }

  // Topic mode goes under _topics/<topic>/ so per-entity arxivs stay clean.
  const outDir = topic
    ? path.join(ARXIV_DIR, '_topics', topic)
    : path.join(ARXIV_DIR, entity);
  await mkdir(outDir, { recursive: true });
  const file = path.join(outDir, `${today()}.json`);
  const out = {
    entity: topic ? null : entity,
    topic: topic ?? null,
    query,
    fetchedAt: new Date().toISOString(),
    count: all.length,
    papers: all,
  };
  await writeFile(file, JSON.stringify(out, null, 2));
  console.log(`[arxiv] wrote ${all.length} papers → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
