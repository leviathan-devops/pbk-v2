# COMPACTION_SURVIVAL

## THE READ ORDER AFTER COMPACTION

```
1  CURRENT_STATE.md          the one-screen state + the 9-rule table
2  NEXT_STEPS.md             the open item (the restart) + the exact command + the protocol
3  EVIDENCE_STATE.md         the proof chain + the honest gaps
4  DECISION_CHAIN.md         D101-D108
5  BUILD_STATE.md            the artifacts + the commands
6  RUNNING_BUILD_LOG.md      the chronological build record
7  RUNNING_DEBUG_LOG.md      the chronological debug record
```

## THE SURVIVAL FACTS

```
S1  THE GOAL'S PRIMARY CONDITION IS MET: `omp ttsr list | grep -c '[native]'` -> 9.
S2  THE SUITE IS GREEN: bun test ~/.omp/agent/extensions/lexicon-gate/ -> 4 pass / 0 fail.
S3  THE MATRIX IS CLEAN: 35/35 positives · 0 FP · 54/54 negatives (via `omp ttsr test`).
S4  THE ONLY OPEN ITEM IS THE OPERATOR RESTART (T5/T6). Everything else is proven.
S5  T4's live call is BLOCKED on TypeSafe credits (402). The wire SHAPE is proven.
S6  THE 9 RULES + THE EXTENSION LIVE OUTSIDE THIS REPO, in ~/.omp/agent/.
    A fresh session reads the PATHS in AGENTS.md, never a copy inside pbk-v2.
```

## THE ANTI-DERAIL (this tree's nouns)

```
1  THE RULES-DIR VANISH   it has emptied 3x historically. Post-write: ls -A | wc -l, re-check at 60s.
2  THE STALE BUNDLE       never trust a deploy's mtime; grep the bundle for a symbol THIS build added.
3  THE INERT ASSET        a rule outside ~/.omp/agent/rules is NOT live.
4  THE UNBOUND CARRIER    TTSR binds at SESSION CONSTRUCTION. A write without a restart is not armed.
5  THE CONFIG REWRITE     the omp-ct-ext-guard timer rewrites config.yml's extensions array
                          every 2 min — but NOT the ttsr: block (verified by reading the guard).
6  THE SELF-TRIGGER       a rule body matching its own condition loops forever. The zero-hit
                          pre-land test is mandatory (all 9 clean).
7  THE HEADLESS TRAP      `omp -p` is BLOCKED by the STTGF gate ("Headless exec forbidden. Use TUI.").
                          The TUI restart is the only live-observation path.
```
