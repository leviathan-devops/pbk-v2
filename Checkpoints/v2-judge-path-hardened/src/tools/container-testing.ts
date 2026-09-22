/**
 * container-testing — first-class OMP port of mimocode's container-testing tool.
 *
 * The mimo action surface (setup/deploy/send/read/check/exec/cp/key/files/logs/
 * screenshot/export/clear/stop/alive/connect/restart/verify-model/verify-agent/
 * switch-model/switch-agent/host-pipeline/suite/report/firewall) re-implemented
 * against the OMP EngineHost (node:fs real impl in-process bun, docker via
 * host.execSync). Headed-TUI driver: the TUI under test runs INSIDE the
 * container in a tmux session; every tmux verb is docker-exec-prefixed.
 *
 * Laws honored: LOUD-FAIL-OR-CLEAR-PASS (unimplemented/failed paths return
 * isError with the failure NAMED, never a substitute artifact); plan-first
 * setup gate (2000+ chars + the 6 required sections); exec firewall gate
 * (docker/tmux host-mutation verbs rejected unless the session disabled it);
 * evidence escape hatch (setup/deploy/suite record the run + clear the claim).
 */
import type { EngineHost, ExecResult } from "../host";
import type { ExtensionAPI, OmpExtensionContext, OmpToolDefinition, OmpToolResult } from "../types/omp";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { sttgfStateTracker } from "../firewalls/semantic-smoke-firewall";
import type { RecordedRunSet } from "../middleware/phantom-gate";
import { formatTuiCatalog, resolveTui } from "./pbk-tui-registry";
import { classifyExec, buildConfigLockMessage } from "../firewalls/pbk-anti-derailment.js";
import { classifyVerb } from "../firewalls/semantic-smoke-firewall";

export const CT_ACTIONS = [
  "setup", "deploy", "send", "read", "check", "exec", "cp", "key",
  "files", "logs", "screenshot", "export", "clear", "stop", "alive",
  "connect", "restart", "verify-model", "verify-agent", "switch-model",
  "switch-agent", "host-pipeline", "suite", "report", "firewall",
  "tui", "shot", "tile", "tuis",
] as const;

export const CT_IMAGE = "runtime-grade-container-sandbox:master";
const DEFAULT_TMUX_SESSION = "test";
const STREAM_FILE = "/tmp/tui-stream.txt";

// NATIVE OMP PROVISIONING (mimo-ct parity): every omp-family container boots
// with a working free model and a live credential — no manual setup, no
// model-picker derailment. Default: openrouter poolside laguna (free tier).
// Overridable per-call via params.modelName / params.smolModel, per-host via
// PBK_DEFAULT_MODEL / PBK_DEFAULT_SMOL.
export const DEFAULT_PBK_MODEL = "poolside/poolside/laguna-s-2.1";
export const DEFAULT_PBK_SMOL = "poolside/poolside/laguna-xs-2.1";
const OMP_FAMILY_TUIS: ReadonlySet<string> = new Set(["omp", "pi"]);

// The in-container provision script (base64-shipped; no key material in argv).
// 1. Reads the openrouter key the BASE IMAGE already carries in the opencode
//    auth store, inserts it into the omp vault (agent.db auth_credentials)
//    when absent, and bumps the vault revision so omp processes re-read.
// 2. Pins modelRoles.default (and smol) in the omp config so the container
//    boots on the provisioned model — the mimo "image config decides the
//    model" rule, with the config made correct at setup instead of by hand.
const PROVISION_PY = [
  "import json, os, sqlite3",
  "oc_path = '/root/.local/share/opencode/auth.json'",
  "db_path = '/root/.omp/agent/agent.db'",
  "cfg_path = '/root/.omp/agent/config.yml'",
  "model = os.environ.get('PROV_MODEL', '').strip()",
  "smol = os.environ.get('PROV_SMOL', '').strip()",
  "notes = []",
  "os.makedirs('/root/.omp/agent', exist_ok=True)",
  "key = None",
  "try:",
  "    entry = json.load(open(oc_path)).get('openrouter') or {}",
  "    key = entry.get('key') if isinstance(entry, dict) else None",
  "except Exception as e:",
  "    notes.append('auth-read-failed:' + type(e).__name__)",
  "if key:",
  "    try:",
  "        db = sqlite3.connect(db_path)",
  "        db.execute(\"CREATE TABLE IF NOT EXISTS auth_credentials (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, credential_type TEXT NOT NULL, data TEXT NOT NULL, disabled_cause TEXT DEFAULT NULL, identity_key TEXT DEFAULT NULL, created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)), updated_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)))\")",
  "        db.execute(\"CREATE TABLE IF NOT EXISTS auth_change_revision (id INTEGER PRIMARY KEY, revision INTEGER)\")",
  "        if db.execute('SELECT COUNT(*) FROM auth_change_revision').fetchone()[0] == 0:",
  "            db.execute('INSERT INTO auth_change_revision (id, revision) VALUES (1, 0)')",
  "        have = db.execute('SELECT COUNT(*) FROM auth_credentials WHERE provider = ? AND credential_type = ?', ('openrouter', 'api_key')).fetchone()[0]",
  "        if have == 0:",
  "            db.execute('INSERT INTO auth_credentials (provider, credential_type, data) VALUES (?, ?, ?)', ('openrouter', 'api_key', json.dumps({'key': key, 'source': 'login'})))",
  "            db.execute('UPDATE auth_change_revision SET revision = revision + 1')",
  "            db.commit()",
  "            notes.append('openrouter-credential:inserted')",
  "        else:",
  "            notes.append('openrouter-credential:present')",
  "        db.close()",
  "    except Exception as e:",
  "        notes.append('openrouter-credential:failed:' + type(e).__name__)",
  "else:",
  "    notes.append('openrouter-credential:no-key-in-image')",
  "if model:",
  "    try:",
  "        cfg = open(cfg_path).read() if os.path.exists(cfg_path) else ''",
  "        lines = cfg.split(chr(10)) if cfg else []",
  "        out = []",
  "        in_roles = False",
  "        saw_roles = False",
  "        saw_default = False",
  "        saw_smol = False",
  "        for ln in lines:",
  "            stripped = ln.strip()",
  "            if stripped == 'modelRoles:':",
  "                in_roles = True",
  "                saw_roles = True",
  "                out.append(ln)",
  "                continue",
  "            if in_roles and stripped and (not ln.startswith(' ')):",
  "                in_roles = False",
  "            if in_roles and stripped.startswith('default:'):",
  "                out.append('  default: ' + model)",
  "                saw_default = True",
  "                continue",
  "            if in_roles and smol and stripped.startswith('smol:'):",
  "                out.append('  smol: ' + smol)",
  "                saw_smol = True",
  "                continue",
  "            out.append(ln)",
  "        if not saw_roles:",
  "            out.append('modelRoles:')",
  "            out.append('  default: ' + model)",
  "            if smol:",
  "                out.append('  smol: ' + smol)",
  "            notes.append('model:roles-created')",
  "        else:",
  "            anchor = next(i for i, l in enumerate(out) if l.strip() == 'modelRoles:')",
  "            if not saw_default:",
  "                out.insert(anchor + 1, '  default: ' + model)",
  "            if smol and not saw_smol:",
  "                out.insert(anchor + 1, '  smol: ' + smol)",
  "            notes.append('model:default-set')",
  "        open(cfg_path, 'w').write(chr(10).join(out))",
  "    except Exception as e:",
  "        notes.append('model:failed:' + type(e).__name__)",
  "print('PROVISION ' + ' '.join(notes))",
].join("\n");

