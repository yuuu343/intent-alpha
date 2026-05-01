# Intent Alpha — Claude project notes

Token-economy and project-specific conventions. Read first; obey by default.

## Token-economy commands

Always prefer summary-only invocations over raw streams:

```bash
# Build: result lines only, no per-page list (~80 lines noise avoided)
rtk npm run build 2>&1 | grep -E "(Complete|page\(s\) built|error|warn|✗)" | tail -3

# Full-roster fetch: --quiet skips per-company log; summary block always prints
node scripts/fetch-jobs.mjs --concurrency 4 --quiet

# Single-company fetch: small enough as-is
node scripts/fetch-jobs.mjs <slug>
```

For analytic scripts (`analyze`, `vocab-shift`, `withdrawal-lifetime`, `diffusion-velocity`, `cross-reference`, `github-dependents`) the natural output is a tight table — use as-is.

## File-handling — DO NOT

- **Never `Read` snapshot JSON** under `data/snapshots/<slug>/*.json` (4000+ lines with body). Use `Grep` with patterns or pipe a small inline node script.
- **Never `Read` `data/explore-data.json`** or `data/arxiv/`, `data/github/` — multi-MB JSON.
- **Don't re-read files already loaded** earlier in the session.
- **Don't make many small `Edit`s on the same file** — if about to issue a 3rd `Edit` on one file in one turn, pause and `Write` the section once.
- **Don't `tail -10` on build output** — leaks per-page noise. Use the grep filter above.
- **Don't `Bash` for what `Glob`/`Grep`/`Read`/`Edit`/`Write` can do**.

## Conversation hygiene (token discipline)

**The 2026-04-30 incident**: a single deep-research prompt consumed 3000+ tokens because I re-listed every site surface inline. The fix is durable convention, not one-time cleanup.

- **Don't re-list project state inline** when memory already has it. Reference: `see project_intent_alpha.md` / `see project_growth_strategy.md`. Only the *delta since last reference* belongs inline.
- **Don't summarize what you just did** at the end of every response. Admin reads diffs; trailing recaps waste tokens.
- **Commit messages: ≤2 lines body**, focus on *why* in 1 sentence. No phase logs, no checklists, no per-file enumeration. The diff carries the *what*. Co-author trailer is the only addition.
- **Deep-research prompts: target 800-1200 tokens, hard ceiling 1500.** Reference memory files by name for context; inline only (a) latest admin feedback, (b) the specific question, (c) NG list (admin's deliberate non-goals). See `reference_deep_research_option.md` "prompt-economy".
- **Don't read the whole large file when you need one section.** Use `Grep -n` to find the line, then `Read` with `offset`/`limit`.

## Tooling notes

- `rtk init -g` cannot install hooks on Windows (Unix-only). The `[rtk] /!\ No hook installed` warning prints on every `rtk` call. Harmless. Don't retry.
- `.claude/settings.local.json` carries historical one-shot permissions. New permissions should prefer wildcards (`Bash(git *)`, `Bash(node scripts/*)`) over specific commands. Existing entries harmless to leave alone.

## Project structure shorthand

- Pages: `src/pages/<route>.astro`
- Charts: `src/components/charts/{Heatmap,BarChart,Sparkline}.astro` — hand-crafted SVG, no chart-lib
- Adapters: `scripts/fetch-{jobs,arxiv,github}.mjs`
- Analytic scripts: `scripts/{analyze,vocab-shift,withdrawal-lifetime,diffusion-velocity,cross-reference,github-dependents}.mjs`
- Data: `data/<type>/<slug>/<YYYY-MM-DD>.json` (version-controlled)
- MDX dispatches: `src/content/articles/*.mdx` — schema in `src/content.config.ts`
- Job-ID auto-linking: `src/lib/remark-job-links.mjs` (registered in `astro.config.mjs`)

## Editorial register (do not regress)

Cream paper + Fraunces serif + single vermillion accent + per-page glyph + equation watermark. Charts hand-crafted SVG, single-accent fill, no categorical palettes, no chart libraries, no client frameworks. See `feedback_design_locked.md`.
