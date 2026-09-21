## GOAL
Execute specs/OMP_CT_STTGF_VERBATIM_PORT_DPL1_SPEC.md until the v6 production
STTGF posture is live in OMP VERBATIM — the :2473-2555 wiring block as
sttgf-gate.ts, claim arming from completed messages, escape hatch on
container-testing, escalation at 3, ZERO kill-switch envs, zero regex
recreations — proven by a full deep-container suite (AUTH first, teeth,
zero-misfire, Phase E) with the artifact written. Anything less is OPEN.

## BASELINE
Re-measured 2026-09-20 (re-verify ALL on first reply, then fire W1):
- Tree: /home/leviathan/JARVIS_WORKSPACE/OMP/trident-omp @ jarvis/omp-main a5cc081
- Spec: specs/OMP_CT_STTGF_VERBATIM_PORT_DPL1_SPEC.md (96L); authority = PWM
  Checkpoints/CLEAN-STABLE-SHIP-APPROVED (v6 has NO kill-switch — grep 0
  hits; FIREWALL_CONFIG enabled:true :463); scout maps '/home/leviathan/.omp/agent/sessions/-JARVIS_WORKSPACE-Shared_Workspace/2026-09-15T10-21-16-032Z_01a0a495-cd80-74b8-818b-082b0dafde3b/V6SttgfWiring.md'
  + '/home/leviathan/.omp/agent/sessions/-JARVIS_WORKSPACE-Shared_Workspace/2026-09-15T10-21-16-032Z_01a0a495-cd80-74b8-818b-082b0dafde3b/OmpDeltaSurface.md'
- src 37f/7,671L; dist=deployed 6ea49fb8aba2b821 (121KB); tsc 0; suite 360
  pass/0 fail; ST 20/20 TRUE; image omp-ct:master 988d8bde1f87 (clean)
- THE DEAD GATE (measured): setVerificationClaimed wired=0 outside the
  verbatim file; sttgfStateTracker imported by 0 files; claimWindowDecide x2
  + HEADLESS_RE x2 in claim-gate.ts; containerGateDisabled x3; CT_*_DISABLED
  strings in 6 files; envs UNSET on host

## WAVES
W1 DELETE+LAND: copy trident-hooks.ts:2473-2555 VERBATIM into NEW
  src/middleware/sttgf-gate.ts as a BeforeGate. Adaptations ONLY: throw ->
  {action:block,gate:sttgf,reason:<exact [STTGF BLOCK] string>}; agent/mode/
  commandStr from Omp ctx; trident-container-test -> container-testing. DELETE:
  claim-gate local tracker :8-37 + sstfDisabled :93-97 + claimWindowDecide
  :53-73 + HEADLESS_RE :45-51 + dual-path claimGate :99-133;
  containerGateDisabled :103-107; headless-gate.ts ENTIRE (+imports index.ts:14,
  container-testing.ts:26). Gate: tsc 0 + recreation grep 0 + build green.
W2 ARMING+HATCH: port isCompletionClaim + CLAIM_*_RE (:1008-1018) + arming
  hook (:1030-1052 shape) onto OMP message-end; hatch inside sttgf-gate on
  container-testing setup/run/suite/deploy -> setContainerTestRan(true)+
  setVerificationClaimed(false). Gate: setVerificationClaimed == 3 sites;
  arming proven by completed-message fixture (a tool result NEVER arms).
W3 SWITCH REMOVAL: CT_SSTF_DISABLED/CT_GATE_DISABLED gone from src+tests+
  scripts (incl. kill-switch-ctl.sh, st-ct-port ARM/DISARM); gates
  unconditional. Gate: grep CT_*_DISABLED == 0 everywhere.
