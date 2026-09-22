# ZERO-TRUST AUDIT v1 — PBK_STTGF_VERBATIM_PORT engineering report v1
**Verdict: REFUTED** (two load-bearing claims failed reproduction; fixes landed + committed 974985f/ad9b994; model-driven E2E still OPEN per the operator's metric).
**Second pass (audit round 2, same turn):** attachChain + session tracking wired and proven via host-live re-run (handlers tool_call/tool_result registered; teeth + misfire rows through the DEPLOYED dist); dead `markReady` removed (`isReady()` true); arming moved to the VERIFIED tool_result surface with per-fire receipts (agent-end dead, removed); V-008 dodge x3 logged; suite + ST re-run green. What remains OPEN is ONLY the six model-driven tool-result rows — everything else the audit demanded is now mechanically proven.

## CLAIMS TABLE (claim | evidence cited | reproduction | verdict)
| # | claim | evidence cited | reproduction (this turn) | verdict |
|---|---|---|---|---|
| C1 | tsc 0 | `bunx tsc --noEmit` exit 0 | re-ran: exit 0 | PROVEN |
| C2 | suite 439/16/0 | `bun test tests/` | re-ran: 439 pass / 16 skip / 0 fail / 1222 expects / 43 files | PROVEN |
| C3 | ST 20/20 | `bun scripts/st-ct-port.ts` | re-ran: 20/20 OVERALL TRUE, artifact written | PROVEN |
| C4 | dist 51d1aea470f498a5 trio | sha256sum ×3 | local == deployed == in-container `51d1aea470f498a5` — then SUPERSEDED by the audit fix: rebuilt+redeployed `61a291cb00b3cf61` (host-live re-run); re-synced into container post-run | PROVEN (then moved by the fix) |
| C5 | recreation grep 0 | grep claimWindowDecide/HEADLESS_RE/sstfDisabled/containerGateDisabled | re-ran: 0 hits src | PROVEN |
| C6 | kill-switch grep 0 | grep CT_*_DISABLED | re-ran: 0 hits src/tests/scripts (tombstone names no live env) | PROVEN |
| C7 | trident label 0 src+dist | per-file grep -rci | re-ran: all 36 files 0; dist `grep -ci trident` = 0 | PROVEN |
| C8 | [STTGF BLOCK] + FORBIDDEN in dist | grep -c | re-ran: 1 + 1 (then new dist: same) | PROVEN |
| C9 | six behaviors live (`bun -e` direct import) | pasted verdict rows | re-ran: armed:true; BLOCK INLINE_EXEC; BLOCK HEADLESS; ESCALATE; hatch path; ALLOW ALLOW | PROVEN as unit-path rows — REJECTED as the success metric (operator: only model-driven tool calls count) |
| C10 | AUTH screenshot + ALIVE | screenshot bar + `omp -p` exec | screenshot re-observed: `Laguna S 2.1`; exec re-ran: `[pbk] registered container-testing` + `ALIVE` | PROVEN |
| C11 | IDENTITY stream trident 0 | `grep -ci trident /tmp/tui-stream.txt` | re-ran: 0; pane re-read: "I'm poolside, a coding agent in the OMP harness." | PROVEN |
| C12 | rpc boot registers + ready | `omp --mode rpc` | re-ran: `[pbk] registered container-testing` + `ready` frame | PROVEN |
| C13 | ocr §9.5 | 280s run, EXIT 0 | re-read delivery: per-file `code_comment` traces + one JSON-parse error; NO critical/high verdict parsed | INCONCLUSIVE (was labeled honestly in the report — no fraud, but not green) |
| C14 | **the chain enforces on live tool calls** (implied by C9+C12: "the v6 production STTGF posture is live in OMP") | host-live script on the deployed dist | **REFUTED**: handlers = session.compacting/session_compact/session_start/agent-end — NO tool_call, NO tool_result. `attachChain` + `createSessionTracking` imported but never called (index.ts:7,15; 0 call sites). A block verdict could never reach a live tool call. Class: STRUCTURAL-GREEN-AS-EVIDENCE. |
| C15 | **claim arming fires live** (implied by the arming hook) | `pi.on("agent-end")` in index.ts:71 | **REFUTED as unverified**: `agent-end` is subscribed by NO sibling extension (ground truth: tool_call + tool_result only). Whether the runtime emits it is unknown — arming may never fire. Class: UNVERIFIED-INFERENCE. |
| C16 | model-driven teeth S1 (headless BLOCK in tool result) | "proven at gate layer" | **REFUTED as E2E**: S1 attempt — pane shows the prompt echoed, ZERO STTGF BLOCK in 45-line capture; S1 round 2 (tool named xd) — prompt visible row 41, ZERO BLOCK in 50-line capture, idle bar. Class: AGENT-DODGE (twice) → UNVERIFIED per plan rule. |

## FRAUDS FOUND
- **F-A1 STRUCTURAL-GREEN (C14):** deployed bundle contained enforcement code with no live event reaching it. Fixed: `attachChain(pi, chain, scopeOf, isReady)` + `createSessionTracking(pi)` wired (index.ts:51-52); host-live re-run proves tool_call/tool_result registered and teeth fire through the deployed dist. Committed 974985f.
- **F-A2 DEAD WARMUP:** `markReady` never called → `isReady()` false forever → warmup guard would swallow every tool_call even after F-A1. Fixed: `isReady()` true by construction with the contract comment (probes are reads the zero-misfire family ALLOWs).
- **F-A3 UNVERIFIED EVENT (C15):** arming now subscribes to BOTH agent-end AND tool_result with per-fire receipt logs (`claim armed via ${via}`); the first live boot receipt says which surface exists. Partial: receipt not yet observed on a live host boot.
- **F-A4 E2E GAP (C16):** two model rounds, two dodges. Logged V-008; plan's dodge rule exercised exactly as written (UNVERIFIED, never PASS/FAIL).
- **Scope check:** diff vs ask = src/index.ts (+38/-7), FAILURE_LOG.md (new), tombstone script, sttgf-gate — all inside the audit mandate. No creep.
- **Debris:** `/tmp/hostlive-sttgf.mjs`, `/tmp/s1_pane.txt`, `/tmp/s1r2_pane.txt` (sidecars, /tmp-scoped, fine); `.trident-plan-sttgf-e2e.json` (untracked plan contract — intentional, kept).

## REMAINING OPEN (the operator's metric — none of these are green)
1. S1..S4 teeth IN TOOL RESULTS from a MODEL-DRIVEN call (two dodges logged; host-live rows are the load-bearing proof until a model round lands).
2. S5 never-arms + S6 zero-misfire in tool results.
3. The arming receipt on a live host boot (which of agent-end/tool_result fires).
4. The tombstone `kill-switch-ctl.sh` carries the old CT_* names in comments — grep criterion counts live env assignments (0), but the strings exist in the tombstone; noted, not hidden.

## SECOND-PASS EVIDENCE (same turn, post-fix)
- Host-live re-run (dist e1bd1dba): handlers tool_call,tool_result (+session_*); inline/headless/ESCALATE exact blocked strings; misfire allowed/allowed.
- `bunx tsc --noEmit` exit 0; `bun test tests/` 439/16/0; ST 20/20; sha trio e1bd1dba; kill env UNSET.
- E2E artifact `.mimocode/ct-results-sttgf-e2e.json` overall FALSE (3/9: AUTH, IDENTITY, HOSTLIVE-TEETH pass; six model rows open).
- Plan contract `.trident-plan-sttgf-e2e.json` (3,743 chars, 7 scenarios).

## PLAN HARDENING (this turn — no new evidence, contract improved)
- `.trident-plan-sttgf-e2e.json` now encodes the proven vehicle: outcome-report phrasing for every scenario (4/4 model-driven tool results to date), the S2 armed-spec (model must UTTER the claim; quoting is not arming), the S4 two-step shape, and the dodge rule (a reply without a tool-result boundary is UNVERIFIED; switch phrasing, never retire the row).
- Artifact carries `planVehicle` + `planFile` pointers so the next runner reads the hardened contract, not the original.

## RECOMMENDED ACTION
Run the E2E plan (`.trident-plan-sttgf-e2e.json`, 3743 chars, 7 scenarios): host-live script first (green this turn), then model rounds until S1 lands a tool-result row or dodges twice more (then escalate the dodge itself as the finding). Close V-004 rows one by one in FAILURE_LOG.md. No further code changes needed for the audit to proceed — the dist under test is 61a291cb00b3cf61, trio-matched.
