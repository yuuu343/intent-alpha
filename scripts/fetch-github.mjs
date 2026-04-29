#!/usr/bin/env node
// scripts/fetch-github.mjs <org> [--repos N] [--commits-since YYYY-MM-DD]
//
// Fetches public repo metadata, contributors, and recent commits for a GitHub
// org. Uses GITHUB_TOKEN env var if present (5000 req/h instead of 60 req/h).
//
// Usage:
//   GITHUB_TOKEN=ghp_... node scripts/fetch-github.mjs anthropics
//   node --env-file=.env scripts/fetch-github.mjs anthropics
//
// Output: data/github/<org>/<YYYY-MM-DD>.json

import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const GH_DIR = path.join(ROOT, 'data', 'github');

const today = () => new Date().toISOString().slice(0, 10);
const TOKEN = process.env.GITHUB_TOKEN;
const UA = 'IntentAlphaBot/0.2 (+https://intent-alpha.hide3desudesu.workers.dev; respectful-fetch)';

function authHeaders() {
  const h = {
    'User-Agent': UA,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (TOKEN) h.Authorization = `Bearer ${TOKEN}`;
  return h;
}

async function ghFetch(url) {
  const res = await fetch(url, { headers: authHeaders() });
  if (res.status === 403 || res.status === 429) {
    const reset = res.headers.get('x-ratelimit-reset');
    throw new Error(`rate limited (status ${res.status}); reset at ${reset ? new Date(parseInt(reset, 10) * 1000).toISOString() : 'unknown'}`);
  }
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`gh: ${url} → HTTP ${res.status}`);
  return await res.json();
}

async function listRepos(org, max) {
  const all = [];
  let page = 1;
  while (all.length < max) {
    const list = await ghFetch(`https://api.github.com/orgs/${org}/repos?per_page=100&page=${page}&type=public&sort=pushed`);
    if (!Array.isArray(list) || list.length === 0) break;
    all.push(...list);
    if (list.length < 100) break;
    page++;
  }
  return all.slice(0, max);
}

async function listContributors(owner, repo) {
  try {
    const list = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/contributors?per_page=30`);
    return Array.isArray(list)
      ? list.map((c) => ({ login: c.login, contributions: c.contributions }))
      : [];
  } catch {
    return [];
  }
}

async function listRecentCommits(owner, repo, since) {
  try {
    const list = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=30&since=${encodeURIComponent(since)}`);
    return Array.isArray(list)
      ? list.map((c) => ({
          sha: c.sha?.slice(0, 7),
          message: (c.commit?.message ?? '').split('\n')[0].slice(0, 140),
          date: c.commit?.author?.date,
          author: c.commit?.author?.name,
        }))
      : [];
  } catch {
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('usage: node scripts/fetch-github.mjs <org> [--repos N] [--commits-since YYYY-MM-DD]');
    process.exit(1);
  }
  const org = args[0];
  let maxRepos = 50;
  let since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--repos') maxRepos = parseInt(args[++i], 10) || maxRepos;
    if (args[i] === '--commits-since') since = `${args[++i]}T00:00:00Z`;
  }
  console.log(`[gh] org=${org} maxRepos=${maxRepos} since=${since.slice(0, 10)} ${TOKEN ? '(authed)' : '(unauthed — 60 req/h)'}`);

  const repos = await listRepos(org, maxRepos);
  console.log(`[gh] ${repos.length} public repos`);

  const enriched = [];
  for (const r of repos) {
    const [contributors, commits] = await Promise.all([
      listContributors(org, r.name),
      listRecentCommits(org, r.name, since),
    ]);
    enriched.push({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language,
      pushedAt: r.pushed_at,
      url: r.html_url,
      contributors,
      recentCommits: commits,
    });
    console.log(`[gh] ${r.name}: ★${r.stargazers_count} ${contributors.length} contrib ${commits.length} commits`);
  }

  await mkdir(path.join(GH_DIR, org), { recursive: true });
  const file = path.join(GH_DIR, org, `${today()}.json`);
  const out = {
    org,
    fetchedAt: new Date().toISOString(),
    commitsSince: since,
    reposCount: enriched.length,
    repos: enriched,
  };
  await writeFile(file, JSON.stringify(out, null, 2));
  console.log(`[gh] wrote → ${path.relative(ROOT, file)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
