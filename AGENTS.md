# AGENTS.md
System design for intent-alpha. Defines responsibilities, permissions, and file access for each agent.

## Project purpose
Public job postings → hypotheses about a company's near-future direction (12–18 months).
Distribution: SEO-first static site. Sources: Greenhouse, Lever, Workday (free public endpoints only).
Operational constraint: NO paid third-party APIs. Inference runs in this Claude Code session
(admin types "更新" / "update") or, eventually, local Ollama.

## System overview
4-agent pipeline + orchestrator. Same pattern as the prior research harness (archived under
`archive/sp500-dca/`); content is project-specific.

```
Agent 1 Hypothesizer      -> proposes a single company-future hypothesis from posting deltas
Agent 2 Evidence Collector -> assembles supporting / contradicting public evidence
Agent 3 Critic            -> quality / duplicate / weak-signal audit; pass-fail per pre-reg criteria
Agent 4 Publisher         -> renders the hypothesis as an MDX article + SEO metadata
Orchestrator              -> Claude Code session; admin liaison + spawn coordination
```

The orchestrator triggers a cycle when admin says "update". One cycle = one hypothesis
end-to-end (refusal at any agent kills the cycle gracefully — nothing partial gets published).

## Agent 1: Hypothesizer
Role: read recent posting snapshots and the existing article corpus; propose ONE hypothesis.
Read: `data/snapshots/<slug>/*.json`, `src/content/articles/*.mdx` (titles + hypotheses only),
`src/data/companies/*.json`, `knowledge/dead_hypotheses.md`.
Write: `knowledge/hypothesis_queue.md` (append a single PROV entry).
Constraints:
- 1 hypothesis per cycle. No compound hypotheses.
- MUST NOT duplicate an existing live article (same company + same direction).
- MUST NOT match a dead-hypothesis entry (Critic-rejected within last 90 days).
- MUST cite specific posting IDs as the signal source (not "Anthropic is hiring" but
  "posting #ABC + #DEF + #XYZ since 2026-04-15 cluster on legal SME").
- Confidence label assigned at proposal time (low / medium / high).
- Pre-register fail-flip and pass-flip conditions in the entry (see "Hypothesis schema").

## Agent 2: Evidence Collector
Role: enrich the Hypothesizer's PROV with supporting / contradicting evidence from public
data already in the repo (snapshots, prior articles, public company website, robots-respecting
fetches if needed).
Read: same as Agent 1, plus `data/snapshots/<slug>/*.json` history (longitudinal).
Write: `knowledge/hypothesis_queue.md` (extend the PROV's evidence section).
Constraints:
- Public data only. No paid sources.
- Cite each piece of evidence with a stable identifier (job posting ID, URL, snapshot date).
- Include at least one *contradicting* candidate; if none exist, mark the hypothesis as
  weak-evidence and let the Critic decide.

## Agent 3: Critic
Role: quality control. Evaluates the PROV against pre-registered fail / pass criteria and
project standards. Either promotes to Publisher, demotes to dead-hypothesis archive, or
sends back for revision.
Read: full `knowledge/hypothesis_queue.md`, `src/content/articles/*.mdx` (similarity check),
`knowledge/dead_hypotheses.md`.
Write: `knowledge/hypothesis_queue.md` (state transition only), `knowledge/dead_hypotheses.md`
(on rejection).
Reject conditions (any one ⇒ FAIL):
- Signal cluster size below threshold (default: <3 distinct postings supporting the hypothesis).
- Article-similarity above threshold (default: >0.70 against any existing article in same
  company within last 12 months — duplicate / re-stated hypothesis).
- "Generic" framing — claim that would apply identically to ≥3 unrelated companies based on
  current postings (low specificity).
- Counter-evidence not addressed.
- Confidence label inconsistent with evidence strength (e.g., "high" with single posting).
Promote conditions (all required ⇒ PASS):
- Signal cluster ≥3 distinct postings, OR ≥1 posting + corroborating prior public artifact.
- Specificity high (claim does not generalize).
- Counter-evidence acknowledged in the entry.
- Confidence label proportionate.

## Agent 4: Publisher
Role: render the approved PROV as an MDX article in the site, with full SEO metadata.
Read: approved PROV from `knowledge/hypothesis_queue.md`, target company JSON.
Write: `src/content/articles/<company>-<topic>-<YYYY-MM>.mdx`.
Constraints:
- Frontmatter must satisfy the schema in `src/content.config.ts` exactly.
- `description` ≤ 160 chars (SEO meta).
- `hypothesis` is one sentence and matches the PROV verbatim.
- Body MUST include sections: TL;DR, signals, reasoning, what-would-change-our-mind, caveats.
- No emoji. No clickbait. Title ≤ 70 chars.
- Run `npm run build` after writing; on build error, fix or revert (never publish a broken build).

## Orchestrator (Claude Code session, descriptive)
Role: admin liaison; sequences Agents 1→2→3→(4); pre-greps cited facts to keep agents lean;
inline-fallback when an agent step is small (e.g., a one-line frontmatter fix).
Does:
- Run `npm run fetch` before starting a cycle if the latest snapshot is >24 h old.
- Spawn each agent with the relevant section of `knowledge/hypothesis_queue.md` cited inline.
- Surface to admin BEFORE Publisher writes if Critic flagged `ORCHESTRATOR_REVIEW: TRUE`.
- After Publisher, run `npm run build` and report path + URL of the new article.
Does NOT:
- Propose hypotheses (Agent 1).
- Override a Critic rejection without admin approval.
- Publish without admin sign-off on the title/description (one-line confirm is enough).

## Hypothesis schema (PROV entry)
Lives in `knowledge/hypothesis_queue.md`. Single entry template:

```yaml
id: PROV-<NNN>
state: PROPOSED | EVIDENCE | UNDER_REVIEW | APPROVED | REJECTED | PUBLISHED
company: <slug>
title: <draft title>
hypothesis: <one sentence>
horizon: <e.g., "12-18 months">
confidence: low | medium | high
signals:
  - posting_id: <ATS job id>
    title: <job title>
    snapshot_date: <YYYY-MM-DD>
    why_it_matters: <one line>
counter_evidence:
  - <one line each>
pre_registered_resolution:
  flips_to_low_confidence_if: <conditions>
  flips_to_high_confidence_if: <conditions>
similarity_check:
  closest_existing_article: <slug or "none">
  similarity_score: <0.0–1.0>
critic_verdict: PASS | FAIL_<reason> | PENDING
orchestrator_review: TRUE | FALSE
```

## Out of scope (universal)
- Paid APIs / paid SaaS / paid scraping services.
- Scraping endpoints not exposed by the company's ATS publicly.
- Bypassing `robots.txt` or stated terms.
- Subscription / paywall features (project policy: free, ad-supported eventually).
- Predictive claims framed as certainty. Every article is falsifiable by design.

## Standing reference
`AGENT_BOILERPLATE.md` consolidates rules common to all agents (token hygiene, citation
discipline, confidence-calibration). All agent prompts cite it as the first instruction.
