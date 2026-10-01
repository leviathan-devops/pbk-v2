/**
 * container-gate — raw docker/tmux container commands in bash are blocked;
 * the st AGENT TOOL (sandbox test) is the ONLY sanctioned sandbox path.
 * (port of hook-chain.ts:1208-1286, extended 2026-08-09 with the
 * BYPASS LEXICON — the operator's directive: "there SHOULD NOT BE a bypass.
 * make sure the bypasses you used are also added to the blocking logic
 * lexicon." The bypass shapes: docker hidden inside test files, spawnSync
 * indirection, base64 obfuscation, heredoc writes, entrypoint-override
 * spawns. The gate catches the INDIRECTION, not just the direct verb.)
 */
import type { BeforeGate } from "./chain";
import { classifyExec, buildConfigLockMessage } from "../firewalls/pbk-anti-derailment.js";
// ★ W3 — THE JEV DECISION LAYER: the regex marks the container SHAPE; the judge decides.
import { askGateDecision, enforceGate, containerCandidate, recordGateDecision } from "../ext/tool-gate";
import { ctLog } from "../utils.js";

// Direct container verbs — the original v4.4.2 surface.
const CONTAINER_VERB_RE =
  // ★ HT-BUG-12 FIX (2026-10-01): the verb list wrongly included READ/STAGE ops
  //   (cp|logs|inspect|port|top|wait|start). `docker cp` STAGES a build artifact into a
  //   container (the operator's own workflow — refused live); `docker logs/inspect/ps` READ
  //   state. Only EXECUTING code in a container (exec|run|attach — the bypass of the
  //   container-testing tool) and DESTROYING one (rm|stop|kill — a bypass of the evidence)
  //   are the class.
  /(docker\s+(exec|run|attach|rm|stop|kill)|tmux\s+(send-keys|capture-pane|pipe-pane|new-session|new-window|split-window)|pkill\s+-f\s+omp)\b/i;

