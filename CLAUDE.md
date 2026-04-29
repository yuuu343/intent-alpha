# Intent Alpha — Claude project notes

Token-economy and project-specific conventions. Read first; obey by default.

## Token-economy commands

Always prefer summary-only invocations over raw streams:

```bash
# Build: result lines only, no per-page list (avoids ~80 lines of noise)
rtk npm run build 2>&1 | grep -E "(Complete|page\(s\) built|error|warn|✗)" | tail -3

# Full-roster fetch: --quiet skips per-company log; the summary block always prints
node scripts/fetch-jobs.mjs --concurrency 4 --quiet

# Single-company fetch: small enough as-is
node scripts/fetch-jobs.mjs <slug>
```

For analytic scripts (`analyze`, `vocab-shift`, `withdrawal-lifetime`, `diffusion-velocity`, `cross-reference`, `github-dependents`) the natural output is a tight table — use as-is.

## File-handling patterns to avoid

- **Never `Read` snapshot JSON files** under `data/snapshots/<slug>/*.json`. They are 4000+ lines (with body text). Use `Grep` with specific patterns, or pipe a small inline node script that reads + projects only the field you need.
- **Never `Read` `data/explore-data.json`** or any of `data/arxiv/`, `data/github/` — same reasoning, multi-MB JSON.
- **Don't re-read files already loaded earlier in the session.** Use what is in the prior context.
- **Don't make many small `Edit` calls on the same file when one `Write` would consolidate.** As a rule of thumb: if you're about to issue the third `Edit` on the same file in one turn, pause and consider rewriting the section once.
- **Don't `tail -10` on build output** — it leaks ~7 lines of per-page build noise. Use the grep filter above.
- **Don't `Bash` for what `Glob`/`Grep`/`Read`/`Edit`/`Write` can do** (per global CLAUDE.md).

## Tooling notes

- `rtk init -g` cannot install Claude Code hooks on Windows (Unix-only). The `[rtk] /!\ No hook installed` warning will continue to print on every `rtk` call. It is harmless — RTK still compresses output. Do not retry the install.
- `.claude/settings.local.json` carries historical one-shot permissions accumulated across past sessions. New permissions should prefer wildcards (`Bash(git *)`, `Bash(node scripts/*)`) over specific commands. The existing entries are harmless to leave alone.

## Project structure shorthand

- Pages: `src/pages/<route>.astro`. New pages auto-route by filename.
- Charts: `src/components/charts/{Heatmap,BarChart,Sparkline}.astro`. Hand-crafted SVG, no chart-lib dep.
- Adapters: `scripts/fetch-jobs.mjs` (jobs), `scripts/fetch-arxiv.mjs`, `scripts/fetch-github.mjs`.
- Analytic scripts: `scripts/{analyze,vocab-shift,withdrawal-lifetime,diffusion-velocity,cross-reference,github-dependents}.mjs`.
- Data outputs: `data/<type>/<slug>/<YYYY-MM-DD>.json` — version-controlled.
- MDX dispatches: `src/content/articles/*.mdx` — frontmatter schema in `src/content.config.ts`.
- Job-ID auto-linking: `src/lib/remark-job-links.mjs` (registered in `astro.config.mjs`).

## Editorial register (do not regress)

Cream paper + Fraunces serif + single vermillion accent + per-page glyph + equation watermark. Charts are hand-crafted SVG with single-accent fill; no categorical color palettes; no chart libraries; no client frameworks. See global memory for the long form (`feedback_design_locked.md`).
