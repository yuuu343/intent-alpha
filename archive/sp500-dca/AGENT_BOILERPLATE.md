# AGENT_BOILERPLATE.md
Cite this file by path in agent prompts. Read once.

## 1. Role boundary
Read AGENTS.md FIRST. Follow your role section verbatim.
- Agent 1 Proposer: only edits hypothesis_tree.md. No backtests, no DSR.
- Agent 2 Backtester: only edits trial_registry.md + writes returns parquet. No new hypotheses, no DSR, no transitions.
- Agent 3 Critic: edits hypothesis_tree.md (verdict fields only), trial_registry.md (eval + n_management), dead_ends.md, active_principles.md. No new hypotheses, no backtests.

## 2. Token hygiene
- NEVER whole-file Read of large knowledge files. Always offset+limit or grep first, then targeted Read.
- AGENTS.md / AGENT_BOILERPLATE.md / cycle 0 knowledge files (<10KB) full read OK once per agent run.
- Do NOT re-grep facts already in prompt CONTEXT. Orchestrator pre-greps; trust the citations.
- Output: parquet/json for data, markdown for knowledge files. NO ASCII art tables, NO emoji, NO multi-paragraph summaries, NO blank-line decoration.
- Single concise summary at end (<=350 words Agent 1/3, <=400 Agent 2). No running narration.
- If a file >50KB: STOP and grep to locate the section first.

## 3. Project standard (NEW_PERM-001 v1.1; cycle 1 post-redteam)
- Premise (admin 2026-04-28): 永久保有 (no selling). Goal = max terminal_wealth (shares*terminal_price). Paper Sharpe / max_DD / DSR informational only.
- IS: 2000-01-01 -> 2018-12-31. OOS: 2019-01-01 -> 2026-04-01.
- BASELINE (cash-neutral, single-budget): admin commits $700/mo (10万円 USD). Baseline deploys it all immediately on first trading day of period (= pure DCA, cap=0 in dca_simulator). Strategy splits same $700/mo between immediate DCA and sleeve waiting for signal trigger; cap-overflow deploys entire sleeve (DCA-like fallback). NO parallel double-budget. NO sleeve forfeit.
- DOLLAR-NEUTRALITY AUDIT (mandatory): cash_inflow AND deployed-to-equity must match strat vs base within $1; deployed_diff_pct reported.
- 12-cell envelope = 4 DCA frequencies {daily, weekly, biweekly, monthly} x 3 spot-buy thresholds. Lit-default = (monthly DCA, medium threshold).
- DEPLOY GATE REQUIRED: WORST cell terminal_wealth_excess_vs_pure_DCA >= +5% AND multi_DOF >= 5/9 same-sign positive AND n_decisions >= 100 AND bootstrap P(excess>=+5%) >= 0.30, on BOTH IS+OOS.
- DEPLOY GATE INFORMATIONAL: Sharpe, max_DD, DSR.
- PRIMARY STAT: block-bootstrap CI on terminal_wealth_excess_pct (n_resamples=10000, block_size=12mo). Use tools/dca_simulator.block_bootstrap_excess_ci. DSR is INFORMATIONAL only (Bailey-López finite-moments assumption violated by overlay strategies with skew>=3 / kurt>=10).
- FX scope: USD-internal only initial cycles.
- Symbols: SPY primary; VOO + IVV secondary (informational fund-implementation invariance check; NOT independent confirmation — 99.9% correlated).
- Tools: tools/cache_sp500_data.py, tools/dca_simulator.py (rev1 cash-neutral overlay + bootstrap CI), backtest_config.py.
- Single-frequency or single-symbol reports auto-rejected.

## 4. PROV entry size limit (Agent 1)
PROV entry <=200 lines in hypothesis_tree.md. Compress prose; bullets not paragraphs. Hand-off package to Agent 2 in summary, not inlined as 200+ line block. If design needs more space, split into knowledge/PROV-XXX_design.md.

## 5. Knowledge file edit pattern (Agent 3)
Do NOT Read hypothesis_tree.md whole. Locate PROV by grep ^PROV-XXX or known line range, Read targeted ~50 lines, Edit old_string/new_string. Append-only sections (cycle_finding blocks, DE entries, TRL entries): write to end via Edit anchor on prior-block tail. Verify n_management changes with single grep, not whole-file Read.

## 6. Pre-registered thresholds are sacred (Agent 2/3)
Never relax thresholds post-hoc to make a hypothesis pass. Report DATA_INSUFFICIENT or LOW_FIRING_RATE; let Agent 3 decide. Pre-registered FAIL trigger satisfied = transition to FAILED, not retry-with-looser-params.

