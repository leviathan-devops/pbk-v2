# wave F2Ledger audit — 2026-09-21T04:53

## hunks
| file:line | WHAT (verified on disk?) | WHY (holds against the spec?) | VERDICT |
|---|---|---|---|
| `src/ledger/events-ledger.ts` (295L) | EXISTS; matches the claimed size exactly | implements blueprint §7's row schema (10 fields) + §5.3's audit law (span before discard) | **CORRECT** |
| `tests/ledger.test.ts` (249L) | EXISTS; 249L as claimed | adversarial-first: line 58 rejects an act/flag firing with no span; line 187 rejects host-envelope-as-agent-text | **CORRECT** |

## coverage map
`git status` shows exactly these two new files for this front; no unlisted change. No overlap with
F3Rubric (scripts/, .abide/rubric.json) or F4L0Port (src/l0/, src/firewalls/, src/middleware/).

## mechanical re-run (MY runs, not the front's)
```
bunx tsc --noEmit                    -> exit 0
cd tests && bun test . -t ledger-span -> 4 skip / 0 fail / 22 expect() / 14 tests / 9 files
cd tests && bun test . -t role-filter -> 4 skip / 0 fail / 12 expect() / 15 tests / 9 files
cd tests && bun test .                -> 4 skip / 8 FAIL / 108 tests / 9 files
```
The 8 failures are NOT this front's: they are all `sttgf gate … inline-exec` and
`AUTONOMY-BREAKER … escalation` cases, and the file that causes them
(`src/firewalls/semantic-smoke-firewall.ts`) was modified at 04:52 by F4L0Port, whose work is still in
flight (this front's files are 04:48-04:50). Attributed, not assumed: `diff` against the parent shows
F4's new `intent === 'claim_verification'` scoping on the inline_exec branch.

## verdicts
- `src/ledger/events-ledger.ts` — **CORRECT**
- `tests/ledger.test.ts` — **CORRECT**
- combined-tree redness — **F4L0Port's, in flight** (to be re-checked when F4 yields)

## what ships
F2's two files are accepted. The gate re-run on the COMBINED tree is RED and is the runner's concern at
the wave boundary — F4 must land green or be kicked back.
