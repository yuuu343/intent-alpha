# Hypothesis queue
Append-only log of PROV (proposed) entries. State transitions performed in place.

Schema: see AGENTS.md "Hypothesis schema". Critic verdict / dead-hypothesis archive: see
`knowledge/dead_hypotheses.md`.

---
<!-- new PROV entries go below this line, newest at bottom -->

```yaml
id: PROV-001
state: PUBLISHED
company: anthropic
title: "Anthropic Is Building the Org to Own Compute, Not Just Rent It"
hypothesis: >
  Anthropic is staffing to add owned and operated physical compute capacity
  (datacenters, colocation deals, energy/lease contracts) alongside its existing
  cloud footprint, with first material announcements likely within 12-18 months.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/anthropic/2026-04-28.json
signal_count: 51 of 451 postings (11.3%)
signals:
  - id: 5099080008
    title: "Transaction Manager"
    dept: Compute
    why: "Dealmaking role inside Compute org — not a generic counsel role; specialized for large compute/infra contracts."
  - id: 5154345008
    title: "Transaction Principal"
    dept: Compute
    why: "Senior dealmaking; pair with Transaction Manager indicates a transaction-deal pipeline."
  - id: 5170084008
    title: "Transaction Principal"
    dept: Compute
    why: "Second Transaction Principal posting — pipeline depth, not a single hire."
  - id: 5044994008
    title: "Commercial Counsel, Datacenters & Construction"
    dept: Legal
    why: "Legal specifically for datacenter construction — implies real estate / build-out work."
  - id: 5045003008
    title: "Commercial Counsel, Colocation & Networks"
    dept: Legal
    why: "Colocation contracts — physical facility leasing."
  - id: 5186518008
    title: "Commercial Counsel, Compute & Infrastructure"
    dept: Legal
    why: "Dedicated infrastructure counsel — generalist counsel would not be split this way."
  - id: 5196221008
    title: "Director, Infrastructure Capex Accounting"
    dept: Finance
    why: "Capex accounting at Director level signals owned-asset capital, not opex cloud spend."
  - id: 5196219008
    title: "Director, Infrastructure & Energy Accounting"
    dept: Finance
    why: "Energy accounting only matters if you operate (or contract directly for) facilities."
  - id: 5194021008
    title: "Senior Manager, Infrastructure Lease Accounting"
    dept: Finance
    why: "Lease accounting at scale requires real-property leases."
  - id: 5169670008
    title: "Strategic Deals Lead, Compute & Infrastructure"
    dept: Finance
    why: "Strategic deals function specifically scoped to compute/infra."
  - id: 5187486008
    title: "Data Center Electrical Engineer"
    dept: Compute
    why: "Electrical engineering inside Compute org — physical-plant skill, not a cloud-customer skill."
  - id: 5157023008
    title: "Data Center Design Execution Lead"
    dept: Compute
    why: "DC design execution — building, not consuming."
  - id: 5188939008
    title: "Data Center Portfolio Planning & Execution Lead"
    dept: Compute
    why: "'Portfolio' framing implies multi-site owned/operated capacity."
counter_evidence:
  - "Job 5141377008 'Engineering Manager, Cloud Inference AWS' — Anthropic is still hiring for cloud (AWS) inference; the hypothesis is hybrid (add owned), not replace-cloud."
  - "Many Software Engineering - Infrastructure roles for inference/observability remain consistent with cloud-serving."
  - "No public press release confirming a specific datacenter buildout as of snapshot date."
pre_registered_resolution:
  flips_to_low_confidence_if: |
    - Within 6 months, any of the Compute Transaction roles are quietly closed without backfill
    - Capex accounting hiring decelerates / reverts to baseline by next snapshot
    - No public-record colocation, lease, or energy contract emerges within 12 months
  flips_to_high_confidence_if: |
    - Public press release / SEC-equivalent disclosure of a datacenter build, colocation deal, or
      multi-year energy contract within 6 months
    - Posting language shifts from "Strategic Deals Lead, Compute" to explicit "Datacenter Operations Lead"
    - Hiring spreads to Datacenter Operations / Site Reliability roles framed as owned-site
similarity_check:
  closest_existing_article: "(none — first article)"
  similarity_score: 0.0
adversarial_self_check:
  q1_would_this_apply_to_other_companies: |
    Would NOT fit Airbnb / Pinterest / Discord / Figma — none of them are hiring datacenter
    electrical engineers, colocation counsel, or capex accounting at Director level.
    Could superficially fit hyperscalers (AWS/Azure/GCP) but they already operate
    datacenters; the hypothesis is specifically about a pure-cloud-customer org transitioning.
    Would partially fit OpenAI but their public posture (Stargate + Microsoft) is already
    explicit, so the "hidden signal" framing only applies to Anthropic.
  q2_what_evidence_would_change_my_mind: |
    See pre_registered_resolution above. Concretely: any one of (a) Transaction Principal
    roles withdrawn, (b) capex accounting role closed without fill, or (c) explicit Anthropic
    statement of "cloud-only / no owned infrastructure" strategy.
  q3_dead_hypothesis_proximity: |
    None — first hypothesis. No prior dead hypotheses to compare.
  q4_confidence_calibration: |
    Medium (not high) because: (a) no corroborating non-posting public artifact yet —
    AGENT_BOILERPLATE.md §3 requires that for high; (b) timing of first public announcement
    is uncertain even if direction is clear; (c) hybrid (add-owned-alongside-cloud) is harder
    to falsify than replace-cloud.
critic_verdict: PASS
critic_notes: |
  - signal_cluster_size: 51 distinct postings covering 4 functions (Compute, Legal, Finance,
    Software Eng - Infra). Far above 3-posting threshold.
  - specificity_high: hypothesis would not generalize to ≥3 unrelated companies.
  - counter_evidence_addressed: hybrid framing accommodates continued cloud use.
  - confidence_calibrated: medium is appropriate given no non-posting corroboration.
orchestrator_review: FALSE
published_to: src/content/articles/anthropic-compute-vertical-integration-2026-04.mdx
```
