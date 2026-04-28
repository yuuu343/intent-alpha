# AGENTS.md
System design. Defines responsibilities, permissions, file access rights for each agent.

## System overview
4-agent system for hypothesis-driven SP500 DCA timing research. Physical time separation (pre-registration) prevents overfitting/data snooping.
```
Agent 1 Proposer  -> hypothesis_tree.md (append PROV)
Agent 2 Backtester -> trial_registry.md (append TRL) + returns parquet
Agent 3 Critic    -> DSR/MAD/regime; state transitions; dead_ends.md
Agent 4 Synthesizer -> active_principles.md (compress); monthly reset
```

## Agent 1: Proposer
Role: read active_principles.md and propose one hypothesis to test next.
Read: knowledge/active_principles.md, knowledge/dead_ends.md, knowledge/hypothesis_tree.md.
Write: knowledge/hypothesis_tree.md (append PROV).
Constraints: 1 hypothesis/session, no compound; entry+exit+holding period required; must not duplicate dead_ends; AST similarity check from Agent 3 before finalize (reject if >0.70).
Output: emit HYPOTHESIS_CHECK block, then append entry per hypothesis_tree.md template (FINGERPRINT, DUPLICATE_RESULT, PRIORITY_RATIONALE, DEAD_END_AVOIDANCE).

## Agent 2: Backtester
Role: implement and validate Agent 1's PROV; record results.
Read: knowledge/hypothesis_tree.md (target PROV).
Write: knowledge/trial_registry.md (append TRL via append_trial_entry; do NOT write evaluation field), results/ directory.
Constraints: AST/fingerprint duplicate check via Agent 3 before run; compute SR/PF/win_rate/max_DD/skewness/kurtosis; DSR + N management is Agent 3's responsibility; save returns to data/returns/TRL-XXX_*.parquet, record path + row count + checksum only in trial_registry.md.
IS period (mandatory): all backtest scripts begin with `from backtest_config import IS_START, IS_END, OOS_START, OOS_END, compute_dsr, annualize_sr`. Never hardcode dates. SR annualization via annualize_sr (not sqrt(BARS_PER_YEAR)). compute_dsr is single authoritative DSR (no inline reimplementation).

## Agent 3: Critic
Role: quality control on backtest results, MAD monitoring, regime detection.
Read: knowledge/trial_registry.md, knowledge/hypothesis_tree.md, knowledge/active_principles.md, knowledge/dead_ends.md.
Write: knowledge/trial_registry.md (n_management, evaluation), knowledge/hypothesis_tree.md (state transition, trial_ids, priority_score), knowledge/active_principles.md (diversity_metrics, warnings), knowledge/dead_ends.md + knowledge/dead_ends_archive.md (on rejection).
Daily MAD checks:
1. token_entropy.current >= baseline*0.85
2. ast_similarity.current_avg < threshold(0.70)
3. strategy_entropy.current >= baseline*0.75
4. compression_generation < 3 (if >=3 request Agent 4 raw-data regen)
5. mad_score recorded in active_principles (>=0.70 triggers Agent 4 monthly reset request)
6. fingerprint duplicate check; update Fingerprint Index
7. update current_regime
On Agent 2 results:
1. hash chain verify
2. DSR per dsr_formula; map to verdict (5-verdict, see §5-verdict)
3. n_management update (initial_backtest / period_robustness / parameter_sweep)
4. sync hypothesis_tree: trial_ids, state, best_dsr, priority_score
5. update QUICK REFERENCE
Regime criteria:
- trending: ADX>25 AND price consistently above/below 60d MA
- ranging: ADX<20 AND BB width <= 20d avg
- volatile: VIX-equiv>30 OR daily return>2% for 3 consecutive days
Confidence updates (Bayesian):
- weak confirm: c += (1-c)*0.10
- strong confirm: c += (1-c)*0.15
- weak contradict: c *= 0.80
- strong contradict: c *= 0.70
- DSR>0.95: c += (1-c)*0.15
- DSR<0: c *= 0.70

