# intent-alpha

Static site that infers company direction from public job postings.

## Stack
- Astro 5 (static generation, MDX, sitemap, RSS)
- Free public ATS endpoints: Greenhouse, Lever, Workday

## Commands
```bash
npm install          # install deps
npm run dev          # dev server
npm run build        # build static site to dist/
npm run preview      # preview built site
npm run fetch        # fetch latest job postings (all companies)
npm run fetch -- <slug>   # fetch one company
```

## Layout
```
src/
  content.config.ts          collections schema
  data/companies/*.json      tracked companies
  content/articles/*.mdx     published hypothesis articles
  layouts/                   Layout.astro (SEO + meta)
  pages/                     index, /companies, /articles, /about, /rss.xml
  styles/global.css

scripts/
  fetch-jobs.mjs             ATS fetcher → data/snapshots/<slug>/<date>.json

knowledge/
  hypothesis_queue.md        PROV queue (used by the agent harness)
  dead_hypotheses.md         rejected hypothesis archive

AGENTS.md, AGENT_BOILERPLATE.md   agent harness design

archive/sp500-dca/           prior project's docs (kept for harness pattern reference)
```

## Operating model
1. Run `npm run fetch` (manual or scheduled later).
2. The agent harness (driven from this Claude Code session) processes new postings into a
   single hypothesis per cycle: Hypothesizer → Evidence Collector → Critic → Publisher.
3. Approved hypotheses become MDX articles in `src/content/articles/`.
4. `npm run build` regenerates the static site.

See `AGENTS.md` for full agent responsibilities and constraints.

## Constraints
- Free public sources only.
- No paid APIs / paid hosting.
- SEO-first; no client-side state libraries (Astro keeps JS shipping near zero by default).
- Not investment advice. Hypotheses are explicitly falsifiable.