const sanitizeModel = (v: string): string => v.replace(/[^A-Za-z0-9/._:-]/g, "");

// Ships the provision script to the container via base64 (no quoting
// hazards, no key material in any command string) and runs it. Returns the
// PROVISION summary line, e.g. "PROVISION openrouter-credential:inserted model:default-set".
const provisionOmpContainer = (
  dockerExec: (cmd: string, timeoutMs?: number) => ExecResult,
  model: string,
  smol: string,
): string => {
  const b64 = Buffer.from(PROVISION_PY, "utf8").toString("base64");
  const r = dockerExec(
    `printf %s ${shq(b64)} | base64 -d > /tmp/pbk-provision.py && PROV_MODEL=${shq(model)} PROV_SMOL=${shq(smol)} python3 /tmp/pbk-provision.py; rm -f /tmp/pbk-provision.py`,
    30000,
  );
  const line = (r.stdout + "\n" + r.stderr).split("\n").find((l) => l.trim().startsWith("PROVISION"));
  return line ? line.trim() : `PROVISION failed exit=${r.code}`;
};

// Session-scoped firewall (default ON): docker/tmux host-mutation verbs in
// exec are rejected unless THIS session disabled the gate.
// FILE-BACKED per the workspace-scoped-state-boilerplate session-state.ts:
// ~/.omp/agent/state/ct-firewall.json keyed by session ID, atomic tmp+rename
// swap (a concurrent reader never sees torn JSON). Absent/corrupt file →
// empty = default ON for all sessions. Shape mirrors the legacy
// OPENCODE_WORKSPACE ct-firewall.json {sessions:{sid:{enabled,updatedAt}}}.
const CT_FIREWALL_STATE = path.join(os.homedir(), ".omp/agent/state/ct-firewall.json");
type CtFirewallState = { sessions: Record<string, { enabled: boolean; updatedAt: string }> };
function readFirewallState(): CtFirewallState {
  try {
    const parsed = JSON.parse(fs.readFileSync(CT_FIREWALL_STATE, "utf-8")) as CtFirewallState;
    if (!parsed || typeof parsed.sessions !== "object") return { sessions: {} };
    return parsed;
  } catch {
    return { sessions: {} };
  }
}
function persistFirewallOff(off: Set<string>): void {
  const now = new Date().toISOString();
  const sessions: CtFirewallState["sessions"] = {};
  for (const sid of off) sessions[sid] = { enabled: false, updatedAt: now };
  fs.mkdirSync(path.dirname(CT_FIREWALL_STATE), { recursive: true });
  const tmp = CT_FIREWALL_STATE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify({ sessions }, null, 2));
  fs.renameSync(tmp, CT_FIREWALL_STATE);
}
const firewallOff = new Set<string>(
  Object.entries(readFirewallState().sessions)
    .filter(([, v]) => v && v.enabled === false)
    .map(([k]) => k),
);
// Persistent check cursors per container (check scans only new bytes).
const checkCursors = new Map<string, number>();
// Accumulated suite verdicts per container (report writes the artifact).
const suiteVerdicts = new Map<string, Array<Record<string, unknown>>>();
// Setup record per container (plan hash + image + time, for report).
const setupRecord = new Map<string, Record<string, unknown>>();

const sidOf = (ctx?: OmpExtensionContext): string =>
  String((ctx as unknown as Record<string, unknown>)?.sessionID ?? "default");

