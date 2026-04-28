# Dead hypotheses archive
Hypotheses rejected by the Critic. Used by Agent 1 (proximity check) and Agent 3
(duplicate / cool-off enforcement).

Format: one block per rejected hypothesis.

```
id: PROV-<NNN>
company: <slug>
rejected_at: <YYYY-MM-DD>
critic_verdict: FAIL_<reason>
hypothesis: <verbatim>
mechanism_summary: <one line>
cool_off_until: <YYYY-MM-DD, default rejected_at + 90d>
```

---
<!-- entries below this line, newest at bottom -->
