# COMPACTION_SURVIVAL

## THE READ ORDER AFTER COMPACTION

```
1  CURRENT_STATE.md          the one-screen state + the per-module table + the score
2  NEXT_STEPS.md             the open items (the Jev live call is #1) + the exact commands
3  DECISION_CHAIN.md         D101-D111 (D109 = TTSR EMPTY, D110 = the capability-claim lesson)
4  EVIDENCE_STATE.md         the proof chain + the honest gaps
5  BUILD_STATE.md            the SHA chain + the module inventory + the rebuild recipe
6  RUNNING_BUILD_LOG.md      the chronological record
7  RUNNING_DEBUG_LOG.md      the chronological debug record
```

## THE SURVIVAL FACTS

```
S1  TTSR IS EMPTY BY DESIGN: omp ttsr list | grep -c '[native]' -> 0.
S2  THE EXTENSION IS THE ENFORCEMENT: message_update -> band -> ctx.abort() + inject.
S3  THE SUITE IS GREEN: 5 pass / 0 fail.
S4  THE CONTAINER-RUNTIME PROOF: 2 positives abort+inject, 3 negatives silent.
S5  THE ONE OPEN SUCCESS CONDITION (the operator's words): THE JEV LAYER MUST RUN. It has never.
S6  THE ARTIFACTS LIVE OUTSIDE THE REPO in ~/.omp/agent/. A fresh session reads the PATHS in
    AGENTS.md, never a copy inside pbk-v2.
S7  THE REWIND IS UNAVAILABLE to an extension — accepted by the operator.
```

## THE ANTI-DERAIL (this tree's nouns)

```
1  THE RULES-DIR VANISH     it emptied 3x historically. Post-write: ls -A | wc -l, re-check at 60s.
2  THE STALE BUNDLE         never trust a deploy's mtime; grep the bundle for a symbol THIS build
                            added (the dist-content-gate.sh).
3  THE INERT ASSET          a rule outside ~/.omp/agent/rules is NOT read by the extension's loader.
4  THE UNBOUND CARRIER      TTSR binds at SESSION CONSTRUCTION. The EXTENSION loads at session start.
5  THE CONFIG REWRITE       omp-ct-ext-guard.timer rewrites the extensions array every 2 min —
                            but NOT the ttsr: block (verified by reading the guard).
6  THE SELF-TRIGGER         a rule body matching its own condition loops forever. The zero-hit test.
7  THE HEADLESS TRAP        omp -p is BLOCKED by the STTGF gate. The TUI is the only live path.
8  THE DOUBLE-DECISION      the pre-W7 defect: two carriers firing on one line. Fixed by emptying
                            TTSR. NEVER reintroduce a second decision-maker.
9  THE CAPABILITY CLAIM     a limit asserted in a comment is a HYPOTHESIS. Grep the source.
```

## THE RESUME POINT (exactly where the build is)

```
DONE      W0-W7. The extension enforces; TTSR is empty; the container proves it.
OPEN      the Jev live call (the operator's only success condition)
OPEN      the live-TUI tier (a model-output condition, not a code path)
OPEN      the live-corpus sweep (the precision number that matters)
```
