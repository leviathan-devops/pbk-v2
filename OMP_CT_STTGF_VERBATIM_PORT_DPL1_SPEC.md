# BUILD SPEC ARTIFACT — OMP_CT_STTGF_VERBATIM_PORT (the v6 production STTGF posture, ported verbatim)
- **Target:** `/home/leviathan/JARVIS_WORKSPACE/OMP/trident-omp` (branch `jarvis/omp-main`)
- **Generated:** 2026-09-20 UTC
- **Status:** PLANNING (awaiting operator rulings D-2/D-3; D-1 resolved)
- **Artifact Type:** BUILD_SPEC (Layer 1 Prompt)
- **Discovery:** ENABLED — two read-only E1 scout waves completed (`agent://V6SttgfWiring`, `agent://OmpDeltaSurface`) + first-hand reads of every anchor cited below + ripwire CLI v0.6.0 (`--callers=checkSmokeTestFirewall` on v6: `defs="1" count="0"` — engine floor on the 3939L hooks file, disclosed; grep is ground truth).
- **Authority source:** PWM checkpoint `CLEAN-STABLE-SHIP-APPROVED` (`/home/leviathan/OPENCODE_WORKSPACE/Shared Workspace Context/Trident_Agent/Active_Projects/v4.4.2-paragon-wave-manager/Checkpoints/CLEAN-STABLE-SHIP-APPROVED`) — the production-assembled v6.

## THE OPERATOR LAW (verbatim)
- "THIS NEEDS TO BE PORTED INTO OMP VERBATIM DIRECTLY EXACTLY HOW IT FUCKING WORKS. I LOOPED THIS 3 FUCKING TIMES. WHY IS IT NOT DONE."
- "THE ONLY DIFFERENCE IS INSTEAD OF SSTF YOU PORT STTGF. THE EVOLVED VERSION. SAME FUCKING SHAPES."
- "I AM NOT TOLERATING ANY REGEX FUCKING SLOP RECREATIONS. ... LITERALLY COPY FUCKING PASTE INTO THE OMP MIDDLEWARE, ADAPT ONLY THE HOOK SURFACES. PERIOD. NOTHING ELSE. ANYTHING ELSE IS EXPLICITLY FORBIDDEN."
- The v6 production posture (the mandate box): STTGF default ON · `verb=headless` → BLOCK "Use TUI." · inline-exec → BLOCK "Use container." · claim without container artifact → mutate/demand · sanctioned path = headed TUI in container · kill-switch NOT left UNSET (v6 has NO kill-switch at all).

## §1 PROBLEM STATEMENT
The OMP port carried three generations of recreations (middleware/sstf.ts → inline `claimWindowDecide` → `HEADLESS_RE`) instead of the verbatim v6 wiring, invented two env kill-switches v6 never had (both defaulting the gates INERT), and never ported the claim-arming hook — so the enforcement is structurally dead on the live host. The production posture (always-on STTGF, throw-based blocking, escalation at 3, container-test escape hatch) must land VERBATIM with only the four hook-surface adaptations.

