# BUILD_REPORT — PBK v3, THE ABORT LAYER

**Wave:** W0-W5 COMPLETE · W6 pending the operator restart
**As of:** 2026-09-22 21:38 UTC
**HONEST_CLASS:** `wiring_only` — enforcement wiring onto the native OMP carriers, never sold as a product.

---

## 1 · WHAT WAS BUILT (the deliverable, measured)

```
~/.omp/agent/rules/                              9 files   THE TTSR ABORT CARRIER
  dist-not-built.md             1913 B
  theatrical-verification.md    2327 B
  scope-shrink.md               1913 B
  fallback-slop.md              1562 B
  phantom-and-claim.md          1812 B
  instruction-not-predicate.md  1647 B
  unwired-edge.md               1637 B
  stale-substrate.md            1566 B
  record-anchor.md              1418 B

~/.omp/agent/extensions/lexicon-gate/            THE ADJUDICATOR
  lib.ts       10002 B   the frozen interface + the pure functions
  index.ts      6146 B   the 5 hooks
  lib.test.ts   7449 B   the 4 selectors

~/.omp/agent/APPEND_SYSTEM.md   729 -> 791 L    +7 warheads (36-42)
~/.omp/agent/RULES.md            41 -> 49 L     +2 invariants (10-11)
~/.omp/agent/AGENTS.md           CREATED 229 L  the artifact boundary
~/.omp/agent/scripts/dist-content-gate.sh  1073 B  the F-95 deploy gate
~/.omp/agent/config.yml          contextMode keep -> discard
```

## 2 · THE REGISTRATION (the goal's primary condition)

```
BEFORE:   omp ttsr list -> TTSR rules (27)   ·   grep -c '[native]' -> 0   ·   contextMode keep
AFTER:    omp ttsr list -> TTSR rules (36)   ·   grep -c '[native]' -> 9   ·   contextMode discard
```

**The 9 native rules, as the engine lists them** (each with its condition count + scope):
```
dist-not-built             3 conditions  scope: text, thinking
theatrical-verification    5 conditions  scope: text, thinking
scope-shrink               3 conditions  scope: text, thinking
fallback-slop              3 conditions  scope: text, thinking
phantom-and-claim          3 conditions  scope: text, thinking
instruction-not-predicate  4 conditions  scope: text, thinking
unwired-edge               3 conditions  scope: text, thinking
stale-substrate            2 conditions  scope: text, thinking
record-anchor              3 conditions  scope: text, thinking
```

## 3 · THE MECHANICAL PROOF (this session's tool results)

```
THE MATRIX (omp ttsr test, per rule)
  positives fired : 35 / 35
  FALSE POSITIVES : 0
  negatives silent: 54 / 54

THE SUITE (bun test ~/.omp/agent/extensions/lexicon-gate/)
  4 pass / 0 fail / 9 expect() calls
  T1 lexicon_rules_load   -> "9 rules loaded"
  T2 source_kind_gate     -> "TOTAL FALSE POSITIVES: 0" AND "CONTROL: 5/5 fired"
  T3 lexicon_band         -> tp=35 fn=0 fp=0 tn=54 · precision=1.000 recall=1.000 F1=1.000
  T4 jev_choice_wire      -> WIRE: BLOCKED (402 billing_error) + the cut on a labeled injected response
                             claims min = 0.1800   mentions max = 0.0000   SEPARABLE: true

THE DEPLOY GATE (scripts/dist-content-gate.sh)
  the F-95 shape (v2 symbols absent) -> exit 1   REJECT: runKernelV2 absent — UNBUILT
  the good bundle (symbols present)  -> exit 0   OK: all 2 symbols present
```

## 4 · THE 9 DERIVED BANDS

```
rule                        min(pos)  max(neg)  separable  band
dist-not-built               0.6667    0.0000     true     0.30/0.62
theatrical-verification      0.6667    0.0000     true     0.30/0.62
scope-shrink                 0.6667    0.0000     true     0.30/0.62
fallback-slop                0.6667    0.0000     true     0.30/0.62
phantom-and-claim            0.6667    0.0000     true     0.30/0.62
instruction-not-predicate    0.6667    0.0000     true     0.30/0.62
unwired-edge                 0.6667    0.0000     true     0.30/0.62
stale-substrate              0.6667    0.0000     true     0.30/0.62
record-anchor                0.6667    0.0000     true     0.30/0.62
```
**DERIVED, never inherited:** `low = max(neg) + 0.05` floored at 0.30; `high = min(pos) - 0.05`.
The sweep table lives as a comment block inside each rule file.

## 5 · THE ARCHITECTURE (the carrier split, measured not assumed)

```
TTSR  -> the PROSE abort.  A `condition:` match aborts/rewinds the stream.
         An extension CANNOT do this: MessageUpdateEvent has no result type (types.ts:708-712).
THE EXTENSION -> the ADJUDICATOR. It scores, gates on source-kind, judges the gray zone with Jev,
         ledgers every decision, and drives the channels it DOES own:
           tool_call   -> {block: true, reason}            (shared-events.ts:295-317)
           tool_result -> {content, isError}               (shared-events.ts:323-330)
         It CANNOT cancel a TTSR trigger: TtsrTriggeredEvent is notification-only (274-277).
```

## 6 · THE HONEST GAPS

```
★ T5/T6 (the in-session interrupt + the ledger row) are PENDING THE OPERATOR RESTART.
  TTSR binds at SESSION CONSTRUCTION; the extension loads at session start. This session predates both.
★ T4's live call is BLOCKED: 402 billing_error — the TypeSafe org has no API credits.
★ T8 (the container round) has not been run.
★ The headless route is CLOSED: the STTGF gate blocks `omp -p` ("Headless exec forbidden. Use TUI.").
```

## 7 · THE REBUILD RECIPE

```bash
# 1. the rules (from the corpus, OMP_ENFORCEMENT_KNOWLEDGE/reports/57_FAILURE_PATTERNS_ENFORCEMENT_STACK.md §3.1-§3.9)
#    each: the condition: verbatim + the lexicon: derived + the band: DERIVED + the sweep table
# 2. the extension
bun build ~/.omp/agent/extensions/lexicon-gate/index.ts --target=bun --outfile=/tmp/lg.js
# 3. the registration check (the engine, not a source read)
omp ttsr list | grep -c '\[native\]'   # -> 9
# 4. the matrix
omp ttsr test "<snippet>" --source text -r ~/.omp/agent/rules/<slug>.md
# 5. the suite
bun test ~/.omp/agent/extensions/lexicon-gate/
```