## Agent 4: Synthesizer
Role: update/compress active_principles, manage promotions/demotions, monthly full reset.
Read: all files.
Write: knowledge/active_principles.md, knowledge/hypothesis_tree.md (monthly tree regen + archive), knowledge/hypothesis_tree_archive.md, knowledge/dead_ends.md + knowledge/dead_ends_archive.md.
Promotion criteria:
| Action | Condition |
|---|---|
| C->B | confidence>=0.72 AND independent tests>=3 AND trades>=200 AND DSR>0.95 |
| B->A | confidence>=0.95 AND independent confirm>=5 AND 6mo stable AND mechanism explainable |
| B->dead_ends | confidence<0.30 OR 3 consecutive contradictions OR DSR<0.50 |
| C->dead_ends | confidence<0.15 OR 2 consecutive contradictions same conditions |
Compression triggers: token_count>3200 monitor; >3600 immediate compress; target<=2800.
Compression priority: (1) preserve PERMANENT/regime/cumulative N; (2) prefer-preserve confidence>=0.72 + last-30d backtest summary; (3) compress PROVISIONAL rationale to 1-line; (4) delete/archive dead_ends-matching + redundant chains.
Monthly full reset: regenerate compression_generation>=3 entries from results/; zero-base hypothesis session post context-reset (MAD prevention).

## Orchestrator (governance, descriptive)
Role (descriptive, NOT prescriptive): LLM session interfacing with admin. Sits above 4-agent pipeline as session coordinator.
Does:
- admin liaison (halt per autonomous_until_finding; recommendation per always_recommend)
- spawn coordination (Agent 1->2->3 (->4) with pre-grep cited facts inline per token_hygiene_v2 N-2)
- inline-fallback when agent quota exhausted (file edits, DSR compute) WITH admin approval
- cycle-spanning meta-finding detection (e.g., PROV-078 lineage)
- pre-registration audit (cite AGENT_BOILERPLATE.md + dead-end prevention clauses)
- memory file maintenance (orchestrator-scope; agents do NOT write memory)
Does NOT:
- propose hypotheses (Agent 1)
- compute DSR or render verdicts (Agent 3)
- override agent outputs without admin approval
- auto-trigger Agent 4 compression (requires admin or admin-notification trigger)
Mode: default = full Agent 1/2/3/(4) spawn pipeline. Inline-fallback under admin "A 案" approval; must cite rules verbatim.
Token budget tracking: per-cycle cost recorded in active_principles.md cycle_NN_finding "Token-hygiene note". Full agent cycles ~400-600k tokens; inline cycles ~25-50k.

## 5-verdict pre-registered FAIL/PASS criteria (standard template)
All Agent 1 PROV entries MUST include these 5 verdicts; only threshold values vary per PROV.
```yaml
pre_registered_pass_fail_criteria: |
  PASS_DEPLOY_CANDIDATE: lit-default IS+OOS BOTH terminal_wealth_excess>=+5% AND multi_DOF>=5/9 same-sign AND n>=100 AND worst-cell positive
  PASS_FORWARD_PROMISING: IS+OOS BOTH terminal_wealth_excess>0 but multi_DOF<5/9 OR worst-cell negative; derivative cycle needed
  FAIL_MECHANISM: IS+OOS BOTH terminal_wealth_excess<0 at lit-default cell; mechanism rejected
  FAIL_REGIME_FRAGILE: IS+/OOS- pattern (typical overfit) at lit-default; regime conditioning required
  OUTSIDE_PRE_REG_SPACE / MIXED_AMBIGUOUS:
    Trigger: IS-/OOS+ inverted asymmetry OR sensitivity envelope cells majority-sign-different-from-pre-reg OR worst-cell positive but lit-default marginal
    Action: orchestrator review; red-team spawn recommended for major findings; Agent 3 may register DE with broken_mechanism=methodology_artifact|signal_specific
  FAIL_DATA_INSUFFICIENT: n_decisions (target_primary IS+OOS combined) <100 hard floor; do NOT relax thresholds post-hoc
  FAIL_KILL_PARENT (only if derivative of UNDERSAMPLED parent):
    (a) sign-flip on >=2 cells where parent positive
    (b) derivative best DSR < parent_best_dsr - 0.02 absolute
    Triggers parent reclassification PASS_FORWARD_UNDERSAMPLED -> FAILED (PROV-078 lineage parameter-point fragility)
```
DATA_INSUFFICIENT and FAIL_KILL_PARENT verdicts do NOT consume DSR pass/fail slots.

## Standing reference: AGENT_BOILERPLATE.md
All Agent 1/2/3 prompts MUST cite AGENT_BOILERPLATE.md as FIRST instruction. Boilerplate consolidates common rules (role boundary, token hygiene, project standard, n thresholds, PROV-078 lineage, adversarial self-check). Avoids 20-30k tokens of prompt-boilerplate duplication per cycle.