## §2 FORENSIC LEDGER (what derailed — all evidence first-hand or scout-confirmed this session)
| # | Derailment | Evidence |
|---|---|---|
| D1 | Port INVENTED kill-switches v6 never has; both default inert | OMP claim-gate.ts:93-97 `sstfDisabled()` unset→true; container-gate.ts:103-106; PWM v6 `grep -rn "SSTF_DISABLED\|STTGF_DISABLED\|TRIDENT_FIREWALL" src` = **0 hits**; FIREWALL_CONFIG default enabled:true (semantic-smoke-firewall.ts:463) |
| D2 | Live path was a reimplementation; verbatim file tree-shaken | old sstf.ts header "Port of :13-19,:86-147,:179-281"; `checkSmokeTestFirewall:0` occurrences in the former 14.53MB dist |
| D3 | Claim arming never ported — gate structurally dead | v6 arms via isCompletionClaim at trident-hooks.ts:1050 (text.complete) AND :3743-3745 (messages.transform); OMP `grep setVerificationClaimed src` = only inside the verbatim file; `markClaim()` called by nothing in src |
| D4 | Headless family dropped by agent fiat | claim-gate.ts:42-44 "the headless class is empty in omp"; :45 HEADLESS_RE matches only `opencode run/exec` |
| D5 | Loop-2 bolted a SECOND recreation to keep reimpl tests green | `claimWindowDecide` claim-gate.ts:53-73 (git -S: birth 0df67a8) — fix-to-broken-test class |
| D6 | Escalation + hatch re-derived as parallel local state | v6 sttgfStateTracker.incrementBlockCount/ESCALATE at :2511-2515, hatch at :2526-2552; OMP has its own local VerificationStateTracker (300s window) the verbatim tracker never sees |
| D7 | Success redefined at spec time (inert was a legal finish) | CT_PORT spec item 15 operator-gated the flip; goal legal-stop allowed UNSET |
| D8 | Loop-3 measured (2/9) and reported instead of fixing | the distance report |
Root cause: recreations survived because tests enshrined them and the inert default made every divergence invisible at runtime.

## §3 THE TARGET (v6 production wiring — every anchor verified)
- **Enforcement surface (the ONLY one — operator ruling 2026-08-03 quoted at trident-hooks.ts:1020-1023):** `tool.execute.before` THROW errors.
- **The STTGF call block** `trident-hooks.ts:2473-2555`:
  - `await checkSmokeTestFirewall({toolName, sessionId, agentName, mode, args, commandStr, signals, verificationState, contextWindow})` :2479-2489
  - BLOCK → `throw new Error('[STTGF BLOCK] ${category}\n\n${reason}\n\nSmoke tests are FORBIDDEN. Use trident-container-test.')` :2496-2500
  - catch → `sttgfStateTracker.incrementBlockCount(sid)` :2511; `getBlockCount(sid) >= 3` → `throw '[STTGF ESCALATE] ... Running container test is MANDATORY.'` :2513-2515; rethrow :2520
  - WARN → log only :2502-2504
- **Escape hatch** :2526-2555: `toolName === 'trident-container-test'` && `action in {setup,run,suite,deploy}` → `setContainerTestRan(sid,true)` + `setVerificationClaimed(sid,false)` + theatrical subject-aware hatch :2539-2549.
- **Claim arming (non-fatal triggers, both lexicon-gated):** `isCompletionClaim` :1008-1018 (CLAIM_WORD_RE + negation + strong-phrase + work-entity + audit-remedy exemptor) → `setVerificationClaimed(sid,true,text:200)` at :1050 (text.complete textCompleteHook :1030-1052) and :3743-3745 (messages.transform). A tool result NEVER arms a claim (the 2026-08-08 fix, quoted :1036-1048).
- **Verb families (verbatim regexes):** headless `/\bopencode[\s-]+run\b/i` :205 → BLOCK 'Headless exec forbidden. Use TUI.' :252-253; inline_exec `/\b(node|bun)[\s]+(?:-[ex]\b|--eval\b|--print\b|--evaluate\b)/i` + `/\bnpx\s+-e\b/i` :208 → BLOCK 'Inline exec is smoke test. Use container.' :255-256; hash/existence BLOCK when smoke_verification; build/inspect_bundle claim-gated.
- **State:** ONE state machine — `sttgfStateTracker` (VerificationStateTracker :320-441) projected from the evidence machine `getEvidenceState(sid)` :339-358 (claim/container/dist_change events; verificationClaimed = latest claim after lastContainerAt).
- **Kill-switch: NONE.** grep 0 hits. FIREWALL_CONFIG enabled:true :463.

