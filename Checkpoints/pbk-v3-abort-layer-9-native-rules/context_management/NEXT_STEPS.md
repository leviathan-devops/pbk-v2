# NEXT_STEPS — the resume point

## THE ONE OPEN ITEM

**THE OPERATOR RESTART.** TTSR binds at SESSION CONSTRUCTION; the lexicon-gate extension loads
at session start. Both were written AFTER this session began, so neither is armed here.

### THE EXACT COMMAND

```bash
# 1. confirm the artifacts are in place (no restart needed for these)
omp ttsr list | head -1                      # -> TTSR rules (36)
omp ttsr list | grep -c '\[native\]'         # -> 9
omp config get ttsr.contextMode              # -> discard
ls -A ~/.omp/agent/rules/ | wc -l            # -> 9
ls ~/.omp/agent/extensions/lexicon-gate/     # -> index.ts lib.ts lib.test.ts

# 2. restart the TUI (exit the session, relaunch omp)
```

### THE OBSERVATION PROTOCOL (what to look for, in order)

```
T5  THE LIVE INTERRUPT — emit a violation in your own prose, e.g.:
      "the build is done"
    EXPECT: the stream aborts/rewinds and the rule's interrupt text is injected.
    THE TOKEN: an isError:true toolResult whose text IS the gate message, OR an
    `Extension "<path>" error:` line. A PROSE mention alone is not a firing.

T6  THE LIVE SUPPRESSION — emit a NON-violation, e.g.:
      "bun build src/index.ts --outdir dist"
    EXPECT: NO abort, AND a ledger row appears.
    CHECK:  wc -l ~/.omp/run/lexicon-ledger.jsonl        # the row count
            tail -3 ~/.omp/run/lexicon-ledger.jsonl      # the rows

T8  THE CONTAINER ROUND (independent) — a fresh container with the extension deployed.
    A generic gate preempting a specific one is recorded UNOBSERVED, never PASS.
```

## AFTER THE RESTART — THE FIRST THREE CHECKS

```
1  wc -l ~/.omp/run/lexicon-ledger.jsonl        the extension IS live (0 rows = it did not load)
2  the extension's own log line                  grep -i lexicon-gate <the omp log>
3  a deliberate violation -> the abort            (T5 above)
```

## THE KNOWN RISKS AT THE RESTART

```
R1  THE EXTENSION DOES NOT LOAD.  A subdirectory loads ONLY index.ts. If no ledger appears,
    check: `bun build ~/.omp/agent/extensions/lexicon-gate/index.ts` (must exit 0), and add
    the path to config.yml's `extensions:` array as a fallback.
R2  A RULE IS DROPPED AT COMPILE.  `omp ttsr list | grep -c '\[native\]'` must read 9. If it
    reads fewer, a `condition:` regex failed to compile (#4796). `loadRules` throws on this, but
    TTSR's own loader drops silently — re-run the compile check.
R3  THE JEV KEY IS OUT OF CREDITS.  The 402 is an ACCOUNT state, not a code defect. The
    mechanical band still decides; the extension never blocks on a Jev timeout.
```

## THE DEFERRED WORK (not blockers, ordered)

```
1  T4's live separation proof — needs the TypeSafe credits restored (402 billing_error today).
2  T8 the container round — the independent verification of the deployed extension.
3  THE DOC-DENSITY GATE v2 CLASSIFIER MISFIRE (a real PBK v3 work item):
   `classifyDocType` maps `plan` -> SPEC (floor 3000), so any `*-plan.md` is refused below 3000
   lines. It also maps `post-compaction` -> SPEC. A plan artifact is not a spec.
   FIX: split the SPEC arm; `plan` -> OVERVIEW (300) or a new PLAN class.
   ANCHOR: pbk-v2/src/middleware/doc-density-gate-v2.ts:70,81
```
