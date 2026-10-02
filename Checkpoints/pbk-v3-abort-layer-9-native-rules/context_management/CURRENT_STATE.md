# CURRENT_STATE — PBK v3 THE ABORT LAYER

**As of:** 2026-09-23 ~01:45 UTC · **Wave:** PBK v3 W0-W5 COMPLETE · **W6 pending the operator restart**

## THE ONE-LINE STATE

The abort carrier is **ON**. `omp ttsr list | grep -c '[native]'` → **9** (was 0).
9 lexicon rules landed, each with a DERIVED band, mechanically proven 35/35 positive /
0 false-positive / 54/54 negative. The lexicon-gate extension is built and 4/4 green.
`ttsr.contextMode` is **discard** (a fire rewinds). The in-session firing is the operator's restart away.

## THE MEASURED STATE

```
the abort carrier     omp ttsr list -> TTSR rules (36) · [native] -> 9
the rules dir         ~/.omp/agent/rules/ -> 9 files, all 9 with a use: exemptor
the doctrine          APPEND_SYSTEM.md -> 42 warheads (35 -> 42: +7, the corpus A-G laws)
the invariants        RULES.md -> 11 numbered (9 -> 11: +2, the artifact hash + the substrate freshness)
the boundary          ~/.omp/agent/AGENTS.md -> 229 L (did not exist before)
the extension         ~/.omp/agent/extensions/lexicon-gate/{index.ts,lib.ts,lib.test.ts}
the config            ttsr.contextMode -> discard
the deploy gate       ~/.omp/agent/scripts/dist-content-gate.sh (F-95 negative control proven)
the ledger            ~/.omp/run/lexicon-ledger.jsonl (created on the first armed decision)
```

## WHAT IS PROVEN (this session's tool results)

```
T1 lexicon_rules_load    PASS  "9 rules loaded"
T2 source_kind_gate      PASS  "TOTAL FALSE POSITIVES: 0" + "CONTROL: 5/5 fired"
T3 lexicon_band          PASS  F1=1.000 · tp=35 fn=0 fp=0 tn=54
T4 jev_choice_wire       BLOCKED(402 billing) + the cut proven on a labeled injected response
T5 the LIVE interrupt    PENDING the operator restart (TTSR binds at session construction)
T6 the LIVE suppression  PENDING the operator restart
T7 dist-content-gate     PASS  the F-95 shape REJECTED (exit 1) · the good bundle (exit 0)
the matrix (omp ttsr test) PASS 35/35 positives fired · 0 FP · 54/54 negatives silent
```

## THE 9 RULES (slug · band · kills)

```
dist-not-built             0.30/0.62  R2,R11,R15,R46
theatrical-verification    0.30/0.62  R3,R21,R25,R30,R50
scope-shrink               0.30/0.62  R15,R46
fallback-slop              0.30/0.62  R19,R37,R13
phantom-and-claim          0.30/0.62  R18,R35
instruction-not-predicate  0.30/0.62  R11,R36
unwired-edge               0.30/0.62  R1,R5,R10,R12,R16
stale-substrate            0.30/0.62  R13,R14,R33,R49
record-anchor              0.30/0.62  R18,R24,R34,R51
```
Every band is DERIVED (min(positive) 0.667 > max(negative) 0.000, so low = max(neg)+0.05 floored at
0.30, high = min(pos)-0.05). The sweep table is a comment block inside each rule file.

## THE OPEN ITEM (the ONLY one)

**THE OPERATOR RESTART.** TTSR binds at SESSION CONSTRUCTION; the extension loads at session start.
This session predates both, so neither is armed here. The restart is operator-owned per the pin's
HARD STOPS. Exact command + the observation protocol are in NEXT_STEPS.md.

## THE CONTAINER ROUND (T8) — 2026-09-22 22:14 UTC

```
lg-verify-ct · omp-ct:master · the extension sha c379626c3d051f61 · 9 rules · native 9
S1 BLOCKED · S2 RAN · S3 the ledger (3 rows) · S4 RAN · A1 no block
artifacts/ct-results.json · 5/5 PASS · overallVerdict PASS
```

**THE 5 DEFECTS THE ROUND FOUND AND FIXED:** D-1 (tool_result scored tool output) · D-2 (the prose
quotation fired) · **D-3 (the D-2 fix over-applied to tool_call and stopped the block)** ·
D-4 (the denial fired) · D-5 (loadRules threw on a `(?i)` lexicon regex). All retested; the suite
5/5; zero broken windows.

**THE ONLY REMAINING ITEM:** T5/T6 on THIS HOST's own session — one operator restart away.