// Bypass shape 1: spawnSync / execSync / child_process indirection that
// smuggles docker into a child process (the tests/seam/*.test.ts pattern).
const SPAWN_INDIRECTION_RE =
  // ★ AUDIT HIGH FIX (container-gate.ts:29): was order- and window-sensitive — only matched the
  //   spawn keyword BEFORE the container word. Both orders now match.
  /((Bun\.spawnSync|spawnSync|execSync|execFileSync|child_process|fork\()[\s\S]{0,120}(docker|tmux|container)|(docker|tmux|container)[\s\S]{0,120}(Bun\.spawnSync|spawnSync|execSync|execFileSync|child_process|fork\())/i;

// Bypass shape 2: base64-obfuscation — decode-then-EXECUTE is the bypass
// signature (the docker content is invisible inside the blob, so the catch
// is the STRUCTURE: base64 -d piped to a shell/eval or written to a file
// that is then run). Pure decode-to-stdout for reading (e.g. viewing a
// payload) is not the bypass; decode-to-shell is.
const BASE64_OBFUSCATION_RE =
  // ★ AUDIT HIGH FIX (container-gate.ts:37): was too narrow — missed macOS `base64 -D`,
  //   `openssl enc -base64 -d | sh`, and decode-to-file + chmod/run. Broadened (decode-to-stdout
  //   for reading stays allowed; decode-to-shell/file+exec is the bypass).
  /(base64\s*(-d|--decode|-D)\s*|openssl\s+(enc|base64)[\s\S]{0,40}-d\s*)(\s*\|\s*(sh|bash|zsh|eval|source|\.\s)|\s*>\s*\S+[\s\S]{0,60}(chmod\s+\+x|sh\s|bash\s))/i;

// Bypass shape 3: entrypoint-override container spawns (docker run
// --entrypoint sleep ... — the shell-keepalive trick used to drive RPC).
const ENTRYPOINT_OVERRIDE_RE = /docker\s+run[\s\S]{0,80}--entrypoint/i;

// Bypass shape 4: test-runner indirection — running a test file that is
// KNOWN to smuggle containers (the bun test channel hides docker from this
// gate). The banned names are the AD-HOC bypass files (net-probe,
// flip-debug, container-flip-gate — all deleted 2026-08-09). The sanctioned
// battery (container-rpc-battery, container-cycle, sandbox-driver,
// herdr-visibility) is the TOOL'S OWN verification suite — it runs via bun
// test and is never a bypass; it tests the st tool's runtime.
const TEST_RUNNER_BYPASS_RE =
  /(bun\s+test|bunx\s+bun-test|bun\s+test:battery)[\s\S]{0,80}(net-probe|flip-debug|container-flip-gate)/i;

// Bypass shape 5: heredoc/pipe writes that materialize docker into a file
// that is then executed (write a bypass script, then run it).
const HEREDOC_DOCKER_RE =
  /(<<\s*['"]?(EOF|EOT|heredoc)|tee\s+\/tmp|>\/tmp)[\s\S]{0,300}(docker|tmux)[\s\S]{0,80}(exec|run|rm)/i;

// Bypass shape 6: docker inside a quoted/escaped string that the verb regex
// misses (e.g. `docker` mid-string with odd spacing).
const DOCKER_ANYWHERE_RE =
  /["'`](docker|tmux)\s+(exec|run|rm|attach|cp|logs)[\s\S]{0,60}(["'`]|$)/i;

/**
 * True when the command is a container operation OR a bypass shape. The
 * function is the STATE MACHINE'S DETECTOR — it flags candidates; the gate
 * decides. Never a classifier; a match is a hard block (the operator's
 * "no bypass" law).
 */
/** THE BAN LIST — a deterministic POLICY, not a shape judgment: invoking the TEST RUNNER on a
 *  KNOWN bypass file (net-probe / flip-debug / container-flip-gate) is banned BY NAME. A name ban
 *  is not a question of intent, so the judge does not adjudicate it; the SHAPES (a verb, an
 *  indirection, base64-to-shell, a heredoc) are judged (text-vs-genuine). */
export function isBannedRunnerCommand(cmd: string): boolean {
  return TEST_RUNNER_BYPASS_RE.test(cmd);
}

export function isContainerPathCommand(cmd: string): boolean {
  if (!cmd) return false;
  // ★ HT-BUG-13 FIX (2026-10-01, reproduced LIVE): the verb test ran on the RAW command, so a
  //   HEREDOC BODY that merely CONTAINS container strings (`cat > t.ts <<'TS' … docker exec … TS`)
  //   matched — a test-fixture write was refused as a bypass (the F-141 class). The smoke gate
  //   already strips quoted spans; this gate must strip QUOTED SPANS + HEREDOC BODIES (DATA) and
  //   test only the command's own ACTION.
  const action = cmd
    .replace(/<<-?["']?([A-Za-z_][A-Za-z0-9_]*)["']?[\s\S]*?\n\1\b/g, " <HEREDOC>")
    .replace(/"[^"]*"/g, '""')
    .replace(/'[^']*'/g, "''");
  if (CONTAINER_VERB_RE.test(action)) return true;
  if (SPAWN_INDIRECTION_RE.test(action)) return true;
  if (BASE64_OBFUSCATION_RE.test(action)) return true;
  if (ENTRYPOINT_OVERRIDE_RE.test(action)) return true;
  // [audit:79] the NAME-BAN is a policy on a FILENAME, not a shape — it tests the RAW command,
  // because the strip blanks the very quoted filename the ban exists for (`bun test "net-probe"`).
  if (TEST_RUNNER_BYPASS_RE.test(cmd)) return true;
  // [audit:88 + :102] HEREDOC_DOCKER_RE / DOCKER_ANYWHERE_RE are DELETED: tested on the raw they
  // blocked a fixture that merely MENTIONS the words (the F-141 false positive); tested on the
  // action they were dead (the strip removes their patterns). The classes they aimed at are
  // covered — the ACTION verb check (a real invocation) and isBypassWrite (script materialization).
  return false;
}

/**
 * The same lexicon applied to WRITE content — writing a test file that
 * drives containers is the bypass-materialization channel. The st tool's
 * own engine files (src/engines/sandbox/*) are exempt — they ARE the tool.
 */
const SANDBOX_ENGINE_EXEMPT = /src\/engines\/sandbox\//;

/** The execution-context indicators — a docker word is a bypass ONLY when it
 * is executed (spawnSync/bash/shell invocation), not when it is a plain
 * string literal being CLASSIFIED (e.g. a lexicon test passing "docker exec"
 * as classifier input — that is not a bypass, it is a test of the detector). */
const EXEC_CONTEXT_RE =
  // ★ HT-BUG-21 FIX (2026-10-01): the `` `[\s\S]*docker `` / `docker[\s\S]*` `` patterns matched ANY
  //   template literal that MENTIONS the container word — so a test file that merely names it
  //   (`const c = \`<container> exec foo\``) was flagged a bypass (a false positive on a test OF the
  //   gate). The real bypass signature is an EXECUTION context (spawn/exec/bash -c/fork) or a
  //   heredoc-script write — a bare backtick is DATA, never an execution.
  /(Bun\.spawnSync|spawnSync|execSync|execFileSync|child_process|fork\(|bash\s+-lc|sh\s+-c|>\s*\/tmp|<<\s*['"]?(EOF|EOT))/i;

export function isBypassWrite(path: string, content: string): boolean {
  if (SANDBOX_ENGINE_EXEMPT.test(path)) return false;
  // ★ AUDIT HIGH FIX (container-gate.ts:119): the .test/.spec restriction let the same bypass
  //   materialize via a plain .ts/.mjs/.cjs/.sh + `bun run`/`bash`. Now ANY executable file is
  //   checked — with the enforcement's OWN source exempt (it legitimately NAMES the shapes).
  if (/src\/(middleware|firewalls|ext)\//.test(path)) return false;
  if (!/\.(ts|tsx|js|jsx|mjs|cjs|sh)$/.test(path)) return false;
  const hasDocker = /docker\s+(run|exec|rm)\b/i.test(content) || SPAWN_INDIRECTION_RE.test(content);
  if (!hasDocker) return false;
  // a bare docker string in classifier input is NOT a bypass — require the
  // execution context (spawn/bash/shell invocation).
  return EXEC_CONTEXT_RE.test(content);
}

/** v6 has no kill-switch: the container gate is unconditional. */

export function containerGate(): BeforeGate {
  return async (ctx) => {
    if (ctx.toolName !== "bash") return undefined;
    const cmd = String(ctx.input.command ?? "");
    // THE HOOKS BASH GUARD (spec item 8 — port of hook-chain.ts:1769):
    // the CT anti-derailment lexicon (classifyExec — the PatternFamily +
    // state machine + evidence triad) decides on bash commands. BLOCK → the
    // per-family warhead (buildConfigLockMessage). Non-gate failures are
    // logged non-fatal (the v6 caller shape). The reads + unrelated execs
    // pass untouched — the surgical filter.
    try {
      const ctVerdict = classifyExec(cmd);
      if (ctVerdict.verdict === "BLOCK") {
        return { action: "block", gate: "container", reason: buildConfigLockMessage(ctVerdict) };
      }
    } catch (e) {
      ctLog("WARN", "container-gate", "the anti-derailment lexicon check failed (non-gate): " + (e instanceof Error ? e.message : String(e)));
    }
    if (isContainerPathCommand(cmd)) {
      // ★ W3 — THE JEV DECISION LAYER (the mandate). The regex matched the container SHAPE;
      //   the JUDGE decides whether it is a GENUINE bypass or TEXT that merely contains the
      //   shape (a quoted string, a grep pattern, a classifier test fixture — THE F-141 CLASS).
      //   SECURITY surface: fail-CLOSED — a dead judge keeps the block (it names its remedy).
      if (isBannedRunnerCommand(cmd)) {
        // a NAME BAN is policy, never a judgment (the judge does not adjudicate a list)
        return {
          action: "block",
          gate: "container",
          reason: "[PBK CONTAINER GATE] the test runner was pointed at a KNOWN bypass file (a name-ban policy): net-probe / flip-debug / container-flip-gate. Use the ct-sandbox-test AGENT TOOL.",
        };
      }
      try {
        const cand = containerCandidate(cmd);
        const jv = await askGateDecision(cand, `the command:
${cmd.slice(0, 4000)}`);
        const ef = enforceGate(cand, jv);
        recordGateDecision(cand, jv, {
          tool: "bash", command: cmd, sessionId: ctx.sessionId,
          enforced: ef.action === "refuse" ? "refused" : "served", remedy: ef.remedy,
        });
        if (ef.action === "serve") {
          ctLog("INFO", "container-gate", `judge CLEARED (${jv.choice} p=${jv.confidence.toFixed(3)}) — the shape is TEXT, not a container bypass`);
          return undefined;
        }
      } catch (jevErr) {
        // ★ AUDIT HIGH FIX: the comment said fail-OPEN while the control flow kept the BLOCK.
        //   The surface is SECURITY (containerCandidate.severity="security"), so the CORRECT
        //   posture is fail-CLOSED — the block stands, and the log now says so.
        ctLog("WARN", "container-gate", `judge failed (fail-CLOSED, the block stands): ${jevErr instanceof Error ? jevErr.message : String(jevErr)}`);
      }
      return {
        action: "block",
        gate: "container",
        reason: "[PBK CONTAINER GATE] raw docker/tmux container commands + bypass indirection are blocked — use the ct-sandbox-test AGENT TOOL (sandbox test), the ONLY sanctioned sandbox path",
      };
    }
    return undefined;
  };
}

/** The write-surface bypass gate — blocks materializing a docker-driving test file. */
export function containerWriteGate(): BeforeGate {
  return async (ctx) => {
    if (ctx.toolName !== "write" && ctx.toolName !== "edit") return undefined;
    const path = String(ctx.input.path ?? ctx.input.filePath ?? "");
    const content = String(ctx.input.content ?? ctx.input.newString ?? ctx.input.value ?? "");
    if (isBypassWrite(path, content)) {
      return {
        action: "block",
        gate: "container",
        reason: "[PBK CONTAINER GATE] writing a test file that drives containers is a bypass — use the ct-sandbox-test AGENT TOOL (sandbox test) instead",
      };
    }
    return undefined;
  };
}
