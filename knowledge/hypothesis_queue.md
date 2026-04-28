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

```yaml
id: PROV-002
state: PUBLISHED
company: nvidia
cycle: "0002"
title: "NVIDIA Is Staffing for a Fragmented Silicon Roadmap, Not a Bigger GPU"
hypothesis: >
  NVIDIA is staffing for a vertical-specific silicon roadmap — multiple
  specialised silicon families (datacenter, networking ASICs, AV, robotics)
  developed in parallel — rather than a single monolithic next-generation GPU
  platform.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/nvidia/2026-04-28.json
signal_count: 257 of 1000 sampled (25.7%)
signal_clusters:
  - silicon/HW design: 171 (e.g. JR2017041 ASIC Verification Engineer, JR2006352 Senior Silicon and System Product Lead, JR2014981 IC Post-Silicon Test Engineer)
  - datacenter/networking: 86 (JR2000295 NVLink Fusion, JR2016684 Networking AI, JR2016557 NVLink GPU Networking)
  - automotive/AV: 73
  - robotics/Omniverse: 21 (JR2016809 Humanoid Robotics)
  - compilers/CUDA: 33
counter_evidence:
  - "Workday CXS doesn't return department; this is title-keyword cluster."
  - "Per-fetch cap = 1000 of ~2000 total. Ratios should hold but absolute counts conservative."
critic_verdict: PASS
critic_notes: |
  Cluster size 257 well above 3-posting threshold; specificity high (NVIDIA-only
  pattern); counter-evidence acknowledged in article.
orchestrator_review: FALSE
published_to: src/content/articles/nvidia-silicon-fragmentation-2026-04.mdx
```

```yaml
id: PROV-003
state: PUBLISHED
company: openai
cycle: "0003"
title: "OpenAI's Hiring Has Finished the Pivot from Lab to Enterprise Vendor"
hypothesis: >
  OpenAI has finished its operational pivot from foundation-model lab to
  enterprise software vendor. Hiring matches the Palantir / Snowflake scale-up
  shape (Forward Deployed Engineers, regional Account Directors, applied
  engineering); safety roles are 4.6% of open positions.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/openai/2026-04-28.json
signal_count: 260 of 651 (~40%)
signal_clusters:
  - Go To Market dept: 134
  - Applied AI dept: 87
  - Scaling dept: 86
  - Model Deployment for Business dept: 39
  - Forward Deployed Engineering pattern visible (5bbc43df-… Manager FDE, 00207abc-… FDE SF, 961f6c58-… FDE Paris, 305a4b22-… FDE SF)
  - Compute infrastructure (8fb1615c-… Compute Infrastructure TPM, 770d5c3f-… Frontier Clusters Infra)
counter_evidence:
  - "30 safety roles is small but not zero — the lab work continues, just no longer the centre of gravity."
  - "Regional GTM scale-up follows ChatGPT-Enterprise traction. Hiring is a lagging signal."
critic_verdict: PASS
critic_notes: |
  Cluster size 260 / 651 = 40%. Specific FDE + Account Director combination is
  diagnostic (not generic enterprise SaaS pattern alone). Confidence calibrated
  to medium pending earnings/revenue-mix corroboration.
orchestrator_review: FALSE
published_to: src/content/articles/openai-enterprise-pivot-2026-04.mdx
```

