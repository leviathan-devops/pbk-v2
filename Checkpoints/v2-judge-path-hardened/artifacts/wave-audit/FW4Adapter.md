# wave FW4Adapter audit — 2026-09-21T06:05

| file:line | WHAT (on disk?) | WHY | VERDICT |
|---|---|---|---|
| `src/ext/kernel-judge.ts` (746L) | EXISTS | the L1 per-edit judge: INJECTABLE `opts.judge`, a LOGGED skip when the key is absent, an 8000ms timeout, the 2-act caps | **CORRECT** |
| `tests/bands.test.ts` (503L) | EXISTS | adversarial-first (a no-key run is never a silent pass), then the threshold edges and the cap | **CORRECT** |

## mechanical re-run (MY runs, after the V-023 revert)
```
bunx tsc --noEmit                     -> exit 0
cd tests && bun test . -t bands-edge  -> 4 skip / 0 fail / 61 expect() / 23 tests
cd tests && bun test .                -> 4 skip / 0 fail / 512 expect() / 170 tests / 14 files
```

## the abort (recorded as correct behaviour)
The front aborted its own job after seeing 2 failures in its SIBLING's `tests/v022.test.ts` — failures
THIS runner created mid-flight, before its rewrite. It honoured the isolation rule instead of editing
another front's file. Recorded as the law working.

## verdicts
both files **CORRECT**. No unlisted changes. The adapter does not reference the absent `isAgentOrigin`.