## §4 THE MERGE PLAN
**DELETE (grep must reach 0):**
- claim-gate.ts: local VerificationStateTracker :8-37 · sstfDisabled() :93-97 · claimWindowDecide + INLINE_EXEC_RE :53-73 · HEADLESS_RE + isHeadless :45-51 · the dual-path claimGate() :99-133
- container-gate.ts: containerGateDisabled() :103-107 (gate itself stays — CT exec verb firewall is separate machinery)
- firewalls/headless-gate.ts: ENTIRE module :1-61 (its job IS classifyVerb's headless verb; v6 BLOCK string wins over HEADLESS_WARHEAD)
- envs CT_SSTF_DISABLED / CT_GATE_DISABLED everywhere (src + tests + scripts)

**LAND VERBATIM (copy-paste):**
- The wiring block trident-hooks.ts:2473-2555 → `src/middleware/sttgf-gate.ts` (byte-for-byte logic; the four adaptations below)
- isCompletionClaim + CLAIM_*_RE lexicons :1008-1018 (both regex constants and the function)
- The arming hook :1030-1052 → wired onto OMP's message-end event
- semantic-smoke-firewall.ts: ALREADY byte-identical in-tree (cmp-proven) — only its EXPORTS get imported now (checkSmokeTestFirewall, sttgfStateTracker, getFirewallConfig)

**ADAPT — HOOK SURFACES ONLY (the complete list; ANYTHING ELSE IS FORBIDDEN):**
1. opencode `tool.execute.before` THROW → OMP BeforeGate returning `{action:'block', gate:'sttgf', reason: <exact [STTGF BLOCK] string>}`; chain.runBefore already throws StructuredBlockError (chain.ts:72-84)
2. opencode `text.complete` + `messages.transform` arming triggers → the OMP message-end event (types/omp.d.ts; D-1 resolved — both v6 surfaces map onto it, same lexicon, one arm)
3. sessionAgent/currentMode/commandStr sourcing → OmpExtensionContext + input.command
4. `'trident-container-test'` toolName → `'container-testing'` in the hatch + BLOCK string (D-3, pending operator confirm)

## §5 SCOPE (waves)
W1 DELETE+LAND: remove the seven recreation sites; create sttgf-gate.ts (:2473-2555 verbatim + adaptations 1/3/4); wire chain to sttgfGate; delete headless-gate.ts + its imports (index.ts:14, container-testing.ts:26 → STTGF path). Gate: tsc 0, grep-recreation==0.
W2 ARMING+HATCH: port isCompletionClaim + lexicons + the arming hook onto OMP message-end; escape hatch fires inside sttgf-gate on container-testing setup/run/suite/deploy. Gate: grep setVerificationClaimed == 3 sites (arm, hatch-clear, def); claims arm from a completed-message fixture.
W3 SWITCH REMOVAL: delete CT_SSTF_DISABLED/CT_GATE_DISABLED + kill-switch-ctl.sh + st-ct-port ARM/DISARM of those envs; gates are unconditional (v6 posture). Gate: grep CT_*_DISABLED == 0 across src+tests+scripts.
W4 TESTS TO THE v6 CONTRACT: rewrite enshrining tests (fixtures = v6 semantics: `[STTGF BLOCK]` tokens, escalation via sttgfStateTracker.getBlockCount>=3, arming via isCompletionClaim, negation fixtures stay); ST battery token update. Gate: suite 0 fail; ST green.
W5 CONTAINER SUITE: AUTH first (poolside bar live) → teeth (headless BLOCK, inline-exec BLOCK, claim-demand) → zero-misfire negative family → Phase E 10 → artifact overall:true. Zero-broken-windows re-runs + checkpoint per saving-checkpoints SOP.

## §6 SUCCESS CRITERIA (all command-checkable)
1. `grep -rc 'claimWindowDecide\|HEADLESS_RE\|sstfDisabled\|containerGateDisabled\|CT_SSTF_DISABLED\|CT_GATE_DISABLED' src tests scripts` == 0
2. `grep -c 'STTGF BLOCK' dist/index.js` >= 1 and `grep -c 'Smoke tests are FORBIDDEN' dist/index.js` >= 1
3. `grep -rn 'setVerificationClaimed' src` == exactly 3 hits (arm, hatch-clear, definition)
4. `grep -rn 'sttgfStateTracker' src` — imported by sttgf-gate + the arming hook
5. `bunx tsc --noEmit` exit 0; `bun run build` exit 0; `bun test tests/` 0 fail
6. ST battery green with `[STTGF BLOCK]`-family tokens
7. Container suite: `[STTGF BLOCK]` observed in a TOOL RESULT (never agent prose); negative family zero-misfire; Phase E 10/10; `.mimocode/ct-results.json` overall:true
8. No env var can disable the gate (criterion 1 proves the switches are gone)

## §7 ANTI-PATTERN LEDGER
- A1 REGEX RECREATION of any v6 shape (the operator's explicit ban) — detection: criteria 1+2; any new local verb/intent regex outside semantic-smoke-firewall.ts = FAIL.
- A2 PARALLEL STATE — any tracker besides sttgfStateTracker — detection: criterion 4 + grep 'VerificationStateTracker' appears only inside the verbatim file.
- A3 NEW KILL-SWITCH — any env/config gate on sttgfGate — detection: criterion 1; read of sttgf-gate.ts shows no env read.
- A4 TOKEN REWORDING — v6 strings verbatim (`[STTGF BLOCK] ${category}`, 'Smoke tests are FORBIDDEN. Use container-test.', '[STTGF ESCALATE]', 'Headless exec forbidden. Use TUI.', 'Inline exec is smoke test. Use container.') — detection: dist grep of each string.
- A5 SCOPE CREEP — edits outside the four adaptations — detection: git diff touches only sttgf-gate.ts (NEW), the DELETE sites, index.ts wiring, tests/scripts token updates.
- A6 TESTS-TO-REIMPL (the D5 loop) — tests assert v6 fixtures, never port behavior — detection: review of rewritten tests cites v6 anchors.
- A7 MESSAGE-SURFACE MUTATION — arming is a non-fatal trigger ONLY; no mutation of chat text (the 2026-08-03 ruling quoted at :1020-1023) — detection: the arming hook returns void; grep shows no content rewrite.
- A8 THEATRICAL PASS — passToken in agent prose = CIRCULAR=FAIL — detection: container artifact toolResultContext fields.

## §8 OPEN DECISIONS
- **D-1 RESOLVED (scouts):** both v6 arming surfaces (text.complete :1030-1052 + messages.transform :3738-3745) map onto the OMP message-end event in types/omp.d.ts — same lexicon, one arm.
- **D-2 PENDING (operator):** add `-p|--print` to the headless verb regex — a 1-line delta to the verbatim classifyVerb (v6 blocks `run` only). Needs explicit order because it touches the verbatim file.
- **D-3 PENDING (operator):** `trident-container-test` → `container-testing` inside the verbatim BLOCK string (name-only, consistent with the debrand ruling).

## §9 CONTEXT (evidence base)
Scout payloads: `agent://V6SttgfWiring` (v6 wiring, 29m27s) + `agent://OmpDeltaSurface` (OMP deviations, 42m41s). First-hand reads this session: trident-hooks.ts :1008-1018, :1020-1067, :2439-2565; semantic-smoke-firewall.ts :186-215, :245-309, :320-441, :463-522; OMP claim-gate.ts/headless-gate.ts/container-gate.ts/chain.ts/index.ts full. ripwire CLI callers probe disclosed (defs=1 count=0 engine floor). Prior goals: OMP_CT_PURGE_DEBRAND complete (0df67a8), checkpoint Checkpoints/OMP-CT-PURGED-DEBRANDED-COMPLETE.