```yaml
id: PROV-004
state: PUBLISHED
company: databricks
cycle: "0004"
title: "Databricks Hires Like an AI Platform, Not a Data Platform"
hypothesis: >
  Databricks has effectively completed the rebrand from data platform to AI
  platform. AI/ML and generative-AI engineering roles outnumber traditional
  data-engineering roles ~5:1; Mosaic-style GenAI platform plus an agentic-
  application stack now dominate the engineering hiring.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/databricks/2026-04-28.json
signal_count: 138 (116 AI/ML + 22 traditional data-eng)
signal_clusters:
  - AI/ML platform titles: 116 (8509230002 AI Platform NYC, 8211648002 Model Serving, 8202670002 GenAI inference, 8220814002 Agentic Applications, 7930603002 DevAdvocate Agentic Systems)
  - Enterprise sales: 139
  - Platform infrastructure: 58
  - Traditional data engineering: 22 (8502969002 Spark Connect, 8324875002 Streaming, 8303014002 Delta)
counter_evidence:
  - "Many platform engineers do dual data + AI work; 5:1 ratio depends on strict exclusion of bridge roles."
  - "139 enterprise-sales roles is also consistent with 'late-stage SaaS scale-up' (friendly alternate)."
critic_verdict: PASS
critic_notes: |
  Specificity high (no other major company in roster shows AI:data ratio this
  skewed). Mosaic acquisition lineage visible in titles. Confidence medium
  pending product-roadmap / pricing-page corroboration.
orchestrator_review: FALSE
published_to: src/content/articles/databricks-ai-platform-pivot-2026-04.mdx
```

```yaml
id: PROV-005
state: PUBLISHED
company: cloudflare
cycle: "0005"
title: "Cloudflare's AI-at-the-Edge Narrative Doesn't Match the Hiring Shape"
hypothesis: >
  Cloudflare's hiring shows a near-complete pivot from developer-first PLG to
  enterprise sales motion (26.5% of open roles are GTM). Workers AI / on-edge
  inference engineering hiring is comparatively tiny (3 dedicated roles); the
  AI-at-edge narrative is louder on the product page than in the hiring pattern.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/cloudflare/2026-04-28.json
signal_count: 121 GTM vs 3 Workers-AI engineering (gap = signal)
signal_clusters:
  - Sales/GTM: 121 (7480799 AE Public Sector UKI MoD, 7406425 SLED, 7667868/7676967/7400242 BDRs)
  - Security/Zero Trust: 36
  - Workers AI / ML engineering: 3 (7581107 Senior ML Eng, 6297179 Workers AI, 7764827 Workers AI)
  - Emerging Technology and Incubation dept: 18
counter_evidence:
  - "General Engineering (47) + Infrastructure (16) contain AI-adjacent work that doesn't tag explicitly; AI count is conservative."
  - "Late-stage public SaaS sales scale-up is a typical stage effect, not necessarily a strategic AI-deprioritisation."
critic_verdict: PASS
critic_notes: |
  Counter-narrative hypothesis (contradicts public AI-at-edge messaging) is
  the kind we should publish — falsifiable, specific. Comparison to PROV-001
  (Anthropic infra build-out) sharpens the contrast.
orchestrator_review: FALSE
published_to: src/content/articles/cloudflare-enterprise-gtm-2026-04.mdx
```

```yaml
id: PROV-006
state: PUBLISHED
company: cohere
cycle: "0006"
title: "Cohere Has Two Centres of Gravity: Modeling and Agents"
hypothesis: >
  Cohere has structurally bet on agents as a product, not a feature — making
  it the only frontier-AI lab with "Agentic Platform" as a peer department to
  Modeling. The 29:13 split signals long-term commitment to a dual identity
  (research lab AND agent-platform vendor).
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/cohere/2026-04-28.json
signal_count: 48 of 115 (~42%, dual-cluster)
signal_clusters:
  - Modeling dept: 33 (28.7%) — Member of Technical Staff training/post-training pipeline
  - Agentic Platform dept: 15 (13.0%) — explicit department, not internal team
  - Applied AI – Agentic Workflows present in 3 geographies (1fa01a03-…, 9c18b199-… SG, 031c2335-… Korea)
  - Inference dept: 4 (Audio Inference, Inference Infra, SRE)
  - Embeddings & Search dept: 2; Cohere Labs dept: 2
counter_evidence:
  - "115 open roles is small; ratios sensitive to one hiring round."
  - "'Agentic Platform' as a department name is descriptive — we don't have org-chart evidence on independence."
critic_verdict: PASS
critic_notes: |
  Distinctive among AI labs (no other lab has agents-as-department).
  Specificity high. Confidence medium pending product-pricing or DevRel
  expansion corroboration.
orchestrator_review: FALSE
published_to: src/content/articles/cohere-agentic-platform-2026-04.mdx
```

