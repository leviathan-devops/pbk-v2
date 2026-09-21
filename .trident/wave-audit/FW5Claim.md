# wave FW5Claim audit — 2026-09-21T06:05

| file:line | WHAT (on disk?) | WHY | VERDICT |
|---|---|---|---|
| `src/ext/claim-bind.ts` (376L) | EXISTS | the five verdicts, `FABRICATED` + `jev_called:false` on an empty ring, the injectable judge, this-turn-only spans | **CORRECT** |
| `tests/bind.test.ts` (305L) | EXISTS; the first three tests are all FAIL CASE | proves a bare claim with an empty ring is FABRICATED with NO judge call | **CORRECT** |

## mechanical re-run (MY runs)
```
cd tests && bun test . -t claim-bind -> 4 skip / 0 fail / 61 expect() / 13 tests
cd tests && bun test .               -> 4 skip / 0 fail / 460 expect() / 160 tests (at landing)
```
Mechanism verified by READING, not by claim: the verdict union is exactly
`PASS | REJECT | FAIL_CLOSED | FABRICATED | WRONG_SPAN` (`claim-bind.ts:12`); the judge type documents
"null -> FAIL_CLOSED, never a pass" (`:65-69`).

## verdicts
both files **CORRECT**.
