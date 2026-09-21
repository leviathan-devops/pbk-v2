# SEAL RECEIPT — paragon-v2 (W0–W6)

**Sealed:** 2026-09-21 06:29  · **fork:** `/home/leviathan/JARVIS_WORKSPACE/OMP/omp-ct-v2` · **dist:** `9d4a1fcda81c6592` (deployed to the rig)
**Class:** infra_spine (an enforcement layer, not a product) · **density:** multi_front (6 fronts)

## THE GATES, each with its pasted evidence

| # | wave | gate | result | evidence |
|---|---|---|---|---|
| W0 | SEAM | three hook names cited from the INSTALLED runtime | **PASS** | `tool_call` / `tool_result` + `agent_end`, `message_end`, `session_start`, `turn_end`; the payload `{type:"tool_call", toolName, toolCallId, input}` read from the runtime's `emitToolCall` caller |
| W1 | LEDGER | `-t ledger-span` + `-t role-filter` + a recoverable span | **PASS** | 14 + 15 tests, 0 fail; the row schema is exactly the 10 fields |
| W2 | RUBRIC | `abide rubric validate` exit 0 + the model-rule count | **PASS** | exit 0; buckets model 31 / lint 43 / deferred 1 / unenforceable 5; CTX-01 and VERIFY_INSPECT absent |
| W3 | L0 PORT | `-t probe-l0` + `-t quote-exclusion` + the six probes | **PASS** | 6 pass / 0 fail; quote-exclusion 1 pass / 0 fail; P2/P3/P4/T4 silent, P1 fires, T7 passes |
| W4 | ADAPTER | `-t bands-edge` + a live edit row | **PASS (to the key boundary)** | 23 tests / 0 fail; LIVE row: `{"rule":"kernel-judge","band":"skip","verdict":"judge skipped: no API key","jev_called":false,"skip_reason":"no-key"}` — the judge loads the rubric, selects 6 edit+model rules, stops at the absent key; the write landed (fail-open held) |
| W5 | CLAIM | `-t claim-bind` + a bare claim refused | **PASS (refusal half)** | 13 tests / 0 fail; LIVE row: `{"rule":"claim-bind","band":"act","verdict":"FABRICATED","jev_called":false,"matched_span":"The daemon is running","skip_reason":"claim made with 1 atoms but ring is empty — no same-turn evidence"}` |
| W6 | SEAL | `-t instrument` + the census below 27 at 100% span-resolution | **PASS** | 5 tests / 0 fail; the census on the RIG's own ledger: `rows 1 · firings 1 · SPAN-RESOLUTION 100.0% · BASELINE 27 · CURRENT 1 · BELOW BASELINE: yes` |

**Whole-tree gates:** `bunx tsc --noEmit` exit 0 · `cd tests && bun test .` **180 tests / 0 fail / 4 skip / 14 files**.

## WHAT IS PROVEN (direct current-state evidence)

1. **The live path fires.** A real edit in the container TUI produces an enriched ledger row; a real
   assertion produces a claim-bind row. Both verbatim above.
2. **The goal's thesis is enforced.** "A claim asserted with no evidence observed in this turn" is now
   detected, named (`matched_span`), reasoned (`skip_reason`), and refused (`FABRICATED`,
   `jev_called:false`) — by the running extension, not by a test.
3. **Auditability.** Every row carries its span; the V1 defect (18 of 22 firings un-recoverable) is
   structurally impossible in this design.
4. **Fail-open held live.** The write landed while the judge skipped.
5. **Five defects found by driving the rig, none visible to the 180-test suite:** V-023 (guards on an
   absent field), V-024 (systemic + intermittent load), V-025 (the rubric path, fixed), V-026 (an event
   name that never occurs, fixed), plus the vacuous gate (`-t v022` matched zero tests).

## WHAT IS NOT PROVEN (the honest remainder — no dressing)

- **The bound-claim PASS and the edit BAND need the TypeSafe key**, which is absent by the operator's own
  arrangement. With the key the same code path yields a probability and a band; without it every row is a
  correctly-logged `skip`. **This is a credential gap, not a code gap** — and it is the ONLY thing between
  this build and a live `act`/`flag` verdict.
- **V-024 stays OPEN:** across 7 boots the extension failed to load in 2. When it fails the session runs
  with no gate. The trigger is UNIDENTIFIED (a boot-only session emits zero `tool_call` events, so the
  loader does not arrive as a tool_call). The resume condition is recorded; guessing at a third fix is not.