```yaml
id: PROV-007
state: PUBLISHED
company: coinbase
cycle: "0007"
title: "Coinbase Is Staffing Itself Into a Bank"
hypothesis: >
  Coinbase's hiring is converging on the proportional shape of a regulated
  financial institution, not a crypto-pioneer startup. Finance & Accounting,
  Legal & Compliance, and Engineering — Security together hold ~32% of open
  positions; combined with internal Core AI Infrastructure build-out, this is
  the staffing of an organisation preparing for sustained regulatory engagement
  and bank-grade compliance permanence.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/coinbase/2026-04-28.json
signal_count: 37 of 114 (~32% compliance triad)
signal_clusters:
  - Finance & Accounting dept: 18 (15.8%) — incl. 880ccfde-… Director SEC Reporting and Technical Accounting, ce7ce12a-… Intl Accounting Manager
  - Engineering – Security dept: 10 (8.8%) — 7701657 Blockchain Security, 7411772 Offensive Security IoT/Network Pentesting, 7611268 CorpSec
  - Legal & Compliance dept: 9 (7.9%)
  - Core AI Infrastructure (internal): 7847428 Senior SRE, 7648987 Staff ML Eng Platform / Core AI Automation
  - Cyprus operations expansion: 7759747 / 7759744 (EU-licensed entity scaling)
counter_evidence:
  - "114 roles is small; proportions sensitive to changes."
  - "Compliance hiring at this proportion can also reflect a single enforcement event being absorbed."
critic_verdict: PASS
critic_notes: |
  Counter-narrative ('crypto-bank') is sharp and specific. 32% compliance
  triad is well above 3-cluster threshold. Confidence medium pending
  national-bank-charter-style corroboration.
orchestrator_review: FALSE
published_to: src/content/articles/coinbase-bank-shape-2026-04.mdx
```

```yaml
id: PROV-008
state: PUBLISHED
company: reddit
cycle: "0008"
title: "Reddit Is Building DIY Ad-Tech, Not a Data-Licensing Business"
hypothesis: >
  Reddit's hiring shape shows the company building toward DIY ad-tech parity
  with Meta and Google, not toward a data-licensing-led business model. 57% of
  open roles are revenue-side (sales, ads engineering, ads data science). Data-
  licensing partnerships with AI labs are real but ancillary; the structural
  commitment is to becoming a self-sufficient ad-targeting platform.
horizon: "12-18 months"
confidence: medium
snapshot_source: data/snapshots/reddit/2026-04-28.json
signal_count: 82 of 145 (56.6% revenue-side)
signal_clusters:
  - Large Customer Sales dept: 28 (19.3%)
  - Mid Market & SMB dept: 24 (16.6%)
  - Ads Engineering dept: 11 (7.6%)
  - Ads Data Science dept: 10 (6.9%) — peer to general ML at 10
  - Global Client Solutions dept: 9 (6.2%)
  - Trigram "large customer sales" ×19, "client partner large" ×13
  - No data-licensing department or partnerships-engineering postings visible
counter_evidence:
  - "Data licensing is a revenue event, not an org commitment — its absence isn't proof of de-prioritisation."
  - "Ads scale-up is typical post-IPO consumer internet stage effect."
critic_verdict: PASS
critic_notes: |
  Counter-narrative (against the data-licensing press story) is the type we
  should publish — falsifiable. Specificity high (57% revenue-side is
  Reddit-specific given its scale).
orchestrator_review: FALSE
published_to: src/content/articles/reddit-ad-tech-2026-04.mdx
```
