# AGENT_BOILERPLATE.md
Cite this file by path in every agent prompt. Read once.

## 1. Role boundary
Read `AGENTS.md` first. Follow your role section verbatim.
- **Agent 1 Hypothesizer**: only edits `knowledge/hypothesis_queue.md` (append PROV). No
  evidence enrichment, no critic verdicts, no MDX writes.
- **Agent 2 Evidence Collector**: only extends an existing PROV's evidence section. No new
  hypotheses, no verdicts, no MDX writes.
- **Agent 3 Critic**: only edits PROV state field + `knowledge/dead_hypotheses.md`. No new
  hypotheses, no evidence, no MDX writes.
- **Agent 4 Publisher**: only writes `src/content/articles/*.mdx`. Reads approved PROV; does
  not modify it.

## 2. Token hygiene (v2 — strict)
**Reading large data**
- Snapshot JSONs in `data/snapshots/` are 70–150 KB and must NEVER be whole-Read.
  Always extract via `node -e "const j=require('./...'); console.log(...)"` selecting
  ONLY the needed fields (titles, departments, ids, urls). Reading the full file pulls
  every job description into context — pure waste.
- For "what departments / clusters?" queries always run
  `node scripts/analyze.mjs <slug>` first. It prints department breakdown,
  pre-defined cluster counts, and frequent title trigrams. Add
  `--regex term1,term2,...` to test a custom hypothesis. This single command
  replaces the ad-hoc `node -e ...` invocations and is the standard first
  step of a hypothesis cycle.
- `knowledge/hypothesis_queue.md` and `knowledge/dead_hypotheses.md`: locate target PROV
  via `Grep ^id: PROV-NNN`, Read ±50 lines, then Edit. Never whole-Read.
- Article MDX files in `src/content/articles/`: only Read when actually editing that
  specific article. Title/hypothesis/cycle metadata is in frontmatter (top ~12 lines).

**Operating discipline**
- Whole-file reads are reserved for: `AGENTS.md`, `AGENT_BOILERPLATE.md`, individual
  source files <10 KB. Anything else → grep / offset+limit / `node -e` extraction.
- Batch independent operations: parallel `Bash` calls for independent fetches /
  verifications. Don't sequentialize what can run together.
- Don't re-read a file inside the same task once you have its contents. Trust the
  conversation context.
- Emit ≤300-word summaries. No ASCII art, no emoji, no narrating intermediate steps.
- For company JSON creation in batch, use a single multi-Write block; don't print the
  contents back to the user — they can read the diff in git.

## 3. Project standard (intent-alpha v1)
- Audience: global / English. SEO is the primary distribution channel.
- Tone: analytical, not promotional. No certainty framing on probabilistic claims.
- Confidence labels: `low` / `medium` / `high`. Default to `medium`. `high` requires ≥5
  distinct posting signals AND a corroborating non-posting public artifact.
- Horizon: default `12–18 months`. State explicitly in every article.
- Scope: only companies in `src/data/companies/*.json`. Adding a new company requires admin.
- Sources: only the company's stated public ATS endpoint (Greenhouse, Lever, Workday).
- Compliance: respect `robots.txt`; respect ATS terms; do not exceed 1 request per company
  per fetch cycle (the fetcher is rate-limited by design).

## 4. PROV entry size limit (Agent 1 / 2)
Single PROV entry ≤150 lines in `knowledge/hypothesis_queue.md`. If signal/evidence requires
more, split into `knowledge/PROV-<NNN>_evidence.md` and reference it.

## 5. Knowledge file edit pattern
Do NOT Read `hypothesis_queue.md` whole. Locate PROV by `grep ^id: PROV-NNN` or known line
range, Read targeted ~50 lines, Edit `old_string`/`new_string`. Append-only sections (new
PROV, new dead-hypothesis): write to end via Edit anchor on prior-block tail.

## 6. Pre-registered criteria are sacred (Agent 3)
Never relax fail-conditions post-hoc to make a hypothesis pass. If signal threshold not met,
return FAIL_WEAK_SIGNAL. Hypothesizer can re-propose later when more posting data exists.

## 7. Out of scope (universal)
- No new tool installs (no `npm install` mid-cycle without orchestrator approval).
- No git commits unless orchestrator asks.
- No deletion of existing files unless directed.
- No edits to memory files (`C:/Users/hide3/.claude/projects/.../memory/`) — orchestrator
  territory.
- No paid-API integrations. If a feature seems to require one, surface as a question — do
  not improvise a paid path.

## 8. Signal-strength standards (n thresholds, scale-dependent)
| Cluster size | Action |
|---|---|
| 1 posting | Auto-FAIL_WEAK_SIGNAL unless corroborating non-posting artifact (announcement, paper, partnership). |
| 2 postings | Confidence ceiling = `low`. Critic may PASS if specificity high + non-generic. |
| 3–4 postings | Confidence ceiling = `medium`. Standard publication-ready band. |
| 5+ postings + corroboration | Confidence `high` eligible. |

## 9. Specificity check (Agent 1, mandatory self-check)
Before finalizing a PROV, write under `adversarial_self_check`:

```yaml
adversarial_self_check:
  q1_would_this_apply_to_other_companies: |
    [list 3 well-known tech companies. Would the same hypothesis fit any of them given their
    current postings? If yes for ≥1, hypothesis is generic — REVISE before submitting.]
  q2_what_evidence_would_change_my_mind: |
    [≥2 specific future signals that would falsify the hypothesis.]
  q3_dead_hypothesis_proximity: |
    [closest entry in knowledge/dead_hypotheses.md, with mechanism similarity + distinction.
    If single-axis difference only, flag for orchestrator review.]
  q4_confidence_calibration: |
    [why this confidence label and not the next one up/down.]
```

If `q1` flags ≥1 generic match, OR `q3` flags single-axis distance from a dead hypothesis,
write `ORCHESTRATOR_REVIEW: TRUE` at the top of the PROV. Orchestrator surfaces to admin
BEFORE Critic spawn.

## 10. Article tone constraints (Agent 4)
- Title: declarative or interrogative, ≤70 chars. No "You won't believe...", no emoji.
- Lead paragraph: state the hypothesis explicitly.
- Body: signals → reasoning → what would change our mind → caveats. Always all four.
- Voice: analytical, hedged where appropriate. Avoid "definitely", "guaranteed", "obvious".
- Length: 600–1200 words. Longer requires admin approval.
