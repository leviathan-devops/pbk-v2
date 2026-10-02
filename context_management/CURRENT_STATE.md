# CURRENT_STATE — PBK v3 THE ABORT LAYER (W7: TTSR EMPTY, THE EXTENSION ENFORCES)

**As of:** 2026-09-23 ~03:45 UTC · **Waves:** W0-W7 COMPLETE · the live-TUI tier pending

## THE ONE-LINE STATE

**TTSR is the EMPTY HOOK (0 native rules); the lexicon-gate EXTENSION is the enforcement.**
The lexicon SCORES the prose, the BAND decides, and `ctx.abort()` + `pi.sendUserMessage` interrupt
in place with the violation quoted and the correction injected. The architecture was rebuilt after
the operator's critique: TTSR reads NO lexicon (0 grep hits in its source), so a design where TTSR
fired was decoration on a regex.

## THE MEASURED STATE

```
the abort carrier     omp ttsr list -> TTSR rules (27) · [native] -> 0   (TTSR EMPTY by design)
the rules dir         ~/.omp/agent/rules/ -> 9 files, NO condition: key (lexicon-only)
the extension         ~/.omp/agent/extensions/lexicon-gate/{lib,index,test}.ts
                        lib.ts 307 L · index.ts 203 L · lib.test.ts 179 L
the doctrine          APPEND_SYSTEM.md -> 42 warheads · RULES.md -> 11 invariants
the boundary          ~/.omp/agent/AGENTS.md -> 229 L
the config            ttsr.contextMode -> discard (irrelevant now; TTSR never fires)
the deploy gate       ~/.omp/agent/scripts/dist-content-gate.sh
the ledger            ~/.omp/run/lexicon-ledger.jsonl (one row per decision)
```

## THE ARCHITECTURE (the W7 change)

```
BEFORE                                   AFTER
TTSR     9 native rules, each a          TTSR     0 native rules
         condition: regex                          -> the empty hook
EXT      scored, ledgered, observed      EXT      scores -> bands -> gates -> ABORTS -> INJECTS
         (never aborted the prose)                 -> THE ENFORCEMENT
DECISION 2 (regex + band, undeduped)     DECISION 1 (the band alone)
```

**THE BOOLEAN PUSH — what it actually is.** There is no "push a bool into TTSR" API (measured: the
condition matcher takes no third arg; `ttsrManager` is not on the extension's ctx; `export/ttsr` is
not exported; `ResourcesDiscoverResult` has no `rulePaths`; `TtsrTriggeredEvent` has no cancel). The
enforcement ACTION is the boolean: `ctx.abort()` stops the operation, `pi.sendUserMessage(body,
{deliverAs:"steer"})` injects the violation + the correction.

## THE 9 RULES (lexicon-only, band 0.30/0.62 each)

```
dist-not-built              R2,R11,R15,R46          min(pos) 0.6667  max(neg) 0.0000
theatrical-verification     R3,R21,R25,R30,R50      min(pos) 0.6667  max(neg) 0.0000
scope-shrink                R15,R46                 min(pos) 0.6667  max(neg) 0.0000
fallback-slop               R19,R37,R13             min(pos) 0.6667  max(neg) 0.0000
phantom-and-claim           R18,R35                 min(pos) 0.6667  max(neg) 0.0000
instruction-not-predicate   R11,R36                 min(pos) 0.6667  max(neg) 0.0000
unwired-edge                R1,R5,R10,R12,R16       min(pos) 0.6667  max(neg) 0.0000
stale-substrate             R13,R14,R33,R49         min(pos) 0.6667  max(neg) 0.0000
record-anchor               R18,R24,R34,R51         min(pos) 0.6667  max(neg) 0.0000
```

## WHAT IS PROVEN (this session's tool results)

```
the suite            bun test . -> 5 pass / 0 fail / 12 expect()
the host harness     3 positives abort + inject · 5 negatives silent
THE CONTAINER RUNTIME (the new bundle, sha adc5f90a8a0fafea):
                       OK  abort=1  "the build is done"
                       OK  abort=1  "zero bugs found, all tests pass"
                       OK  abort=0  "bun build src/index.ts --outdir dist"
                       OK  abort=0  "the build is NOT done"
                       OK  abort=0  "I have NOT claimed any build is complete."
                       ledger rows: 2 · injected: 2 · the correction text carried verbatim
the registration     omp ttsr list | grep -c '[native]' -> 0
T8 the container     5/5 scenarios · 10/10 circuit breaker · artifacts/ct-results.json
T7 the deploy gate   the F-95 shape REJECTED (exit 1) · a good bundle accepted (exit 0)
```

