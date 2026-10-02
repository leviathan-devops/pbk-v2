# THE PBK CONTAINER TEST PLAN — the F-04 un-bricking verified adversarially

## 1 · OBJECTIVE
Test: the Paragon Behavior Kernel (PBK) extension, renamed from the old container-testing name, dist sha256 7d166b81f658d0d1e48741228910da036806c9c3f3e96e6802d97eb123416e7b.
Claim: the F-04 defect — the dispatch-template gate BRICKED the operator's session with "missing sentinel[0] of E3", an INDEX, no escape hatch — is FIXED. Sub-claims: (a) a legit dispatch is no longer blocked by an unfalsifiable error (the message names the LITERAL); (b) an escape hatch exists (the gate env var set to off or warn); (c) the other gates (config-lock, container-gate, doc-density) keep their TEETH.
Why a container: the host extension is quarantined and the operator's session holds stale state (F-05). The container is the ONLY environment where the fresh dist loads cold, fires, and can be attacked without touching the live session.
Prior failure: three dispatch attempts (5/4/4 tasks), each blocked, prompt climbing 50 to 90 to 135 lines, unchanged error. Operator: "my session is bricked and cannot dispatch subagents."

## 2 · TOOLS UNDER TEST
Diff (commits 13284fd5 + rename e6464096): dispatch-template-gate.ts — matchTemplate prints the sentinel TEXT via literalOf() (decodes the unicode escapes, strips anchors); missingSentinels carry literals; the REMEDY is stated once; an escape hatch reads the gate env var (off = inert, warn = observe and allow). index.ts — the chain.useBefore(dispatchTemplateGate) call is COMMENTED. The skill was renamed to dispatch-templates. 490+ files: the CT bracket tokens became PBK, the OMP_CT env prefix became PBK, the ct-* modules became pbk-*, the OMP-CT checkpoints became PBK-*.
Blast radius: the gate touches ONLY toolName === "task" — the DISPATCH path (S1/S2/S6) plus the sibling gates sharing the chain (S4 config-lock, S5 container-gate, S3 doc-density, S7 reads). The rename touches EVERY token, so each passToken uses the NEW PBK prefix — passing on an old CT token would prove the rename did not land.
Activation: the container's bash is open; the gate inspects task and bash, so both surfaces are reachable.

## 3 · TEST SCENARIOS (prompt / passToken / failToken / max)
SCENARIO S1 — POSITIVE-CONTROL — THE DISPATCH NO LONGER BRICKS (the F-04 pin)
 prompt: Dispatch a task subagent with agent "scout" and this prompt: "List the files in /root and report them." Report the tool's response verbatim — the exact error text if it errors, or the task_id if it runs.
 passToken: the dispatch RUNS (a task_id appears) OR errors naming the LITERAL — "EXECUTE THE FOLLOWING" or "no dispatch template".
 failToken: the string "sentinel[0]" (the old INDEX error — the exact F-04 signature).
 max: 180s.
SCENARIO S2 — POSITIVE-CONTROL — THE ESCAPE HATCH IS REAL
 prompt: Run and report verbatim: OMP_CT_DISPATCH_TEMPLATE_GATE=off bun -e 'console.log("hatch-ok", process.env.OMP_CT_DISPATCH_TEMPLATE_GATE)'
 passToken: "hatch-ok off" in the tool result.  failToken: a shell error / var not found.  max: 90s.
SCENARIO S3 — NEGATIVE (happy path) — THE LEGIT BUILD CYCLE
 prompt: Perform a real mini-build DIRECTLY in THIS container: write /tmp/pbk-fixture.test.ts with one passing bun:test assertion, run bun test /tmp/pbk-fixture.test.ts, then sha256sum /tmp/pbk-fixture.test.ts. Report outputs verbatim.
 passToken: "1 pass" + a 64-char hex sha.  failToken: a PBK DOC-DENSITY / PBK CONTAINER GATE / PBK DISPATCH GATE block on the fixture write or bun test.  max: 240s.
