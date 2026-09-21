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
import { classifyCtExec, buildCtConfigLockMessage } from "../firewalls/ct-anti-derailment.js";
import { ctLog } from "../utils.js";

// Direct container verbs — the original v4.4.2 surface.
const CONTAINER_VERB_RE =
  /(docker\s+(exec|run|attach|logs|cp|stop|rm|start|kill|wait|top|inspect|port)|tmux\s+(send-keys|capture-pane|pipe-pane|new-session|new-window|split-window)|pkill\s+-f\s+omp)\b/i;

// Bypass shape 1: spawnSync / execSync / child_process indirection that
// smuggles docker into a child process (the tests/seam/*.test.ts pattern).
const SPAWN_INDIRECTION_RE =
  /(Bun\.spawnSync|spawnSync|execSync|execFileSync|child_process|fork\()[\s\S]{0,120}(docker|tmux|container)/i;

// Bypass shape 2: base64-obfuscation — decode-then-EXECUTE is the bypass
// signature (the docker content is invisible inside the blob, so the catch
// is the STRUCTURE: base64 -d piped to a shell/eval or written to a file
// that is then run). Pure decode-to-stdout for reading (e.g. viewing a
// payload) is not the bypass; decode-to-shell is.
const BASE64_OBFUSCATION_RE = /(base64\s*(-d|--decode)\s*)(\s*\|\s*(sh|bash|zsh|eval|source|\.\s))/i;

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
export function isContainerPathCommand(cmd: string): boolean {
  if (!cmd) return false;
  if (CONTAINER_VERB_RE.test(cmd)) return true;
  if (SPAWN_INDIRECTION_RE.test(cmd)) return true;
  if (BASE64_OBFUSCATION_RE.test(cmd)) return true;
  if (ENTRYPOINT_OVERRIDE_RE.test(cmd)) return true;
  if (TEST_RUNNER_BYPASS_RE.test(cmd)) return true;
  if (HEREDOC_DOCKER_RE.test(cmd)) return true;
  if (DOCKER_ANYWHERE_RE.test(cmd)) return true;
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
  /(Bun\.spawnSync|spawnSync|execSync|execFileSync|child_process|fork\(|bash\s+-lc|sh\s+-c|`[\s\S]*docker|docker[\s\S]*`|>\s*\/tmp|<<\s*['"]?(EOF|EOT))/i;

export function isBypassWrite(path: string, content: string): boolean {
  if (SANDBOX_ENGINE_EXEMPT.test(path)) return false;
  // a test/spec file that EXECUTES containers via spawnSync/docker
  if (!/\.(test|spec)\.(ts|js|tsx|jsx)$/.test(path)) return false;
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
    // the CT anti-derailment lexicon (classifyCtExec — the PatternFamily +
    // state machine + evidence triad) decides on bash commands. BLOCK → the
    // per-family warhead (buildCtConfigLockMessage). Non-gate failures are
    // logged non-fatal (the v6 caller shape). The reads + unrelated execs
    // pass untouched — the surgical filter.
    try {
      const ctVerdict = classifyCtExec(cmd);
      if (ctVerdict.verdict === "BLOCK") {
        return { action: "block", gate: "container", reason: buildCtConfigLockMessage(ctVerdict) };
      }
    } catch (e) {
      ctLog("WARN", "container-gate", "the anti-derailment lexicon check failed (non-gate): " + (e instanceof Error ? e.message : String(e)));
    }
    if (isContainerPathCommand(cmd)) {
      return {
        action: "block",
        gate: "container",
        reason: "[CT CONTAINER GATE] raw docker/tmux container commands + bypass indirection are blocked — use the ct-sandbox-test AGENT TOOL (sandbox test), the ONLY sanctioned sandbox path",
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
        reason: "[CT CONTAINER GATE] writing a test file that drives containers is a bypass — use the ct-sandbox-test AGENT TOOL (sandbox test) instead",
      };
    }
    return undefined;
  };
}
