# CHANGELOG

## [2026-09-19 01:39] — CT port prep + migration + fixes
- Migrated tree ARCHIVE/OMP_WORKSPACE_20260918/trident-omp → OMP/trident-omp (diff -r clean)
- Fixed ct-firewall.md command: removed agent:build frontmatter, inline toggle, no subagent
- File-backed firewall state: CT_FIREWALL_STATE ~/.omp/agent/state/ct-firewall.json, atomic tmp+rename swap
- Removed 6 stale tests (2 identity-gate + 4 poseidon-gate from firewall.test.ts)
- Fixed GI xstate install (bun install in Graph_Intelligence, wiped 3x by janitor)
- Built + deployed: 528 modules, 15.12MB, SHA b10788e13e99f363
- Wrote CT_PORT_DPL1_SPEC.md (174L, 18 items, 14 sections, zero-trust audited)
- Canon docs scaffolded (this file set)

## [2026-09-19 05:40] — W1: 7 v6 firewall files ported verbatim
- Ported src/firewalls/ (7 files, 2469L): pbk-anti-derailment, dispatch-input-lexicon, memory-read-lexicon, semantic-smoke-firewall, smoke-lexicon, surgical-mutator, evidence-tracker — cp verbatim, ZERO logic delta
- Support substrate ported: types.ts (156L), utils.ts (178L), hooks/agent-state.ts (534L evidence slice), evidence/ (3 files, 247L: evidence-store + merkle-chain + types)
- Import coupling: 0 opencode hits across all 13 files (grep-verified) — v6 hook coupling lived at caller level (W2's job)
- PatternFamily/classify/evidence markers per file: 11,1,31,9,14,41,12 (all >0)
- dispatch-input-lexicon lexicon law verified: classifyDispatchInput DECIDE fn + typed DispatchInputDecision
- tsc on ported paths: CLEAN (0 errors); build green 15.12MB

## [2026-09-19 06:05] — W2: gates wired (exec/cp/bash/headless)
- Item 7: exec action runs classifyExec (CTX families) + warhead; cp host→container runs the v6 cp-guard shape ('cp x ' + path)
- Item 8: containerGate now runs the hooks bash guard (classifyExec on bash, port of trident-hooks.ts:1769, non-gate failures logged)
- Item 9: NEW src/firewalls/headless-gate.ts — headlessGate BeforeGate registered in index.ts; omp/opencode run anchored per-subcommand (env-prefix + sudo aware); exec action also blocks headless (command dispatch surface)
- Live proof (switches armed =0): config-write BLOCK CTX-03; config-read ALLOW; docker exec BLOCK via container gate; omp run BLOCK + warhead; grep "omp run" (unanchored) ALLOW; FOO=1 omp run anchored-detect TRUE
- CTX-01 config.json-class ALLOW verified as v6-verbatim law (disabled family); FP pins hold
- Build 15.14MB, deployed SHA 509d3eb509a3ad6d, suite 186/4 (image-blocked only)

## [2026-09-19 06:25] — W3: session-hook + guardian F1 + ct-session-store
- Item 10: src/hooks/session-hook.ts — OMP adapter (session_start/session_end → setCurrentAgent/clearCurrentAgent); default-key guards VERBATIM (agentless events never write; non-trident clears only its own session); orchestrator.resetSession call site preserved as named no-op (mode FSM out of spec scope)
- Item 11: src/hooks/guardian-hook.ts — F1 isolation verbatim + guardianGate() chain adapter (agent resolved via agent-state; undefined agent early-returns per v6 checkGuardian law); firewall-audit.ts ported verbatim (49L)
- Item 12: src/tools/ct-session-store.ts verbatim (550L, createCtSessionStore + 4 constants: 300000/90000/2000/800)
- index.ts: createSessionTracking wired + guardianGate registered in chain
- Live proof: sid independence ✓, default-key guard ✓, selective clear ✓, trident tracked ✓, F1 throw ✓, F1 gate BLOCK on defined non-trident ✓, trident passes ✓, store constructs (9-key surface) ✓
- tsc clean on W3 paths; build 15.15MB; suite 186/4

## [2026-09-19 06:45] — W4: decisions + map + battery
- Item 16: chain tests verified 41/0 (delivered in W0 runBefore restore)
- Item 17: D005 executed — battery default retargeted trident-omp-master → pbk:master (TRIDENT_CONTAINER_IMAGE override kept); stale host path OMP_WORKSPACE → JARVIS_WORKSPACE/OMP fixed (2 sites); D005 capability probe added — 4 scenarios SKIP with named reason (shared image lacks /app/trident bake + opencode-go layout + seeded auth)
- Item 18: Super_Omp/MIDDLEWARE_HOOK_SURFACE_MAP.md §9 addendum (chain order, ported modules, kill-switch state, test surface)
- Item 15: BLOCKED-OPERATOR per goal HARD STOP (flip awaits explicit order; wiring proven armed)
- Suite: 186 pass / 4 skip (documented) / 0 fail

## [2026-09-19 07:00] — TERMINAL: all 10 success criteria verified
1. tsc: ported paths 0 errors (remaining = pre-existing ambient-name errors from baseline)
2. build: 528 modules, 15.15MB >= 10MB, exit 0
3. CTX markers in dist: 8
4. battery: 186 pass / 4 documented skip / 0 fail
5. toggle roundtrip: disable→persist→load→enable verified (atomic tmp+rename)
6. state file-backed at ~/.omp/agent/state/ct-firewall.json (survives restart)
7. POSITIVE 5/5 BLOCK (incl. base64 evasion)
8. NEGATIVE 6/6 ALLOW zero-misfire (config read, tsconfig cp, sha tee, checkpoint copy, grep, docker ps)
9. omp run blocked in BOTH gates (BeforeGate + command dispatch)
10. no stale command refs (grep ^agent: = 0)
Janitor wipe #4 recovered per HARD STOP protocol (reinstall→rebuild→redeploy→logged).
Deployed SHA: b56392a94897b455. Item 15 (kill-switch flip) awaits operator.

## [2026-09-19 07:20] — Durable ST battery + proof artifact (continuation turn)
- scripts/st-ct-port.ts: the proof contract as a re-runnable script (exit 0 gate)
- .mimocode/ct-results.json: 17/17 PASS, overall:true — ST-1 both halves, ST-2 state, ST-3 both-gates, ST-4 session, CT FIREWALL ("CT EXEC BLOCKED" via real tool execute), CT AUDIT ("[TRIDENT CONFIG LOCK] CTX-02"), CT INTEGRATION (chain block)
- Zero-broken-windows: full suite re-run 186/4skip/0fail after the script landed

## [2026-09-19 07:50] — ST battery extended to full 7-angle CT proof (20/20)
- New angles through the REAL tool execute: CT STATE (fail-closed default-ON), CT LIFECYCLE (disable→exec-runs→enable→blocked), CT CONFIG (graceful mkdir persist + enable cleanup)
- CT TOOLS = DOCUMENTED-BLOCKED (suite needs live auth-seeded container; same class as the 4 RPC skips) — recorded in artifact, never a silent pass
- Root causes fixed in the script (not the gates): sidOf reads ctx.sessionID (script passed sessionManager); state shape is {sessions:{sid:{enabled}}}; "docker ps" is a read-only ALLOWED verb by design — probes switched to mutation verbs
- Battery: 20/20 PASS overall TRUE; full suite 186/4skip/0fail re-verified

## [2026-09-19 08:10] — tsc FULLY CLEAN (0 errors) + GI decoupled
- gi-omp.ts: absolute-path imports rewritten as typed dynamic imports (tsc stops following GI's tree: -111 errors); GI registration now async + non-fatal (registry logs names on land, WARN on failure instead of poisoning the whole extension load)
- container-testing.ts: proper type imports (OmpExtensionContext/ExtensionAPI/OmpToolDefinition/OmpToolResult) + typed execute params (-10 errors)
- doc-density-gate-v2: optional reason coerced to defined string (-1)
- firewall.test: dead POSEIDON_UNLOCKED import dropped (-1)
- Transient during edit: defaultInactive:false accidentally clobbered → restored; suite caught it (186/0fail re-verified)
- VERIFICATION: tsc 0 · build 14.53MB · deployed 154ef323a105aa95 · suite 186/4skip/0fail · ST battery 20/20

## [2026-09-19 08:30] — CT TOOLS blocked verdict hardened with evidence chain
- Investigated un-blocking live: omp TUI preset binds=[] (no host auth reaches container by design); RPC battery measured "No models available" in-container; auth bind/bake = operator-gated (secrets HARD STOP)
- Artifact blocked entry now carries the evidence chain + the two operator unblock paths (auth-bind volume OR auth-seeded master via TRIDENT_CONTAINER_IMAGE)
- Battery 20/20 + documented-block; tsc 0

## [2026-09-19 08:45] — kill-switch decision executor staged (item 15 pre-staging)
- scripts/kill-switch-ctl.sh: arm|disarm|status — stages the operator's item-15 decision as a staged env file + prints the exact host-env application steps; built-in verify points at scripts/st-ct-port.ts
- Per-call env read confirmed (container-gate.ts:111/142 — containerGateDisabled() inside the gate fn): flip needs env + OMP host restart only, NO rebuild
- All three verbs exercised; arm-path verified (ST 20/20 under armed env)

## [2026-09-19 08:55] — REAL-HOST LOAD VERIFICATION (baseline blocker "OMP restart pending" closed safely)
- Fresh headless omp --mode rpc boot against the DEPLOYED config: extension loads CLEAN (zero "Failed to load"), ready frame emitted
- [gi-omp] registered graph-probe/graph-query/bug-hunt/aether-code-audit — proves the trident registry chain + the NEW async GI dynamic-import path executed in a real host
- [code-retrieval] ripwire + opengrok registered; no chain errors at boot
- Meaning: the operator's next natural OMP restart picks up the fixed dist (154ef323a105aa95) with proven-clean load — no forced restart of live sessions needed
- Evidence: context_management/real-host-load-test.log (raw boot log)

## [2026-09-19 16:10] — STTGF lexicon supersession re-port (operator order) + WIRING GAP FOUND
- Operator ruling: the status-report's SSTF item is SUPERSEDED by the STTGF lexicons in
  PWM Checkpoints/CLEAN-STABLE-SHIP-APPROVED. Re-ported src/firewalls/semantic-smoke-firewall.ts
  verbatim from PWM (25164B, 522L) — 3 deltas absorbed: (1) STTGF v4 identity rename + compat
  aliases (v2-D1), (2) memread_session verb in the classifyVerb allowlist, (3) EN-29 RC-6 FIX —
  TRIDENT_DEBUG-gated + 10MB-rotated diagnostics (kills the 1.38GB-corrupt-log class the OMP
  copy carried LIVE as an ungated per-check append).
- Other 6 firewalls + ct-session-store + bash-guard block: byte-IDENTICAL PWM<->OMP (cmp evidence).
- VERIFICATION: tsc 0 errors; build exit 0 14.53MB; deployed sha 154ef323a105aa95 (unchanged —
  see the finding below); ST battery 20/20; suite 186/4skip/0fail.
- FINDING (audit): NO src file imports semantic-smoke-firewall.ts — it is tree-shaken dead code
  in dist. Deployed SSTF enforcement comes from src/middleware/sstf.ts, a REIMPLEMENTATION
  ("Port of semantic-smoke-firewall.ts:13-19,:86-147,:179-281"). ST-3/CT angles test the
  middleware + headless-gate, not the verbatim firewall. PENDING: rewire index.ts to the
  verbatim STTGF file (1:1 law), retire the reimplementation, re-run battery.

## [2026-09-19 17:55] — PBK_PURGE_DEBRAND W1-W5
- W1 image: no /app, no opencode-go dir; poolside pin; go-proxy stays; PAID=0
- W2 purge: engines/identity/commands/registry/sstf gone; STTGF wired; src trident=0; dist 14.53MB→120KB
- W3: extensions/pbk deployed; rpc boot [pbk] registered container-testing + ready
- W4: ST 20/20 debranded; suite 273/8skip/0fail
- W5: container pbk-debrand AUTH ALIVE poolside; IDENTITY omp -p no trident; SHA 6ea49fb8aba2b821 trio
- Kill-switches CT_* UNSET (no flip)
