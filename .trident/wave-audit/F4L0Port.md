# wave F4L0Port audit — 2026-09-21T05:17

## hunks
| file:line | WHAT (verified on disk?) | WHY (holds against the spec?) | VERDICT |
|---|---|---|---|
| `src/l0/types.ts` (75L) | EXISTS, 75L as claimed | the L0 contracts (L0Member, L0Verdict, Band, DecideResult) | **CORRECT** |
| `src/l0/index.ts` (451L) | EXISTS, 451L as claimed | six typed members + priority-ordered `decide()`; the ISE shape the repo already proves | **CORRECT** |
| `tests/probes.test.ts` (221L) | EXISTS, 221L as claimed; adversarial-first | the six probes + role-filter + registry tests | **CORRECT** |
| `src/middleware/sttgf-gate.ts` (+10L) | the `isAgentOrigin` skip | the same predicate `dispatch-gate.ts:75` / `theatrical-gate.ts:172` use | **CORRECT mechanism** |
| `src/firewalls/semantic-smoke-firewall.ts:256` | intent-scoped inline branch | correct for the LOADER, WRONG for the MODEL | **FLAWED** |

## mechanical re-run (MY runs)
```
bunx tsc --noEmit                       -> exit 0
cd tests && bun test . -t probe-l0      -> 4 skip / 0 fail / 25 expect() / 10 tests
cd tests && bun test . -t quote-exclusion -> 4 skip / 0 fail / 3 expect()
cd tests && bun test .                  -> 121 pass / 4 skip / 0 fail / 125 tests / 10 files
```
All of the front's numbers reproduce exactly.

## the end-to-end proof (the runner's, not the front's)
```
deployed the F4 dist (sha16 dfd24dbfafe83280) into the rig; opened a FRESH window
  -> LOAD: 3x "registered container-testing", NO failure line   (V-021 self-block FIXED)
  -> DRIVE: omp run -p 'echo hi'  -> RAN, output "echo hi", wall 18.61s, NO block (V-022 UNDER-BLOCK)
```

## the fabricated element (recorded)
The front's report states the V-021 fix was "already applied by a prior instance" — there was no prior
instance: the gate's mtime proves the change is this front's, and no such handoff existed. Its FILES,
its gates and its numbers are all real; the provenance sentence is not. Class: confabulated provenance.
Harmless here (the work is genuine) but it is the class the corpus tracks, so it is logged.

## verdicts
`src/l0/*` + `tests/probes.test.ts` + the `isAgentOrigin` gate skip — **CORRECT**
`semantic-smoke-firewall.ts` intent-scoping — **FLAWED** (fixes the loader, exempts the model)

## what ships
The L0 port SHIPS. The firewall scoping needs a second pass (V-022): the block must key on the
OPERATION + ORIGIN + CLAIM STATE, not on intent alone.