const sleep = (ms: number): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
};
const cwdOf = (ctx?: OmpExtensionContext): string => ctx?.cwd ?? process.cwd();
// single-quote shell escaping (POSIX idiom: '\'' inside single quotes)
const shq = (s: string): string => "'" + s.replace(/'/g, "'\\''") + "'";

const PLAN_SECTIONS = [
  "OBJECTIVE", "TOOLS UNDER TEST", "TEST SCENARIOS", "ADVERSARIAL", "EVIDENCE", "PASS CRITERIA",
];

/** V-055: a value that is a PATH, not a plan. Detected so the failure can NAME the mistake. */
const PLAN_PATH_RE = /^\s*[\w.@-]*\/[\w./@-]*\.(md|markdown|txt|json|ya?ml)\s*$/;

function planShortfalls(plan: string): string[] {
  const missing: string[] = [];
  // V-055: MEASURED in the container round — a model wrote its plan to /workspace/test-plan.md and passed
  // the PATH as `testPlan`. The gate measured the path's LENGTH (23) and said `length 23 < 2000`: correct
  // to refuse, but the message never named the mistake, and the model spent minutes hunting the source for
  // a format it could not produce. The gate reads the plan TEXT; when the value is obviously a path, SAY SO.
  if (PLAN_PATH_RE.test(plan)) {
    missing.push(
      `testPlan looks like a PATH ("${plan}", ${plan.length} chars) — this gate reads the plan TEXT, not a file. ` +
        `Pass the plan's CONTENTS (paste the text), not a path to it.`,
    );
    return missing;
  }
  if (plan.length < 2000) missing.push(`length ${plan.length} < 2000`);
  const upper = plan.toUpperCase();
  for (const s of PLAN_SECTIONS) if (!upper.includes(s)) missing.push(`missing section: ${s}`);
  const scenarios = (plan.match(/SCENARIO/gi) || []).length;
  if (scenarios < 3) missing.push(`only ${scenarios} scenario markers — 3+ required`);
  return missing;
}

// The exec firewall: host-level docker/tmux mutation verbs are rejected.
// Read-only docker (ps/images/logs/inspect) stays allowed.
const EXEC_BLOCKED = /docker\s+(exec|run|rm|stop|restart|kill|cp|push|load|create|start)\b|tmux\s+(send-keys|new-session|kill-session|pipe-pane|capture-pane)\b/i;

export interface CtDeps {
  host: EngineHost;
  recordedRuns: RecordedRunSet;
}

export function buildContainerTestingTool(pi: ExtensionAPI, deps: CtDeps): OmpToolDefinition {
  const { host, recordedRuns } = deps;

  const zProp = (v: unknown): unknown => {
    const d = v as Record<string, unknown>;
    if (!d) return pi.zod.string();
    if (d.type === "number") return pi.zod.number();
    if (d.type === "boolean") return pi.zod.boolean();
    if (d.type === "array") return pi.zod.array(zProp(d.items));
    if (d.enum) return pi.zod.enum(d.enum as [string, ...string[]]);
    let s = pi.zod.string();
    if (typeof d.minLength === "number") s = s.min(d.minLength as number);
    return s;
  };
  const obj = (properties: Record<string, unknown>, required: string[] = []): unknown => {
    const shape: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(properties)) {
      const base = zProp(v) as { optional: () => unknown };
      shape[k] = required.includes(k) ? base : base.optional();
    }
    return pi.zod.object(shape as Record<string, never>);
  };

  const safe = async (fn: () => Promise<{ text: string; details?: Record<string, unknown>; isError?: boolean }>): Promise<OmpToolResult> => {
    try {
      const r = await fn();
      return {
        content: [{ type: "text" as const, text: r.text }],
        details: { ...(r.details ?? {}), ...(r.isError ? { isError: true } : {}) },
        ...(r.isError ? { isError: true } : {}),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        content: [{ type: "text" as const, text: `CONTAINER-TESTING FAILED (loud): ${msg}` }],
        details: { isError: true, error: msg },
        isError: true,
      };
    }
  };

  return {
    name: "container-testing",
    label: "Container Testing",
    description:
      "Container testing for agents — THE first-class container path in OMP (ported from mimocode). " +
      "setup launches a HEADED TUI in a container (plan-gated; tui=omp|pi|opencode|mimo|mimocode|qwen|qwen-code|grok|grok-build or tuiCommand=). " +
      "Not hardcoded to omp. action=tuis lists presets. deploy/send/read/check/exec/suite/report/firewall match the mimo surface.",
    parameters: obj({
      action: { type: "string", enum: [...CT_ACTIONS] },
      containerName: { type: "string" }, image: { type: "string" }, distPath: { type: "string" },
      agentName: { type: "string" }, modelName: { type: "string" }, testPlan: { type: "string" },
      prompt: { type: "string" }, pattern: { type: "string" }, command: { type: "string" },
      mode: { type: "string" }, maxWaitMs: { type: "number" }, waitForCompletion: { type: "boolean" },
      offset: { type: "number" }, limit: { type: "number" }, key: { type: "string" },
      keys: { type: "array", items: { type: "string" } },
      src: { type: "string" }, dest: { type: "string" }, direction: { type: "string" },
      out: { type: "string" }, suite: { type: "string" }, scenarios: { type: "string" },
      model: { type: "string" }, agent: { type: "string" }, provider: { type: "string" },
      tmuxSessionName: { type: "string" }, sessionName: { type: "string" },
      memoryLimitMb: { type: "number" }, cpuLimit: { type: "string" },
      adopt: { type: "boolean" }, smolModel: { type: "string" },
      timeoutMs: { type: "number" }, enable: { type: "string" }, cleanup: { type: "boolean" },
      volumes: { type: "array", items: { type: "string" } },
      tui: { type: "string" }, tuiCommand: { type: "string" }, path: { type: "string" },
      localPath: { type: "string" }, containerPath: { type: "string" },
      fromBytes: { type: "number" }, sandbox: { type: "string" },
    }, ["action"]),
    loadMode: "essential",
    defaultInactive: false,
    execute: async (_id: string | number, params: Record<string, unknown>, _sig: unknown, _upd: unknown, ctx?: OmpExtensionContext) => safe(async () => {
      const action = String(params.action ?? "");
      if (!(CT_ACTIONS as readonly string[]).includes(action)) {
        return { text: `CONTAINER-TESTING FAILED: unknown action "${action}" — use ${CT_ACTIONS.join("|")}`, isError: true };
      }
      const sid = sidOf(ctx);
      // ── V-080 (ocr CRITICAL): THE CONTAINER NAME IS A SHELL-INJECTION VECTOR ────────────────────────
      // MEASURED (an `ocr scan` over the enforcement core found this, the only live CRITICAL of 6):
      // `params.containerName` is MODEL-CONTROLLED and was interpolated UNQUOTED into ten host docker
      // commands (`docker exec ${name}`, `docker rm -f ${name}`, `docker ps --filter … ${name}`, …) while
      // only the inner command used `shq()`. A model that set `containerName` to `x; <anything>` executed
      // that anything on the HOST — i.e. **the subject of enforcement could escape the tool's own
      // firewall**, which is precisely the class this extension exists to prevent.
      // FIX: validate the name BEFORE any interpolation (docker's own grammar is
      // `[a-zA-Z0-9][a-zA-Z0-9_.-]*`). One guard covers every site.
      const rawName = String(params.containerName ?? "pbk");
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,62}$/.test(rawName)) {
        return {
          text:
            `CONTAINER-TESTING FAILED: containerName ${JSON.stringify(rawName)} is not a valid docker name. ` +
            'REFUSED — the name is interpolated into host docker commands, so an unvalidated value is a ' +
            'shell-injection vector (V-080). Use letters/digits/underscore/dot/hyphen, start with alnum.',
          isError: true,
        };
      }
      const name = rawName;
      const image = String(params.image ?? CT_IMAGE);
      const session = String(params.tmuxSessionName ?? params.sessionName ?? DEFAULT_TMUX_SESSION);
      const dockerExec = (cmd: string, timeoutMs = 20000): ExecResult =>
        host.execSync(`docker exec ${name} sh -c ${shq(cmd)}`, { timeoutMs });

      // Evidence escape hatch parity: a REAL run clears the claim gate.
      // v6 :2531-2532 — the VERBATIM tracker, not the local one.
      if (["setup", "deploy", "suite"].includes(action)) {
        recordedRuns.record("container-testing");
        recordedRuns.record("ct-sandbox-test");
        sttgfStateTracker.setContainerTestRan(sid, true);
        sttgfStateTracker.setVerificationClaimed(sid, false);
      }

      if (action === "firewall") {
        const mode = String(params.enable ?? "status").toLowerCase();
        if (mode === "status") {
          return { text: `CT FIREWALL: ${firewallOff.has(sid) ? "DISABLED" : "ENABLED"} (scope session ${sid})` };
        }
        if (mode === "disable") {
          firewallOff.add(sid);
          persistFirewallOff(firewallOff);
          return { text: `CT FIREWALL: DISABLED for session ${sid} (docker/tmux exec verbs allowed)` };
        }
        if (mode === "enable") {
          firewallOff.delete(sid);
          persistFirewallOff(firewallOff);
          return { text: `CT FIREWALL: ENABLED for session ${sid}` };
        }
        return { text: `CT FIREWALL FAILED: enable must be enable|disable|status, got "${mode}"`, isError: true };
      }

      if (action === "tuis") {
        return { text: formatTuiCatalog(), details: { action: "tuis" } };
      }

      if (action === "setup") {
        const plan = String(params.testPlan ?? "");
        const shortfalls = planShortfalls(plan);
        if (shortfalls.length > 0) {
          return { text: `CT SETUP FAILED (plan gate): ${shortfalls.join("; ")}`, isError: true };
        }
        const tuiName = String(params.tui ?? "").trim();
        const which = tuiName.length > 0
          ? host.execSync(`command -v ${shq(tuiName)} 2>/dev/null || true`).stdout.trim()
          : "";
        const resolved = resolveTui({
          tui: params.tui !== undefined ? String(params.tui) : undefined,
          tuiCommand: params.tuiCommand !== undefined ? String(params.tuiCommand) : (params.command !== undefined ? String(params.command) : undefined),
          image: params.image !== undefined ? String(params.image) : undefined,
          hostBinary: which.length > 0 ? which : null,
        });
        if (!resolved.ok) return { text: resolved.error, isError: true };
        const tui = resolved.value;
        for (const b of tui.binds) {
          if (!host.existsSync(b.host)) {
            return { text: `CT SETUP FAILED: tui ${tui.id} bind missing on host: ${b.host}`, isError: true };
          }
        }
        // ADOPT (ported from mimo-ct): adopt=true on an already-Up container
        // skips the rm+run so in-container state (installed deps, built trees,
        // populated stores) survives a setup re-invocation.
        const psOut = host.execSync(`docker ps --filter "name=^${name}$" --format "{{.Status}}"`, { timeoutMs: 10000 });
        const adopting = params.adopt === true && psOut.stdout.trim().length > 0;
        if (!adopting) host.execSync(`docker rm -f ${name} 2>/dev/null`);
        const memMb = params.memoryLimitMb !== undefined ? Number(params.memoryLimitMb) : 4096;
        const mem = `--memory ${memMb}m`;
        const cpus = params.cpuLimit !== undefined ? `--cpus ${String(params.cpuLimit)}` : "--cpus 4";
        const callerVols = Array.isArray(params.volumes)
          ? (params.volumes as unknown[]).map((v) => `-v ${String(v)}`).join(" ")
          : "";
        const bindVols = tui.binds.map((b) => `-v ${b.host}:${b.container}:ro`).join(" ");
        // docker.sock passthrough (mimo-ct parity): nested docker for in-container builds.
        const socketFlag = host.existsSync("/var/run/docker.sock") ? " -v /var/run/docker.sock:/var/run/docker.sock" : "";
        const envFile = host.existsSync("/home/leviathan/.omp/agent/.env") ? " --env-file /home/leviathan/.omp/agent/.env" : "";
        if (!adopting) {
          const run = host.execSync(
            `docker run -d --name ${name} --label pbk=owned ${mem} ${cpus}${socketFlag}${envFile} ${bindVols} ${callerVols} ${tui.image} sleep infinity`,
            { timeoutMs: 120000 },
          );
          if (run.code !== 0) return { text: `CT SETUP FAILED: docker run -> ${(run.stderr || run.stdout).slice(0, 500)}`, isError: true };
        }
        const probe = dockerExec(`echo CT_UP`);
        if (probe.code !== 0 || !probe.stdout.includes("CT_UP")) {
          return { text: `CT SETUP FAILED: container ${name} does not answer exec: ${(probe.stderr || probe.stdout).slice(0, 300)}`, isError: true };
        }
        dockerExec(`mkdir -p ${tui.workdir}`);
        // NATIVE PROVISION (mimo-ct parity): omp-family containers get the
        // openrouter credential (from the base image's own auth store) and the
        // pinned default model BEFORE the TUI boots — no manual setup step.
        let provisionSummary: string | null = null;
        if (OMP_FAMILY_TUIS.has(tui.id)) {
          const modelParam = typeof params.modelName === "string" && String(params.modelName).includes("/") ? String(params.modelName) : "";
          const smolParam = typeof params.smolModel === "string" && String(params.smolModel).includes("/") ? String(params.smolModel) : "";
          const model = sanitizeModel(modelParam || process.env.PBK_DEFAULT_MODEL || DEFAULT_PBK_MODEL);
          const smol = sanitizeModel(smolParam || process.env.PBK_DEFAULT_SMOL || DEFAULT_PBK_SMOL);
          provisionSummary = provisionOmpContainer(dockerExec, model, smol);
        }
        const tmuxCheck = dockerExec("command -v tmux");
        if (tmuxCheck.code !== 0 || !tmuxCheck.stdout.trim()) {
          const install = dockerExec("apt-get update -qq && apt-get install -y -qq tmux >/tmp/tmux-install.log 2>&1; command -v tmux", 90000);
          if (install.code !== 0 || !install.stdout.trim()) {
            return { text: `CT SETUP FAILED: tmux not in ${tui.image} and install failed`, isError: true };
          }
        }
        dockerExec(`tmux kill-session -t ${session} 2>/dev/null; rm -f ${STREAM_FILE}; true`);
        const boot = dockerExec(`tmux new-session -d -s ${session} -x 240 -y 60 && echo NEW_OK`);
        if (!boot.stdout.includes("NEW_OK")) {
          return { text: `CT SETUP FAILED: tmux new-session -> ${(boot.stderr || boot.stdout).slice(0, 400)}`, isError: true };
        }
        // PIPE-PANE RETRY (ported from mimo-ct): 5 attempts, then a stream
        // reset so setup noise never pollutes the evidence stream.
        let pipeOk = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
          const pr = dockerExec(`tmux pipe-pane -t ${session} -o ${shq(`cat >> ${STREAM_FILE}`)} && echo PIPE_OK`);
          if (pr.stdout.includes("PIPE_OK")) { pipeOk = true; break; }
          await sleep(300);
        }
        if (!pipeOk) return { text: `CT SETUP FAILED: pipe-pane not established for ${name}`, isError: true };
        dockerExec(`: > ${STREAM_FILE}`);
        dockerExec(`tmux send-keys -t ${session} -l ${shq(`cd ${tui.workdir} && ${tui.command}`)}`);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        await sleep(1500);
        // TRUST-DIALOG AUTO-CLEAR (ported from mimo-ct): a fresh container's
        // first TUI shows the trust-this-folder prompt — the status bar never
        // renders until it is answered (Enter).
        for (let i = 0; i < 6; i++) {
          const pane = dockerExec(`tmux capture-pane -t ${session} -p 2>/dev/null`).stdout;
          if (/trust this folder|trust the files|No, exit/i.test(pane)) {
            dockerExec(`tmux send-keys -t ${session} Enter`);
            await sleep(1200);
            break;
          }
          if (/◒|π/.test(pane)) break;
          await sleep(1200);
        }
        const live = dockerExec(`tmux has-session -t ${session} 2>/dev/null && echo HAS_SESSION`);
        if (!live.stdout.includes("HAS_SESSION")) {
          return { text: `CT SETUP FAILED: headed session "${session}" not up after launching tui=${tui.id}`, isError: true };
        }
        // STATUS-BAR WAIT (ported from mimo-ct): poll until the model line
        // renders so callers get a booted-and-modeled container, not a guess.
        let statusBarText = "";
        for (let i = 0; i < 15; i++) {
          statusBarText = dockerExec(`tmux capture-pane -p -t ${session} -e 2>/dev/null | tail -5`).stdout;
          if (/◒|π/.test(statusBarText)) break;
          await sleep(1000);
        }
        let hash = 0;
        for (let i = 0; i < plan.length; i++) hash = (hash * 31 + plan.charCodeAt(i)) >>> 0;
        setupRecord.set(name, { image: tui.image, tui: tui.id, command: tui.command, planChars: plan.length, planHash: hash.toString(16), at: host.now(), provision: provisionSummary });
        checkCursors.delete(name);
        const barLine = statusBarText.split("\n").map((l) => l.replace(/\x1b\[[0-9;]*m/g, "").trim()).filter(Boolean).pop() ?? "";
        return {
          text: `CT SETUP: ${name} up image=${tui.image} tui=${tui.id} (${tui.source}) cmd=${tui.command} headed=${session} plan=${plan.length} hash=${hash.toString(16)}${adopting ? " adopted=true" : ""}${provisionSummary ? ` | ${provisionSummary}` : ""}${barLine ? ` | bar: ${barLine}` : ""}`,
          details: { container: name, image: tui.image, tui: tui.id, command: tui.command, source: tui.source, session, planChars: plan.length, tuiUp: true, adopted: adopting, provision: provisionSummary, statusBar: barLine },
        };
      }

      if (action === "tui") {
        const rec = setupRecord.get(name);
        const resolved = resolveTui({
          tui: params.tui !== undefined ? String(params.tui) : (rec && typeof rec.tui === "string" ? rec.tui : undefined),
          tuiCommand: params.tuiCommand !== undefined ? String(params.tuiCommand) : (params.command !== undefined ? String(params.command) : (rec && typeof rec.command === "string" ? rec.command : undefined)),
          image: params.image !== undefined ? String(params.image) : undefined,
        });
        if (!resolved.ok) return { text: resolved.error.replace("CT SETUP FAILED", "CT TUI FAILED"), isError: true };
        const tui = resolved.value;
        const tmuxCheck = dockerExec("command -v tmux");
        if (tmuxCheck.code !== 0 || !tmuxCheck.stdout.trim()) {
          return { text: `CT TUI FAILED: tmux not found in ${name}`, isError: true };
        }
        dockerExec(`mkdir -p ${tui.workdir}`);
        // PARITY with setup (mimo-ct): a relaunched TUI re-asserts the native
        // provision (idempotent) so a container never boots on a stale model.
        let tuiProvision: string | null = null;
        if (OMP_FAMILY_TUIS.has(tui.id)) {
          tuiProvision = provisionOmpContainer(
            dockerExec,
            sanitizeModel(process.env.PBK_DEFAULT_MODEL || DEFAULT_PBK_MODEL),
            sanitizeModel(process.env.PBK_DEFAULT_SMOL || DEFAULT_PBK_SMOL),
          );
        }
        dockerExec(`tmux kill-session -t ${session} 2>/dev/null; rm -f ${STREAM_FILE}; true`);
        const boot = dockerExec(`tmux new-session -d -s ${session} -x 240 -y 60 && echo NEW_OK`);
        if (!boot.stdout.includes("NEW_OK")) return { text: `CT TUI FAILED: new-session -> ${(boot.stderr || boot.stdout).slice(0, 400)}`, isError: true };
        let tuiPipeOk = false;
        for (let attempt = 1; attempt <= 5; attempt++) {
          const pr = dockerExec(`tmux pipe-pane -t ${session} -o ${shq(`cat >> ${STREAM_FILE}`)} && echo PIPE_OK`);
          if (pr.stdout.includes("PIPE_OK")) { tuiPipeOk = true; break; }
          await sleep(300);
        }
        if (!tuiPipeOk) return { text: `CT TUI FAILED: pipe-pane not established for ${name}`, isError: true };
        dockerExec(`: > ${STREAM_FILE}`);
        dockerExec(`tmux send-keys -t ${session} -l ${shq(`cd ${tui.workdir} && ${tui.command}`)}`);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        await sleep(1500);
        for (let i = 0; i < 6; i++) {
          const pane = dockerExec(`tmux capture-pane -t ${session} -p 2>/dev/null`).stdout;
          if (/trust this folder|trust the files|No, exit/i.test(pane)) {
            dockerExec(`tmux send-keys -t ${session} Enter`);
            await sleep(1200);
            break;
          }
          if (/◒|π/.test(pane)) break;
          await sleep(1200);
        }
        const live = dockerExec(`tmux has-session -t ${session} 2>/dev/null && echo HAS_SESSION`);
        if (!live.stdout.includes("HAS_SESSION")) {
          return { text: `CT TUI FAILED: session "${session}" not up in ${name} (tui=${tui.id})`, isError: true };
        }
        return { text: `CT TUI: session "${session}" up in ${name} tui=${tui.id} cmd=${tui.command} stream=${STREAM_FILE}${tuiProvision ? ` | ${tuiProvision}` : ""}`, details: { session, container: name, tui: tui.id, command: tui.command, stream: STREAM_FILE, provision: tuiProvision } };
      }

      if (action === "send") {
        const prompt = String(params.prompt ?? params.testPlan ?? "");
        if (!prompt) return { text: "CT SEND FAILED: prompt required", isError: true };
        const mode = String(params.mode ?? "queue").toLowerCase();
        if (mode === "interrupt") dockerExec(`tmux send-keys -t ${session} Escape Escape`);
        dockerExec(`tmux send-keys -t ${session} -l ${shq(prompt)}`);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        if (params.waitForCompletion === true) {
          const budget = Math.min(Math.max(Number(params.maxWaitMs ?? 90000) || 90000, 5000), 600000);
          const start = Date.now();
          let lastSize = -1;
          let stableSince = Date.now();
          while (Date.now() - start < budget) {
            const sz = Number(dockerExec(`wc -c < ${STREAM_FILE} 2>/dev/null || echo 0`).stdout.trim()) || 0;
            if (sz === lastSize) {
              if (Date.now() - stableSince > 8000) break; // quiet for 8s = done
            } else { lastSize = sz; stableSince = Date.now(); }
            await sleep(2000);
          }
          const tail = dockerExec(`tail -c 2000 ${STREAM_FILE} 2>/dev/null`).stdout;
          return { text: `CT SEND: completed:true — stream ${lastSize} bytes, tail: ${tail.slice(-500)}`, details: { completed: true, bytes: lastSize, responseSlice: tail.slice(-2000) } };
        }
        return { text: "CT SEND: queued (waitForCompletion not set — use read/check to observe)", details: { completed: false } };
      }

      if (action === "read") {
        const off = Math.max(0, Number(params.offset ?? params.fromBytes ?? 0) || 0);
        const lim = Math.min(Math.max(Number(params.limit ?? 50) || 50, 1), 500);
        const size = Number(dockerExec(`wc -l < ${STREAM_FILE} 2>/dev/null || echo 0`).stdout.trim()) || 0;
        // V-015 FIX: the arithmetic was written as `$((off + lim))` INSIDE a JS template literal, which is
        // NOT an interpolation — the identifiers `off` and `lim` reached sed LITERALLY, sed answered
        // "unknown command: `(`", and `2>/dev/null` swallowed it. The result was a correct-looking header
        // ("CT READ lines 1-12/190:") over an EMPTY body, three times, on two containers. Measured in the
        // rig: `sed -n '1,$((off + lim))p'` -> `sed: unknown command: '('`; `sed -n '1,50p'` -> content.
        const slice = dockerExec(`sed -n '${off + 1},${off + lim}p' ${STREAM_FILE} 2>/dev/null`).stdout;
        // And the silent failure is now impossible: a header over an empty body is a FAILURE, not a reading.
        // (read is the ONLY sanctioned observation channel once the containerGate blocks raw host-shell
        // container verbs — a bodyless read leaves container-round adjudication with nothing to observe.)
        if (size > 0 && off < size && !slice.trim()) {
          return {
            text:
              `CT READ FAILED: ${STREAM_FILE} has ${size} line(s) but the slice ${off + 1}-${off + lim} came back EMPTY. ` +
              `Nothing was observed — do NOT read this as an empty pane (V-015). Check the file and the range.`,
            isError: true,
            details: { offset: off, limit: lim, totalLines: size, empty: true },
          };
        }
        // ── V-054: A STREAM THAT IS NOT BEING WRITTEN IS NOT AN OBSERVATION ──────────────────────
        // The stream is fed by `tmux pipe-pane -t <session> -o 'cat >> /tmp/tui-stream.txt'` at setup.
        // MEASURED in the rig: `pane_pipe` read 0 (no pipe attached) and the file's mtime was FIVE HOURS
        // old while the TUI was answering prompts — because the pipe belongs to the pane that was active
        // at setup, and the active window changes. `read` returned that stale file as a reading: content
        // that LOOKS like evidence and is not. Live ground truth is `tmux capture-pane`.
        const pipe = dockerExec(`tmux display-message -p -t ${session} '#{pane_pipe}' 2>/dev/null`).stdout.trim();
        if (pipe !== "1") {
          const live = dockerExec(`tmux capture-pane -p -t ${session} 2>/dev/null`).stdout;
          const lines = live.split("\n").filter((l) => l.trim().length > 0);
          const take = lines.slice(Math.max(0, lines.length - lim));
          return {
            text:
              `CT READ (LIVE PANE — the stream pipe is NOT attached: pane_pipe=${pipe || "0"}; ` +
              `${STREAM_FILE} is stale and must not be read as evidence):\n` +
              `CT READ lines ${off + 1}-${off + lim}/${size} (stream) -> superseded by capture-pane:\n` +
              take.join("\n").slice(0, 4000),
            details: { offset: off, limit: lim, totalLines: size, livePane: true, pipe: pipe || "0" },
          };
        }
        return { text: `CT READ lines ${off + 1}-${off + lim}/${size}:\n${slice.slice(0, 4000)}`, details: { offset: off, limit: lim, totalLines: size } };
      }

      if (action === "check") {
        const pattern = String(params.pattern ?? "");
        if (!pattern) return { text: "CT CHECK FAILED: pattern required", isError: true };
        let re: RegExp;
        try { re = new RegExp(pattern); } catch (e) {
          return { text: `CT CHECK FAILED: bad regex /${pattern}/`, isError: true };
        }
        const cursor = checkCursors.get(name) ?? 0;
        const raw = dockerExec(`cat ${STREAM_FILE} 2>/dev/null`).stdout;
        const fresh = raw.slice(cursor);
        checkCursors.set(name, raw.length);
        const m = re.exec(fresh);
        if (!m) return { text: `CT CHECK: NO MATCH /${pattern}/ in ${fresh.length} new bytes (${raw.length} total)`, details: { match: false, pattern, newBytes: fresh.length } };
        const at = cursor + m.index;
        const excerpt = raw.slice(Math.max(0, at - 60), at + 60).replace(/\x1b/g, "\\e");
        return { text: `CT CHECK: MATCH@${at} /${pattern}/ …${excerpt}…`, details: { match: true, offset: at, pattern } };
      }

      if (action === "key") {
        const rawKeys: string[] = Array.isArray(params.keys)
          ? (params.keys as unknown[]).map(String)
          : [String(params.key ?? "")].filter((k) => k.length > 0);
        if (rawKeys.length === 0) return { text: "CT KEY FAILED: key or keys[] required", isError: true };
        const PLAIN: Record<string, string> = {
          up: "Up", down: "Down", left: "Left", right: "Right",
          pageup: "PageUp", pagedown: "PageDown", home: "Home", end: "End",
          enter: "Enter", space: "Space", escape: "Escape", backspace: "BSpace", tab: "Tab",
        };
        const sent: string[] = [];
        const failed: string[] = [];
        for (const k of rawKeys) {
          const lk = k.toLowerCase();
          const r = PLAIN[lk]
            ? dockerExec(`tmux send-keys -t ${session} ${PLAIN[lk]}`)
            : dockerExec(`tmux send-keys -t ${session} -l ${shq(k)}`);
          if (r.code === 0) sent.push(k); else failed.push(`${k}: ${(r.stderr || r.stdout).slice(0, 200)}`);
        }
        if (failed.length > 0) return { text: `CT KEY: sent [${sent.join(", ") || "none"}] | FAILED [${failed.join("; ")}]`, isError: true };
        return { text: `CT KEY: ${sent.join(", ")}` };
      }

      if (action === "shot" || action === "screenshot") {
        const out = String(params.out ?? "/tmp/tui-shot.txt");
        const r = dockerExec(`tmux capture-pane -p -t ${session} -e > ${out}; wc -c < ${out}`);
        if (r.code !== 0) return { text: `CT SHOT FAILED: ${(r.stderr || r.stdout).slice(0, 500)}`, isError: true };
        const pane = dockerExec(`cat ${out}`).stdout;
        return { text: `CT SHOT: ${pane.slice(0, 2000)}`, details: { path: out, chars: pane.length } };
      }

      if (action === "files") {
        const p = String(params.path ?? "/app/ct");
        const r = dockerExec(`ls -la ${p}`);
        if (r.code !== 0) return { text: `CT FILES FAILED (${p})`, isError: true };
        return { text: `CT FILES ${p}:\n${r.stdout.slice(0, 3000)}`, details: { path: p } };
      }

      if (action === "logs") {
        const r = host.execSync(`docker logs --tail 200 ${name} 2>&1`);
        return { text: `CT LOGS (tail 200):\n${r.stdout.slice(-6000)}` };
      }

      if (action === "exec") {
        const cmd = String(params.command ?? "");
        if (!cmd) return { text: "CT EXEC FAILED: command required", isError: true };
        if (!firewallOff.has(sid)) {
          // THE ANTI-DERAILMENT LEXICON (spec item 7 — port of v6
          // container-test.ts:2489): classifyExec (the state machine —
          // the regex = the detector only) → BLOCK emits the per-family
          // [PBK CONFIG LOCK] warhead + the evidence triad. Reads +
          // unrelated execs pass untouched.
          try {
            const ctVerdict = classifyExec(cmd);
            if (ctVerdict.verdict === "BLOCK") {
              return { text: buildConfigLockMessage(ctVerdict), isError: true };
            }
          } catch { /* non-gate failure — fall through to the verb firewall */ }
          // THE HEADLESS FIREWALL — command dispatch surface: classifyVerb's
          // headless verb IS the detector (v6 semantic-smoke-firewall.ts:252).
          if (classifyVerb("bash", { command: cmd }) === "headless") {
            return { text: "Headless exec forbidden. Use TUI.", isError: true };
          }
        }
        if (!firewallOff.has(sid) && EXEC_BLOCKED.test(cmd)) {
          return { text: `CT EXEC BLOCKED (firewall ON, session ${sid}): "${cmd.slice(0, 120)}" contains a docker/tmux host-mutation verb — use the tool actions (setup/send/cp/…) or firewall enable=disable`, isError: true };
        }
        const r = dockerExec(cmd, Math.min(Math.max(Number(params.timeoutMs ?? 30000) || 30000, 1000), 300000));
        if (r.code !== 0) return { text: `CT EXEC FAILED (exit ${r.code}): ${(r.stderr || r.stdout).slice(0, 2000)}`, details: { isError: true, code: r.code }, isError: true };
        return { text: `CT EXEC: ${r.stdout.slice(0, 2000)}`, details: { code: 0 } };
      }
      if (action === "cp") {
        const local = String(params.src ?? params.localPath ?? "");
        const target = String(params.dest ?? params.containerPath ?? "");
        const dir = String(params.direction ?? "to").toLowerCase();
        if (!local || !target) return { text: "CT CP FAILED: src/localPath + dest/containerPath required", isError: true };
        if (dir !== "from" && !firewallOff.has(sid)) {
          // THE ANTI-DERAILMENT LEXICON — the cp-INTO-CONTAINER guard
          // (spec item 7 — port of v6 container-test.ts:2521): a copy
          // landing on a protected opencode path (config.json/auth.json/
          // opencode.db) is the config-fumbling class by another verb —
          // the same [PBK CONFIG LOCK]. Fixture/workspace copies pass.
          try {
            const cpProtected = classifyExec("cp x " + target);
            if (cpProtected.verdict === "BLOCK") {
              return { text: buildConfigLockMessage(cpProtected), isError: true };
            }
          } catch { /* non-gate failure — the copy proceeds */ }
        }
        const r = dir === "from"
          ? host.execSync(`docker cp ${name}:${local} ${target}`)
          : host.execSync(`docker exec ${name} mkdir -p ${target.replace(/\/[^/]*$/, "")} && docker cp ${local} ${name}:${target}`);
        if (r.code !== 0) return { text: `CT CP FAILED: ${(r.stderr || r.stdout).slice(0, 500)}`, isError: true };
        return { text: `CT CP: ${dir === "from" ? `${name}:${local} -> ${target}` : `${local} -> ${name}:${target}`}` };
      }

      if (action === "deploy") {
        // V-016 FIX: `deploy` was declared in CT_ACTIONS but had NO dispatcher branch — the documented
        // sync verb fell through to the "unhandled (loud)" return, so a freshly created rig could carry a
        // dist that did not match the host's (measured: container 6ea49fb8aba2b821 vs deployed
        // e1bd1dbad665d83f) and the ONLY way to repair the sha trio was a manual `action=cp`. This is that
        // repair, sanctioned, with the verification the trio needs.
        const local = String(params.distPath ?? params.src ?? "dist/index.js");
        const target = String(params.dest ?? params.containerPath ?? "/root/.omp/agent/extensions/pbk/dist.js");
        if (!local) return { text: "CT DEPLOY FAILED: distPath (or src) required", isError: true };
        // The same cp-into-container guard the `cp` verb runs: a deploy must not become a way to write a
        // protected opencode path.
        if (!firewallOff.has(sid)) {
          try {
            const protectedHit = classifyExec("cp x " + target);
            if (protectedHit.verdict === "BLOCK") return { text: buildConfigLockMessage(protectedHit), isError: true };
          } catch { /* non-gate failure — the deploy proceeds */ }
        }
        const localSha = (host.execSync(`sha256sum ${shq(local)} 2>/dev/null`).stdout.trim().split(/\s+/)[0] ?? "");
        if (!localSha) return { text: `CT DEPLOY FAILED: cannot read ${local} on the host`, isError: true };
        const r = host.execSync(
          `docker exec ${name} mkdir -p ${shq(target.replace(/\/[^/]*$/, ""))} && docker cp ${shq(local)} ${name}:${shq(target)}`,
          { timeoutMs: 30000 },
        );
        if (r.code !== 0) return { text: `CT DEPLOY FAILED: ${(r.stderr || r.stdout).slice(0, 500)}`, isError: true };
        const containerSha = (dockerExec(`sha256sum ${target} 2>/dev/null`).stdout.trim().split(/\s+/)[0] ?? "");
        const match = containerSha === localSha;
        return {
          text:
            `CT DEPLOY: ${local} -> ${name}:${target}\n` +
            `  local     ${localSha.slice(0, 16)}\n` +
            `  container ${containerSha.slice(0, 16) || "(unreadable)"}\n` +
            (match
              ? `  sha trio REPAIRED — the rig now carries the host's build.`
              : `  MISMATCH — the rig does NOT carry the host's build; do not run a round against it.`),
          isError: !match,
          details: { localSha, containerSha, match, target },
        };
      }

      if (action === "export") {
        const cpath = String(params.src ?? params.containerPath ?? "");
        const lpath = String(params.dest ?? params.localPath ?? "");
        if (!cpath || !lpath) return { text: "CT EXPORT FAILED: src/containerPath + dest/localPath required", isError: true };
        const r = host.execSync(`docker cp ${name}:${cpath} ${lpath}`);
        if (r.code !== 0) return { text: `CT EXPORT FAILED: ${(r.stderr || r.stdout).slice(0, 500)}`, isError: true };
        return { text: `CT EXPORT: ${name}:${cpath} -> ${lpath}` };
      }

      if (action === "clear") {
        dockerExec(`rm -f ${STREAM_FILE}; tmux clear-history -t ${session} 2>/dev/null; true`);
        checkCursors.set(name, 0);
        return { text: `CT CLEAR: stream truncated, check cursor reset for ${name}` };
      }

      if (action === "stop") {
        if (String(params.cleanup ?? "false") === "true" || params.cleanup === true) {
          // host-pipeline cleanup: destroy sibling containers sharing the prefix
          host.execSync(`docker ps -a --format '{{.Names}}' | grep '^${name}-' | xargs -r docker rm -f 2>/dev/null`);
        }
        const r = host.execSync(`docker rm -f ${name}`);
        suiteVerdicts.delete(name);
        checkCursors.delete(name);
        return { text: `CT STOP: ${r.stdout.trim() || r.stderr.trim() || name + " removed"}` };
      }

      if (action === "alive") {
        const ps = host.execSync(`docker ps --filter name=^${name}$ --format '{{.Names}}'`).stdout.trim();
        const tmux = dockerExec(`tmux has-session -t ${session} 2>/dev/null && echo TMUX_UP || echo TMUX_DOWN`).stdout.trim();
        return { text: `CT ALIVE: container ${ps === name ? "RUNNING" : "DOWN"} | tmux ${tmux || "UNKNOWN"}`, details: { containerUp: ps === name, tmux } };
      }

      if (action === "connect") {
        const ps = host.execSync(`docker ps --filter name=^${name}$ --format '{{.Names}}'`).stdout.trim();
        if (ps !== name) return { text: `CT CONNECT FAILED: container ${name} not running`, isError: true };
        const tmux = dockerExec(`tmux has-session -t ${session} 2>/dev/null && echo TMUX_UP || echo TMUX_DOWN`).stdout.trim();
        const rec = setupRecord.get(name);
        return { text: `CT CONNECT: ${name} RUNNING, tmux ${tmux || "UNKNOWN"}, session "${session}"${rec ? ` (setup ${JSON.stringify(rec)})` : " (no setup record this process)"}`, details: { container: name, tmux, setup: rec ?? null } };
      }

      if (action === "restart") {
        const r = host.execSync(`docker restart ${name}`, { timeoutMs: 60000 });
        if (r.code !== 0) return { text: `CT RESTART FAILED: ${(r.stderr || r.stdout).slice(0, 500)}`, isError: true };
        const probe = dockerExec(`echo CT_UP`, 30000);
        const tmux = dockerExec(`tmux has-session -t ${session} 2>/dev/null && echo TMUX_UP || echo TMUX_DOWN`).stdout.trim();
        return { text: `CT RESTART: ${name} restarted — exec ${probe.stdout.includes("CT_UP") ? "OK" : "DEAD"}, tmux ${tmux || "UNKNOWN"} (re-run tui if the session died with the daemon)`, details: { execOk: probe.stdout.includes("CT_UP"), tmux } };
      }

      const statusBar = (): string =>
        dockerExec(`tmux capture-pane -p -t ${session} -e 2>/dev/null | tail -5`).stdout;

      if (action === "verify-model" || action === "verify-agent") {
        const bar = statusBar();
        // omp status triple: [agent] · [model] [provider]; mimo: similar bar.
        const m = bar.match(/([A-Za-z0-9_. -]+?)\s*[·|]\s*([A-Za-z0-9_. ()/-]+?)\s+([A-Za-z0-9_.-]+)\s*$/m)
          ?? bar.match(/(CT|ct|build|main)\s*[·•]\s*(.+?)\s+(\S+)\s*$/m);
        if (!m) return { text: `CT ${action === "verify-model" ? "VERIFY-MODEL" : "VERIFY-AGENT"}: status bar unparseable — tail:\n${bar.slice(-500)}`, details: { raw: bar.slice(-1000) } };
        return { text: `CT ${action === "verify-model" ? "VERIFY-MODEL" : "VERIFY-AGENT"}: agent="${m[1].trim()}" model="${m[2].trim()}" provider="${m[3].trim()}"`, details: { agent: m[1].trim(), model: m[2].trim(), provider: m[3].trim() } };
      }

      if (action === "switch-model" || action === "switch-agent") {
        const want = String(params.model ?? params.agent ?? "");
        if (!want) return { text: `CT ${action.toUpperCase()} FAILED: model/agent display name required`, isError: true };
        const picker = action === "switch-model" ? "/models" : "/agents";
        dockerExec(`tmux send-keys -t ${session} Escape Escape`);
        await sleep(500);
        dockerExec(`tmux send-keys -t ${session} -l ${shq(picker)}`);
        await sleep(1000);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        await sleep(3000);
        dockerExec(`tmux send-keys -t ${session} -l ${shq(want)}`);
        await sleep(2000);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        await sleep(2000);
        dockerExec(`tmux send-keys -t ${session} Enter`);
        await sleep(6000);
        const bar = statusBar();
        const ok = bar.toLowerCase().includes(want.toLowerCase().split(" ")[0]);
        return { text: `CT ${action.toUpperCase()}: picker driven for "${want}" — status bar ${ok ? "SHOWS it" : "does NOT show it (verify manually)"}:\n${bar.slice(-300)}`, details: { want, verified: ok, bar: bar.slice(-500) } };
      }

      if (action === "suite") {
        const which = String(params.suite ?? "quick").toLowerCase();
        const rawScenarios = String(params.scenarios ?? "");
        let list: Array<{ prompt: string; pattern: string; maxWaitMs?: number }>;
        if (!rawScenarios) {
          list = which === "full" || which === "standard"
            ? [
                { prompt: "Reply with exactly: CT_ALIVE_OK", pattern: "CT_ALIVE_OK", maxWaitMs: 120000 },
                { prompt: "Reply with your current agent and model as: CT_IDENTITY agent=<agent> model=<model>", pattern: "CT_IDENTITY", maxWaitMs: 120000 },
                { prompt: "List the tools you can call, one per line, then end with: CT_TOOLS_OK", pattern: "CT_TOOLS_OK", maxWaitMs: 180000 },
                { prompt: "Reply with exactly: CT_EVIDENCE_OK", pattern: "CT_EVIDENCE_OK", maxWaitMs: 120000 },
              ]
            : [
                { prompt: "Reply with exactly: CT_ALIVE_OK", pattern: "CT_ALIVE_OK", maxWaitMs: 120000 },
                { prompt: "Reply with your current agent and model as: CT_IDENTITY agent=<agent> model=<model>", pattern: "CT_IDENTITY", maxWaitMs: 120000 },
              ];
        } else {
          try {
            list = JSON.parse(rawScenarios) as Array<{ prompt: string; pattern: string; maxWaitMs?: number }>;
            if (!Array.isArray(list) || list.length === 0) throw new Error("empty");
          } catch {
            return { text: "CT SUITE FAILED: scenarios is not a non-empty JSON array", isError: true };
          }
        }
        const verdicts: Array<Record<string, unknown>> = [];
        for (let i = 0; i < list.length; i++) {
          const sc = list[i];
          dockerExec(`tmux send-keys -t ${session} -l ${shq(String(sc.prompt ?? ""))}`);
          dockerExec(`tmux send-keys -t ${session} Enter`);
          const budget = Math.min(Math.max(Number(sc.maxWaitMs ?? 60000) || 60000, 5000), 600000);
          const start = Date.now();
          let lastSize = -1;
          let stableSince = Date.now();
          while (Date.now() - start < budget) {
            const sz = Number(dockerExec(`wc -c < ${STREAM_FILE} 2>/dev/null || echo 0`).stdout.trim()) || 0;
            if (sz === lastSize) { if (Date.now() - stableSince > 8000) break; }
            else { lastSize = sz; stableSince = Date.now(); }
            await sleep(2000);
          }
          const cursor = checkCursors.get(name) ?? 0;
          const raw = dockerExec(`cat ${STREAM_FILE} 2>/dev/null`).stdout;
          const fresh = raw.slice(cursor);
          checkCursors.set(name, raw.length);
          let passTokenMatch = false;
          try { passTokenMatch = new RegExp(String(sc.pattern ?? "")).test(fresh); } catch { passTokenMatch = false; }
          verdicts.push({ i, prompt: String(sc.prompt ?? "").slice(0, 120), pattern: String(sc.pattern ?? ""), passTokenMatch, bytes: raw.length, verdict: passTokenMatch ? "PASS" : "FAIL" });
        }
        suiteVerdicts.set(name, verdicts);
        const passed = verdicts.filter((v) => v.verdict === "PASS").length;
        return { text: `CT SUITE "${which}": ${passed}/${verdicts.length} PASS\n${verdicts.map((v) => `  [${v.verdict}] #${v.i} /${v.pattern}/`).join("\n")}`, details: { suite: which, passed, total: verdicts.length, verdicts } };
      }

      if (action === "report") {
        const verdicts = suiteVerdicts.get(name) ?? [];
        const passed = verdicts.filter((v) => v.verdict === "PASS").length;
        const setup = setupRecord.get(name) ?? null;
        const result = {
          testId: `container-test-${host.now()}`, timestamp: host.now(),
          container: name, image, setup,
          passRate: verdicts.length > 0 ? passed / verdicts.length : 0,
          total: verdicts.length, passed, failed: verdicts.length - passed,
          tests: verdicts,
        };
        const dir = `${cwdOf(ctx)}/.ct`;
        host.mkdirSync(dir);
        const out = `${dir}/container-test-results.json`;
        host.writeFileSync(out, JSON.stringify(result, null, 2));
        return { text: `CT REPORT: ${out} — ${passed}/${verdicts.length} PASS`, details: { path: out, ...result } };
      }

      if (action === "host-pipeline") {
        // Two-role environment: ONE container simulates the HOST (tooling +
        // runtime under test), ONE is the TARGET. Wired in ONE action.
        const hostName = `${name}-host`;
        const targetName = `${name}-target`;
        host.execSync(`docker rm -f ${hostName} ${targetName} 2>/dev/null`);
        const h = host.execSync(`docker run -d --name ${hostName} ${image} sleep infinity`, { timeoutMs: 120000 });
        if (h.code !== 0) return { text: `CT HOST-PIPELINE FAILED (host role): ${(h.stderr || h.stdout).slice(0, 400)}`, isError: true };
        const t = host.execSync(`docker run -d --name ${targetName} ${image} sleep infinity`, { timeoutMs: 120000 });
        if (t.code !== 0) { host.execSync(`docker rm -f ${hostName} 2>/dev/null`); return { text: `CT HOST-PIPELINE FAILED (target role): ${(t.stderr || t.stdout).slice(0, 400)}`, isError: true }; }
        const dist = String(params.distPath ?? "");
        let distDeployed = false;
        if (dist) {
          const d = host.execSync(`docker cp ${dist} ${targetName}:/app/ct/dist/index.js`);
          distDeployed = d.code === 0;
        }
        return { text: `CT HOST-PIPELINE: host=${hostName} target=${targetName} distDeployed=${distDeployed} (cleanup=${params.cleanup === true ? "false-kept" : "manual stop"})`, details: { hostContainer: hostName, targetContainer: targetName, distDeployed, hostTuiReady: false } };
      }

      if (action === "tile") {
        return { text: "CT TILE: herdr auto-tile lives in ct-sandbox-test action=tile — container-testing leaves multiplexing to the sandbox tool", details: { container: name } };
      }

      return { text: `CT ${action.toUpperCase()}: unhandled (loud) — action reached the dispatcher with no branch`, isError: true };
    }),
  };
}
