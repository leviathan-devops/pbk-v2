# RUNNING_DEBUG_LOG

## 2026-09-19 — Janitor process
- Symptom: Graph_Intelligence/node_modules wiped 3x, OMP_WORKSPACE symlink removed
- Impact: trident-omp build fails (xstate unresolvable)
- Suspect: unidentified (cron, systemd timer, or another session's cleanup)
- Workaround: cd GI && bun install (works, gets re-wiped)
- Status: OPEN

## 2026-09-19 — Chain test drift
- 2 tests in firewall.test.ts fail on chain semantics
- Both files date to Sep 9 git snapshot, silently diverged
- Fix: read chain.ts as truth, update 2 assertions
- Status: QUEUED

## 2026-09-19 — RPC battery missing image
- 4 tests expect trident-omp-master image, only pbk:master/mimo-ct:master exist
- Fix: retarget to pbk:master (spec §9.3 default)
- Status: QUEUED

## 2026-09-19 06:50 — Janitor wipe #4 (during terminal verification)
- Symptom: GI node_modules/xstate wiped again mid-verification; build RED
- Protocol per goal HARD STOP: bun install → rebuild → redeploy → this entry
- Build recovered: 528 modules, dist redeployed

## 2026-09-19 07:20 — session note: ST script authoring took 3 repair cycles
- Lesson: line-anchored edits on a freshly written 200-line file drifted repeatedly (stale anchors) — repaired via read-then-cut, final state verified by execution (17/17, exit 0)
- No production code touched; script-only

## 2026-09-19 07:35 — Janitor hunt (W0 residual): 5 surfaces CLEARED, tripwire armed
- Cleared (grep/journal evidence): cron pin-agents.sh (CPU pinning only), cron tdai-health-check, systemd opencode-container-cleanup (docker-only, journal-verified 00:00 run touched nothing but containers), jgm-daemon (observe-only; plan-clean.ts is a ZERO-mutation dry-run preview), mimocode-git-snapshot.sh (no rm ops), manager-machine atomic.ts (tmp-write safety only)
- Negative sweep: NO script in ~/.local/bin, OPENCODE_WORKSPACE/scripts, systemd user units references OMP_WORKSPACE or Graph_Intelligence/node_modules
- Remaining suspect class: live interactive agent sessions (e.g. AO scratch-2 grok worker, auto-permission, up since 02:45) running ad-hoc cleanup — unproven
- ACTION: janitor-tripwire hub process ARMED (persistent, 60s poll on GI node_modules/xstate) — logs transition timestamps + processes whose cwd sits under Shared_Workspace at the moment of the wipe to .janitor-watch/janitor.log
- Resume condition: read .janitor-watch/janitor.log after the next wipe → identify PID/command → operator decides kill vs reconfigure

## 2026-09-19 06:22 — Tripwire SELF-TEST passed (instrumentation proven)
- Simulated wipe (mv xstate away): detected in 17s, TRANSITION logged with timestamp + full Shared_Workspace cwd process capture
- Restored: xstate back, deps PRESENT, suite re-verified 186/0fail
- Note: capture lists ALL Shared_Workspace-cwd processes at transition (~90 live: many omp sessions, MCP servers, AO) — a real wipe's culprit needs correlation, but the moment + surface are now mechanically recorded