W4 TESTS TO v6 CONTRACT: assert the v6 strings ([STTGF BLOCK] ${category},
  'Smoke tests are FORBIDDEN. Use container-test.', [STTGF ESCALATE] at
  getBlockCount>=3, 'Headless exec forbidden. Use TUI.', 'Inline exec is
  smoke test. Use container.'); ST tokens updated. Gate: suite 0 fail; ST green.
W5 CONTAINER SUITE+CHECKPOINT: 12-step law on omp-ct:master — AUTH probe
  FIRST (poolside bar live, screenshot truth) -> teeth POSITIVE (headless
  BLOCK, inline-exec BLOCK, claim-demand — each its OWN token in TOOL-RESULT
  context) -> NEGATIVE zero-misfire AFTER teeth -> Phase E 10 -> artifact
  overall:true -> zero-broken-windows re-runs -> checkpoint per
  saving-checkpoints SOP.

## LAWS
- VERBATIM PORT: v6 wiring block, lexicons, tracker, token strings are
  copy-paste. ONLY the spec §4 hook-surface adaptations apply. ANY new local
  regex/tracker/intent-derivation = FAIL (the three-generation D2/D5/D6 sin).
- RIPWIRE FIRST-CLASS: call the ripwire tool (map/for/callers/pack-task)
  before EVERY coding edit; never blind or syntax-only patches. If absent
  from the tool list: emit RIPWIRE_MISSING, do not fake a graph (CLI
  ~/.local/bin/ripwire = explicit-note fallback; callers count is a floor).
- ONE STATE MACHINE: sttgfStateTracker only; no parallel trackers.
- NO MESSAGE MUTATION: arming is a non-fatal trigger; enforcement is
  tool.before BLOCK verdicts only (ruling quoted at v6 :1020-1023).
- Forks (defaults): D-3 rename in BLOCK string = YES (debrand ruling). D-2
  add -p/--print to the headless verb regex = YES as the single sanctioned
  verbatim-file delta (one regex line in classifyVerb, documented in commit).
- Append-only canon; every claim quotes command + output + exit this turn.

## HARD STOPS
- NO new kill-switch: nothing may gate sttgfGate (no env, no config flag).
- NO token rewording (except the D-3 tool name).
- NO edits outside §4 adaptations + delete sites + test/script token updates.
- NEVER bake /app/trident or an opencode-go dir (gates demanding them are
  escalated, never obeyed). No secrets in files (env-file at run only).
- Never weaken a criterion/test to reach green; fix the code.
- Scenario failure = two-sided adjudication (test wrong vs code wrong), then
  fix + retest; never skip, never accept env-blocks as passes.

## PROOF CONTRACT
- Pass tokens bind to TOOL RESULTS (agent-typeable = CIRCULAR=FAIL): the
  teeth tokens + [STTGF ESCALATE] 'Running container test is MANDATORY.'
- Artifact: .mimocode/ct-results.json per-scenario + overall:true + Phase E.
- Circuit breaker: sha trio equality (local==deployed==in-container) + every
  scenario executed + tokens in tool-result context + no timeouts + negative
  family green AFTER teeth + container alive + zero-broken-windows re-runs.
- Six runtime behaviors, each one scenario: (1) armed claim + inline-exec ->
  BLOCK claim-gated; (2) headless verb (run AND -p/--print at subcommand
  start) -> BLOCK 'Use TUI.'; (3) 3 consecutive blocks -> ESCALATE; (4)
  container-testing setup/run/suite/deploy -> claim clears, next inline-exec
  passes; (5) tool result with bare claim words NEVER arms; (6) legit ops
  zero-misfire.
- Grep criteria: recreation grep 0; CT_*_DISABLED 0 everywhere; [STTGF
  BLOCK] >=1 in dist; setVerificationClaimed == 3 sites; sttgfStateTracker
  imported by gate + arming hook.

## STOP
Legal stop = spec §6 criteria 1-8 green with this-turn command evidence +
container suite overall:true + Phase E 10/10 + zero-broken-windows green +
checkpoint saved + canon/CHANGELOG appended + NO kill-switch exists (grep
proves it) + all six runtime behaviors observed in tool results. FIRST
REPLY: re-verify baseline (HEAD, sha trio, recreation + dead-gate greps,
image id, suite/ST), report deltas, fire W1. Anything less is OPEN.

### ANTI-DERAIL
- Regex-recreation reflex: ANY new verb/intent regex or local tracker means
  STOP — the verbatim file already exports it.
- Fix-to-broken-test: legacy test fails against the verbatim path -> rewrite
  the TEST to the v6 contract, never bend the code (D5).
- Test-gate over operator-order; blind edits without a graph; theoretical
  fixes without runs; parallelism under load — all banned.

### ANTI-STOP
- Stationarity is not done; only gates close work.
- ST green alone never closes the run — the container suite is terminal.
- "Already verified" without this-turn re-run is STALE.
- Prose without quoted tool results is theater; a BLOCKED entry needs its
  resume condition; one wave green with siblings open is progress, not done.

HONEST_CLASS: infra_spine (middleware verbatim port; ship proof = W5
container contract).
DENSITY: multi_day (round-zero checkpoint OMP-CT-PURGED-DEBRANDED-COMPLETE
on disk; canon live; spec 96L on disk).