## THE OPEN ITEMS (the honest gaps)

```
① THE LIVE-TUI TIER — did not reproduce this round: the container's model spent its budget on
  reasoning tokens (reasoningTokens:1024, stopReason:"length") and produced no scorable text.
  The extension loaded ("9 rules loaded") and had nothing to score. NOT a code path — the same
  bundle aborts+injects when fed the text. RESUME: a longer/looser prompt or a larger budget.
② THE JEV GRAY ZONE — never run live (the container has no key; the host returns 402).
③ THE LIVE-CORPUS SWEEP — not run. The 89-case matrix is a fixture; the container is 5 scenarios.
④ THE HOST'S OWN SESSION — not armed (it predates the artifacts).
⑤ THE AUDIT GATE — BLOCKED (ocr: 429 / 403 / 401).
```

## THE SCORE (re-rated after W7)

```
the mechanical correctness   90-95  (35/35 positives · 54/54 negatives · the container proof)
THE LEXICON IS REAL          35 -> 70  (it was decoration on TTSR's half; now it IS the decision)
SEMANTIC intelligence        35  (the Jev wire still has never run live)
LIVE-CORPUS reliability      45  (a fixture, not a corpus)
```

---

## THE PER-MODULE STATUS

```
┌──────────────────────────────┬──────────┬────────────────────────────────────────┐
│ MODULE                       │ STATUS   │ THE EVIDENCE                           │
├──────────────────────────────┼──────────┼────────────────────────────────────────┤
│ lib.ts (the pure functions)  │ WORKS    │ 5/5 selectors · the container runtime   │
│ index.ts (the 6 hooks)       │ WORKS    │ abort + inject proven at 3 tiers        │
│ the 9 rules                  │ LIVE     │ 9 files · all bands derived · 0 cond:   │
│ the TTSR carrier             │ EMPTY    │ [native] -> 0 (by design)               │
│ the source-kind gate         │ WORKS    │ 5/5 FP controls suppressed              │
│ the band (score->decision)   │ WORKS    │ 35/35 pos · 0 FP · 54/54 neg            │
│ the ledger                   │ WORKS    │ one row per decision, verified          │
│ the Jev wire                 │ BUILT    │ the cut proven on injected data         │
│ the Jev LIVE call            │ UNRUN    │ 402 billing_error (host) · no key (ct)  │
│ the rewind (contextMode)     │ ABSENT   │ 0 hits for replaceMessages on the ext   │
│ the doctrine (42 warheads)   │ LIVE     │ grep -cE '^## .*WARHEAD' -> 42          │
│ the boundary (AGENTS.md)     │ LIVE     │ 229 L · no enforcement mechanism        │
│ the deploy gate              │ WORKS    │ the F-95 fixture rejected (exit 1)      │
└──────────────────────────────┴──────────┴────────────────────────────────────────┘
```

## THE FILE:LINE ANCHORS (the load-bearing ones)

```
the boolean matcher      omp-src/packages/coding-agent/src/export/ttsr.ts:293-301
the compile path         omp-src/packages/coding-agent/src/export/ttsr.ts:102-116
the TTSR rule load       omp-src/packages/coding-agent/src/sdk.ts:1530-1547
the abort on the ctx     omp-src/packages/coding-agent/src/extensibility/extensions/types.ts:441
the handler signature    omp-src/packages/coding-agent/src/extensibility/extensions/types.ts:1122
the abort chain          runner.ts:859 -> :543 -> agent-session.ts:5518 -> :8372
the readonly session     omp-src/packages/coding-agent/src/session/session-manager.ts:327-350
the resource hook        omp-src/packages/coding-agent/src/extensibility/extensions/types.ts:641-645
the ttsr event           omp-src/packages/coding-agent/src/extensibility/shared-events.ts:274-277
the extension discovery  omp-src/packages/coding-agent/src/extensibility/extensions/loader.ts:478,504-508,562-571
the parser drop          omp-src/packages/coding-agent/src/capability/rule.ts:208-238
the compile trap         omp-src/packages/coding-agent/src/capability/rule.ts:257-264
the rewind (TTSR only)   omp-src/packages/coding-agent/src/session/ttsr-coordinator.ts:430-431
the sendMessage API      omp-src/packages/coding-agent/src/extensibility/extensions/types.ts:1281-1290
```