## 7. Out of scope (universal)
- No new tool installations (no pip install)
- No git commits unless orchestrator asks
- No deletion of existing files unless directed
- No edits to memory files (C:/Users/hide3/.claude/projects/.../memory/) — orchestrator territory

## 8. Sample-size standards (n thresholds, scale-dependent)
| Threshold | Scope | Action |
|---|---|---|
| n<100 | Universal hard floor (DCA-domain) | Auto-trigger FAIL_DATA_INSUFFICIENT. Do NOT relax thresholds post-hoc. |
| n>=100, n<1000 | Standard PROV evaluation | DSR best>=0.30 = cycle-success bar |
| n>=1000 | Preferred for deploy candidate | Multi-DOF mandate ON; deploy-gate evaluation enabled |
| n>=5000 IS+OOS combined | Deploy-gate eligible | All worst-cell criteria evaluated |
Scale-dependent: rare-event mechanisms (e.g., -20%+ drawdown spot-buy, ~5-10/decade) where n>=100 structurally unlikely → pre-register FAIL_DATA_INSUFFICIENT as LIKELY verdict, design as probe NOT deploy candidate. Verdict is informational, NOT mechanism rejection.

## 9. PROV-078 lineage warning (Agent 1, manual flag)
Pattern: parent PROV with n undersampled (n<100) showing IS-OOS sign-consistency → derivative single-DOF perturbation triggers sign-flip on >=2 cells → parent's signal was small-sample artifact.
Origin: 2 distinct signal families in nk225-lab predecessor (DE-033 BTC-ETH return-divergence-lag PROV-078 lineage cycles 5-9; DE-045 OI-CROSS-SYMBOL family PROV-143 lineage cycles 21d-f). SP500 DCA Lab inherits flag.
Required (Agent 1): before proposing derivative of parent ∈ {PASS_FORWARD_UNDERSAMPLED, PENDING with n<100}, write in new PROV:
```
PROV-078_LINEAGE_RISK_FLAG: TRUE
parent_n: <parent_n_total>
pre_registered_kill_conditions:
  (a) sign-flip on >=2 cells where parent was positive
  (b) derivative best DSR < (parent_best_dsr - 0.02 absolute)
parent_reclassification_on_kill: parent state -> FAILED (parameter-point fragility)
```
Pre-register kill conditions verbatim. ONE DOF only per derivative cycle. If parent n>=100 flag NOT required.
Manual not auto: lineage pattern n=2; auto-block premature. If 3rd lineage instance emerges, escalate to auto.

## 10. Agent 1 adversarial self-check (mandatory)
Before finalizing PROV entry, write in hand-off section:
```yaml
adversarial_self_check:
  q1_why_might_this_fail: |
    [3-5 plausible failure modes; e.g., friction-bound (DE-042), regime drift (DE-044), n undersampled DATA_INSUFFICIENT, parameter-point fragility (PROV-078), DE-XXX cluster overlap. STANDARD CANDIDATE for any sleeve-deploy strategy: deployment-volume confound (cycle 1 PROV-001 lesson — strategy deploys more $-to-equity than baseline if baseline holds idle cash; require cash-neutral single-budget per NEW_PERM-001).]
  q2_what_evidence_would_change_my_mind: |
    [specific result invalidating q1; e.g., OOS lit-default cell terminal_wealth_excess>=+5% AND n>=100 AND DSR best>=0.30 → friction-bound concern refuted]
  q3_dead_end_proximity_audit: |
    [3 closest existing DEs by mechanism similarity + distinction. If single-DOF away, flag for orchestrator/admin review BEFORE Agent 2 spawn.]
  q4_sample_size_realism: |
    [predict expected n_decisions IS+OOS based on threshold + base rates. If n<100, design as probe pre-registering FAIL_DATA_INSUFFICIENT.]
  q5_parameter_point_fragility_risk: |
    [is core threshold a best-fit point or robust across pre-reg envelope? If best-fit only, flag PROV-078 lineage + pre-register multi-DOF sensitivity envelope.]
```
If HIGH risk identified (q3 weak distinction OR q4 predicted n<100 OR q5 parameter-point fragility): write `ORCHESTRATOR_REVIEW_RECOMMENDED: TRUE` at PROV entry top. Orchestrator surfaces to admin BEFORE Agent 2 spawn.
Rationale: cycle 21f predecessor data showed Agent 1 implicit adversarial reasoning was load-bearing; institutionalize as explicit step (not separate Agent 5 to avoid +33% spawn cost / over-block / negativity bias).