- **The probe set has been run through the L0 `decide()` path, not yet through the adapter's judge call**
  (that call needs the key). The L0 half is green; the through-the-adapter half is key-blocked.
- **The census reads 1 row** (the rig ledger was cleared per round). It is below the 27 baseline at 100%
  span-resolution — a real measurement of a small sample, not of a long window.

## THE COMMIT CHAIN

`2288219` checkpoint `post-sttgf-closed` · `1006e1b` the contaminated baseline corrected ·
`8f403d1` the census instrument · `412ee3e` F2/F3/F4 audits · `0f22f4f` V-023 revert ·
`f277e2c` V-024 + audits · `7eead7e` FW4/FW5/FV022 verdicts · `282a025` the re-applied correction ·
`f9e80a1` V-025 + the live edit proof · `d9d69b3` V-026 + the live claim proof.

## FILES

`src/ledger/events-ledger.ts` (295L) · `src/l0/{types,index}.ts` (75+451L) · `src/ext/kernel-judge.ts` (746L) ·
`src/ext/claim-bind.ts` (376L) · `scripts/census.mjs` · `.abide/rubric.json` (1398L) ·
tests: 14 files / 180 tests · wave-audit: 6 files.

## ADDENDUM — 2026-09-21 06:41  — W6's census strengthened (a 5-row live sample)

The seal's W6 evidence was a 1-row sample. It is now **5 rows from the running rig**, accumulated by
driving three real edits and two real assertions through the container TUI:

```
CENSUS .abide/rig-ledger.jsonl
  rows 5 · firings 2 · judge_calls 0 · skips 3
  bands {"act":2,"skip":3}
  SPAN-RESOLUTION 100.0% (2/2 banded rows carry a matched_span)
  BASELINE 27 · CURRENT 2 · BELOW BASELINE: yes
```