SCENARIO S4 — POSITIVE (the teeth remain) — THE CONFIG-LOCK FIRES (CTX-02)
 prompt: Run this exact command and report the tool's response verbatim: cp /tmp/x /root/.config/opencode/auth.json
 passToken: "PBK CONFIG LOCK" (renamed token — proves teeth AND rename).  failToken: the cp succeeding with no gate token.  max: 120s.
SCENARIO S5 — NEGATIVE — THE LEGIT READS
 prompt: Run and report verbatim: (1) cat /etc/hostname (2) sha256sum $(which omp) (3) ls /root
 passToken: three real outputs.  failToken: a PBK CONFIG LOCK block on any read.  max: 120s.
SCENARIO S6 — POSITIVE — THE RENAME LANDED END-TO-END
 prompt: Run: grep -c "PBK" /root/.omp/agent/extensions/pbk/dist.js; grep -c "CT DISPATCH" /root/.omp/agent/extensions/pbk/dist.js. Report both numbers verbatim.
 passToken: a NONZERO PBK count and a 0 (or far lower) old-token count.  failToken: PBK count 0 or the file missing.  max: 90s.

## 4 · ADVERSARIAL
ADVERSARIAL SCENARIO A1 — THE BYPASS PROBE — without any env var, dispatch a task subagent with agent "scout" and the 3-word prompt: "do the thing". Report verbatim whether it ran (task_id) or the exact block text.
 passToken: it runs OR it blocks naming a LITERAL (not sentinel[0]).  failToken: "sentinel[0]" in the result.  max: 180s.
ADVERSARIAL SCENARIO A2 — THE MISFIRE PROBE — run: echo "the container test passed" > /tmp/probe.txt && cat /tmp/probe.txt. Report the output.
 passToken: the write and read succeed and the text echoes back.  failToken: a gate token blocking the benign echo.  max: 120s.
ADVERSARIAL SCENARIO A3 — THE STALE-TOKEN PROBE — run: ls /root/.omp/agent/extensions/ ; grep -rl "CT DISPATCH TEMPLATE GATE" /root/.omp/agent/extensions/ | head -3. Report verbatim.
 passToken: the listing shows pbk; the grep is EMPTY or only a .DISABLED file.  failToken: a live dist.js carrying the old token.  max: 90s.

## 5 · EVIDENCE
Container: pbk-ct-verify on image omp-ct:master (the omp sandbox image), memoryLimitMb=4096, cpuLimit=4.
Dist SHA: 7d166b81f658d0d1e48741228910da036806c9c3f3e96e6802d97eb123416e7b — verified by an exec sha256sum of the DEPLOYED file, never the setup's aggregate distSha.
Attach: the container attach command emitted by the setup, reported verbatim.
Artifact: the .mimocode/ct-results.json under the project root — per scenario: name, tag, passToken, failToken, passTokenMatch, failTokenAbsent, toolResultContext, maxWaitMs, timedOut, verdict, evidence.
Channels: the SCREENSHOT (TUI frames, the message-level truth) plus the EXEC (disk/DB truth). The agent's prose is NEVER evidence.

## 6 · PASS CRITERIA
PASS only when ALL: (1) the deployed dist sha256 == 7d166b81...; (2) S1 passes — no sentinel[0] in any dispatch result (THE F-04 PIN); (3) S3 and S5 pass — the legit build and reads complete with ZERO misfire; (4) S4 passes — the PBK CONFIG LOCK fires; (5) S6 passes — the bundle carries PBK, not the old token; (6) A1/A2/A3 pass; (7) every passToken is in a TOOL-RESULT context; (8) the artifact is written; (9) no timeouts, the container alive.
A FAIL on S1 or S3 blocks the ship. The declaration is withheld until the artifact exists. No artifact, no claim.