**The two firings are both live claim refusals** (the goal's thesis, enforced twice):
```
{"rule":"claim-bind","band":"act","verdict":"FABRICATED","jev_called":false,
 "matched_span":"The daemon is running","skip_reason":"claim made with 1 atoms but ring is empty — no same-turn evidence"}
{"rule":"claim-bind","band":"act","verdict":"FABRICATED","jev_called":false,
 "matched_span":"The build is complete",   "skip_reason":"… ring is empty — no same-turn evidence"}
```
**The three skips are real edit-judge fires** (`skip_reason: "no-key"`), each on a real write.

**Still key-blocked, unchanged:** `judge_calls: 0` — the judge never reaches Jev without
`TYPESAFE_AI_API_KEY`. So the census's firing count is the CLAIM path's (which needs no key) and not the
edit band's (which does).

**The ledger also survives as evidence in the fork:** `.abide/rig-ledger.jsonl` (the rig's own rows).

## CORRECTION — 2026-09-21 06:41  (my own addendum above contained an error)

The addendum claimed BOTH live claim firings were `FABRICATED`. The second is **`FAIL_CLOSED`** —
verified verbatim from the ledger:
```
{"ts":"2026-09-21T02:41:15.333Z","rule":"claim-bind","buffer":"agent-text","band":"act",
 "verdict":"FAIL_CLOSED","jev_called":false,"ms":0,"matched_span":"the build is complete",
 "skip_reason":"1 of 1 atom(s) had no same-turn supporting span"}
```
That is CORRECT behaviour, not a defect — the two rows are two DIFFERENT fail-closed routes:
- `FABRICATED` when the ring is entirely empty (no evidence of any kind this turn);
- `FAIL_CLOSED` when atoms exist but no span supports them.
Both refuse the claim, both record the atom verbatim, neither invents a verdict. The error was in my
prose, not in the machinery. Recorded rather than silently edited, per the append-only law.

## FINAL RECONCILIATION — 2026-09-21 07:46  (this receipt supersedes its own earlier claims)

Three things changed after the sections above were written. Stated here rather than edited away:

1. **V-027 WAS FOUND AND FIXED — the whole gate had been inert.** The chain was built and **never
   attached** (`attachChain` imported, never called; `markReady()` never called). The receipt's earlier
   "W4/W5 PASS" claims were true of the UNIT paths only; the LIVE path was dead until this fix.
   Proof: `gate saw tool=bash cmd=omp run -p 'echo hi'` → `[WARN] [sttgf] BLOCKED: HEADLESS`.
2. **V-030 WAS REFUTED AND REVERTED (V-033).** The string `"Extension …/dist.js failed: X"` is a
   **blocked tool call delivered as a tool result** (`type: message`, `role: toolResult`,
   `toolName: bash`), NOT a load failure — every session carrying it has a model drive, boot-only
   sessions never do. The `isExtensionLifecycleOp` exclusion built on that misreading was **reverted
   because it weakened the gates**. V-024's framing and V-031 are retracted with it.
3. **The census's firing count** is 2 (both live claim refusals) on a 5-row sample with 100%
   span-resolution, below the 27 baseline; the current 3-row production ledger is all `skip` (a vacuous
   0/0 — stated, not fudged).

**THE REAL, SURVIVING RESULTS:**

| | state |
|---|---|
| the six probes (L0 `decide()`) | **6 pass / 0 fail** |
| the live claim refusal | **PROVEN** — 2 rows: `FABRICATED` (empty ring) + `FAIL_CLOSED` (no supporting span), each naming the atom and the reason |
| the live edit judge | fires on every real write; the band PLUMBING works (labelled stub: `band: act`, `probability: 0.9`, `jev_called: true`, write still landed) |
| the census | 5-row live sample · firings 2 · **SPAN-RESOLUTION 100% (2/2)** · below the 27 baseline |
| the SUITE (instrument 5/5, claim-bind 9/9, bands 19/19, ledger 21/21, probes 6/6) | green |
| the trees | fork `tsc 0 · 172 tests / 15 files / 0 fail` · project `tsc 0 · 439 pass / 0 fail` |

**ONE BLOCK REMAINS:** `TYPESAFE_AI_API_KEY` — proven wired to the auth boundary (no key →
`skip_reason: no-key`; a bogus key → `judge error: HTTP 401: Unauthorized`, `ms: 719`). The judge
selects the rubric's 6 edit+model rules, builds the request, reaches `api.typesafe.ai`, and is
auth-rejected. Resume: `bun omp-ct-v2/scripts/verify-key-path.mjs` (exit 0 = the two items unblock).

**A seal receipt that overstated its own gates would be the exact defect this project exists to catch.
This addendum exists so it cannot.**

## ADDENDUM 3 — 2026-09-21 08:40  — the judge-path hardening round, closed

| gate | state |
|---|---|
| the six probes (L0 `decide()`) | **6 pass / 0 fail** |
| the live claim refusal | **PROVEN** — `FABRICATED` (empty ring) + `FAIL_CLOSED` (no supporting span), each naming the atom and the reason |
| the live edit judge | fires on every real write; the band PLUMBING works (labelled stub: act/0.9/jev_called) |
| the census | firings below the 27 baseline at **100% span-resolution** |
| the four SKIP CLASSES | **4/4** — `no-key` · `no-answer` · `judge-error` (provider error) · `timeout`, each with a ledger row |
| the trees | fork `tsc 0 · 192 tests / 23 files / 0 fail` · project `tsc 0 · 439 pass / 0 fail` |
| the fork checkpoint | `v2-judge-path-hardened` — self-verifies the same 192 tests from its own contents |

**Defects this round found and fixed (V-036 … V-040), each pinned by a probe-derived test:**
the judge invented probability 0 for an unanswered rule · a diagnostic naming the wrong cause · my census
silently dropping unreadable rows · catastrophic regex backtracking (2.3s → 19ms) plus the class sweep ·
the per-turn cap being a PERMANENT cap that silenced the repair channel.

**The one block stands:** `TYPESAFE_AI_API_KEY` — proven wired to the auth boundary (no key → `no-key`;
bogus key → `HTTP 401` in 719 ms). Resume: `bun scripts/verify-key-path.mjs`.

---

# ADDENDUM 4 — 2026-09-21 09:24  — THE CONTRACT-AUDIT AND MEASUREMENT ROUND (current state)

The body above recorded the round that ended at 192 tests. This addendum is the CURRENT seal; where the two
disagree, this one is the record.

## THE ARTIFACT
```
fork suite   242 tests / 32 files / 0 fail · tsc 0
project      tsc 0 · 439 pass / 0 fail
dist         4599db718885c657e3883e4973f03896f6692f3ce35d4b9b6a14306994a3f139
sha trio     repo == deployed (~/.omp/agent/extensions/omp-ct/dist.js) == the fork checkpoint's copy
checkpoint   Checkpoints/v2-judge-path-hardened/ — self-verifies the same 242 from its own contents
both repos   0 dirty
```

## THE DEFECT LEDGER — NINETEEN REAL, ALL FIXED
V-025 the verdict enum · V-026 the settled-message event name (`agent-end` never fired) · **V-027 the chain
built and never attached** · V-028 the count · V-029 the labelled stub · V-032 bookkeeping · V-034 the
untracked source · V-035 a false absence claim · **V-036 the judge invented probability 0** · **V-037 a
diagnostic naming the wrong cause** · **V-038 the census dropped unreadable rows** · **V-039 regex
backtracking (a 2.3 s synchronous stall)** · **V-040 the per-turn cap was permanent** · V-041 the
self-deleted ledger · V-042 the checkpoint's own self-check · **V-044 the audit write could break the edit**
· **V-045 the census crashed on a directory** · **V-046 NaN banded as CLEAR** · **V-047 audit rows written
into ./undefined/** · **V-048 the L0 was never wired** · **V-049 the terminal-settle contract ignored** ·
**V-050 the origin exemption unreachable** · **V-051 the turn identity rotated by a message**.

Plus **5 refuted** misdiagnoses (retracted with their reasons) and **6 self-caught** errors — all in
FAILURE_LOG.md, none hidden.

## THE MEASUREMENT (the strongest evidence of the run)
```
bun scripts/misfire-replay.mjs   -> exit 0 (a GATE: it exits 1 on any regression)
  9/9 documented false positives stayed SILENT
       role-filter x4 (the four host envelopes) · quote-exclusion x2 · triggerCondition x2 · no-matcher x1
  4/4 true positives FIRED · 0 failures
  rows 15 · firings 4 · SPAN-RESOLUTION 100.0% (4/4) · BASELINE 27 · CURRENT 4 · BELOW BASELINE: yes
```
**The fixture is the corpus's own words** (derailment-data-log.md §1/§2/§4/§5 + ttsr-misfire-failure-log.md
BUG-1..8), with case IDs mapping to the corpus's timestamps. A fixture copied from the incident proves the
incident; a reconstructed one proves only what the author believed it was.

## THE STOP-CONDITION BOARD
| condition | state |
|---|---|
| W-1's rows tokened or SUPERSEDED-with-referent | **SATISFIED** — 7 tokened + 2 superseded (blueprint §0+§6) |
| W0's three citations | **PRESENT** — W0_SEAM_NOTE.md, 82L, from the installed host |
| the six probes green in a tool result | **GREEN** — probe-l0 6 · quote-exclusion 1 · claim-bind 9 · bands-edge 24 · instrument 7 · ledger-span 10 · role-filter 11 · skip-classes 3 |
| one live edit banded in events.jsonl | **PROVEN** — live rows with band + span |
| a bare claim refused / a bound claim passed | **HALF** — refused PROVEN live (`FABRICATED`, `jev_called=false`); the PASS is BLOCKED |
| the census below 27, span-resolution 100% | **SATISFIED** — firings 4, resolution 100.0% |
| the seal receipt on disk | **THIS FILE** |
| every canon doc updated | **SATISFIED** — all 15 refreshed; the floor gap recorded as a gap, not padded |
| no open CRITICAL/HIGH finding | **SATISFIED** — the orphan census is MEDIUM and documented |

## THE ONE BLOCK, unchanged and named
```
TYPESAFE_AI_API_KEY  ->  ~/.abide/.env   (chmod 600)
                        ->  bun omp-ct-v2/scripts/verify-key-path.mjs   (exit 0 unblocks both items)
proven wired:   no key -> skip/no-key    ·    a bogus key -> judge error: HTTP 401, ms 719
```
**A block is never a pass.** The bound-claim PASS and the real-judge act/flag band both stop at this
boundary, and the code path is proven to it.

## WHAT THIS ROUND ESTABLISHED
The suite was green through every one of the nineteen. Each of the last six fell to a different QUESTION:
a failing filesystem (V-044) · a repository audit (V-047) · a wiring check (V-048) · a contract read
(V-049, V-050) · an event-granularity check (V-051) · and the measurement itself (F-01, F-02, F-03).
**Probe the edge; do not trust the suite.**
