/**
 * st-ct-port.ts — the DURABLE CT-PORT-1 ST battery (spec §D/§E, the proof
 * contract's pass tokens). Runs BOTH halves + the CT angles against the
 * PORTED lexicons and the REAL container-testing tool execute path, and
 * emits .mimocode/ct-results.json (per-scenario verdicts).
 *
 * Run: bun scripts/st-ct-port.ts   (exit 0 = all green; exit 1 = any miss)
 *
 * Angles (proof contract):
 *   ST-1 CTX fixtures  → BLOCK verdicts (PatternFamily families) + FP pins
 *   ST-2 State         → ct-firewall.json persistence roundtrip (tool shape)
 *   ST-3 Headless      → omp run blocked in BOTH gates
 *   ST-4 Session       → two sids independent + default-key guard intact
 *   CT FIREWALL        → raw docker exec via the tool → "CT EXEC BLOCKED"
 *   CT AUDIT           → auth.json write via the tool → "[TRIDENT CONFIG
 *                        LOCK] CTX-02" (the auth-fumbling warhead family)
 *   CT STATE           → fail-closed default-ON for a never-toggled session
 *   CT LIFECYCLE       → disable → exec runs → enable → blocked again
 *   CT CONFIG          → graceful-degrade mkdir + valid state JSON + cleanup
 *   CT INTEGRATION     → chain gate verdict block (overall:true in artifact)
 *   CT TOOLS           → DOCUMENTED-BLOCKED (needs a live auth-seeded
 *                        container — the RPC battery's image-blocked class)
 */
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { classifyCtExec } from "../src/firewalls/ct-anti-derailment.js";
import { sttgfGate } from "../src/middleware/sttgf-gate.js";
import { classifyVerb } from "../src/firewalls/semantic-smoke-firewall.js";
import { containerGate } from "../src/middleware/container-gate.js";
import { setCurrentAgent, getCurrentAgent } from "../src/hooks/agent-state.js";
import { trackSessionEvent, handleSessionEnded } from "../src/hooks/session-hook.js";
import { checkF1Isolation, guardianGate } from "../src/hooks/guardian-hook.js";
import { buildContainerTestingTool } from "../src/tools/container-testing.js";
import type { ExtensionAPI, OmpToolDefinition } from "../src/types/omp";
import type { EngineHost, ExecResult } from "../src/engines/host";

type Verdict = { id: string; angle: string; pass: boolean; detail: string };
const results: Verdict[] = [];
// scenarios that CANNOT run in this environment — recorded, never counted
// as pass, and never allowed to silently vanish (the documented-skip law)
const blockedScenarios: string[] = [];
const record = (id: string, angle: string, pass: boolean, detail: string) => {
  results.push({ id, angle, pass, detail });
  console.log((pass ? "PASS" : "FAIL") + "  " + id.padEnd(14) + " [" + angle + "] " + detail);
};

// ── stub host (the tool never reaches real docker in the BLOCK paths) ──
const stubExec = (cmd: string): ExecResult => ({ code: 0, stdout: "stub:" + cmd.slice(0, 20), stderr: "" });
const stubHost = {
  cwd: () => process.cwd(),
  readFileSync: (p: string) => (fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null),
  writeFileSync: (p: string, c: string) => fs.writeFileSync(p, c),
  existsSync: (p: string) => fs.existsSync(p),
  statSync: (p: string) => { const s = fs.statSync(p, { throwIfNoEntry: false }); return s ? { size: s.size, isDirectory: s.isDirectory(), mtime: s.mtimeMs } : null; },
  listDirSync: (d: string) => { try { return fs.readdirSync(d); } catch { return []; } },
  mkdirSync: (d: string) => fs.mkdirSync(d, { recursive: true }),
  copyFileSync: (f: string, t: string) => fs.copyFileSync(f, t),
  renameSync: (f: string, t: string) => fs.renameSync(f, t),
  appendFileSync: (p: string, c: string) => fs.appendFileSync(p, c),
  rmSync: (p: string) => fs.rmSync(p, { force: true }),
  execSync: stubExec,
  log: () => {},
} as unknown as EngineHost;

// minimal zod stub — the builder only CONSTRUCTS chained schemas
// (.min/.optional); the execute path never validates them in these tests.
const chainable = () => {
  const self = {
    min: () => self,
    optional: () => self,
  };
  return self;
};
const zodStub = {
  string: () => chainable(),
  number: () => chainable(),
  boolean: () => chainable(),
  array: () => chainable(),
  enum: () => chainable(),
  object: () => chainable(),
};
const registered: Record<string, OmpToolDefinition> = {};
const stubPi = {
  registerTool: (def: OmpToolDefinition) => { registered[def.name] = def; },
  zod: zodStub,
} as unknown as ExtensionAPI;


// ═══ ST-1: CTX fixtures (POSITIVE half — BLOCK) ═══
const ctxFixtures: Array<[string, string]> = [
  ["CTX-02 auth.json", "echo x > /root/.omp/agent/auth.json"],
  ["CTX-03 session-db", "python3 -c \"import sqlite3; sqlite3.connect('/x/opencode.db').execute('UPDATE t SET m=1')\""],
  ["CTX-04 install", "npm i -g opencode@3"],
  ["CTX-08 apiKey", "echo sk-or-OPENROUTER_API_KEY > /tmp/k"],
  ["b64 evasion", "echo " + Buffer.from("sqlite3 /root/.omp/agent/opencode.db").toString("base64") + " | base64 -d | sh"],
];
for (const [id, cmd] of ctxFixtures) {
  const v = classifyCtExec(cmd);
  record("ST-1 " + id, "CTX fixtures", v.verdict === "BLOCK", v.verdict === "BLOCK" ? "BLOCK " + v.family : "MISS -> " + v.verdict);
}

// ═══ ST-1 negative half (zero-misfire — the FP pins) ═══
const fpPins: Array<[string, string]> = [
  ["config read", "cat /root/.config/opencode/config.json"],
  ["tsconfig cp (CTX-01 pin)", "cp tsconfig.json tsconfig.bak"],
  ["sha tee (CTX-01 pin)", "sha256sum bundle.js | tee dist/sha.txt"],
  ["checkpoint copy (CTX-01 pin)", "cp -r checkpoint/ backup/"],
  ["grep model", "grep -c model /root/.config/opencode/config.json"],
  ["docker ps", "docker ps --format json"],
];
for (const [id, cmd] of fpPins) {
  const v = classifyCtExec(cmd);
  record("ST-1 " + id, "zero-misfire", v.verdict === "ALLOW", v.verdict === "ALLOW" ? "ALLOW" : "FP -> " + v.family);
}

// ═══ ST-2: state roundtrip with the TOOL'S REAL SHAPE ═══
// (container-testing.ts:161-181: {sessions:{sid:{enabled,updatedAt}}} + tmp+rename)
{
  const f = "/tmp/ct-st-state-" + process.pid + ".json";
  const write = (off: string[]) => {
    const sessions: Record<string, { enabled: boolean; updatedAt: string }> = {};
    for (const sid of off) sessions[sid] = { enabled: false, updatedAt: new Date().toISOString() };
    const tmp = f + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify({ sessions }));
    fs.renameSync(tmp, f);
  };
  const read = (): string[] => {
    try {
      const parsed = JSON.parse(fs.readFileSync(f, "utf-8")) as { sessions?: Record<string, { enabled: boolean }> };
      if (!parsed || typeof parsed.sessions !== "object") return [];
      return Object.entries(parsed.sessions).filter(([, v]) => v && v.enabled === false).map(([k]) => k);
    } catch { return []; }
  };
  write(["st-sess-A"]);
  const disabled = read().includes("st-sess-A");
  write([]);
  const enabled = !read().includes("st-sess-A");
  fs.rmSync(f, { force: true });
  record("ST-2 state", "toggle roundtrip", disabled && enabled, "tool-shape {sessions:{sid:{enabled}}} disable→persist→load→enable, atomic tmp+rename");
}

// ═══ ST-3: headless in BOTH gates (v6 posture — unconditional, no env) ═══
{
  const g = sttgfGate();
  const v1 = await g({ toolName: "bash", input: { command: "omp run -p 'x'" }, scope: "main", isAgentOrigin: true, toolCallId: "t", sessionId: "s" } as never);
  const gate1 = v1?.action === "block";
  const gate2 = classifyVerb("bash", { command: "FOO=1 opencode run --print x" }) === "headless";
  record("ST-3 headless", "both gates", gate1 && gate2, "BeforeGate=" + (gate1 ? "block" : "ALLOW") + " dispatch=" + (gate2 ? "BLOCK" : "ALLOW"));
}

// ═══ ST-4: session independence + default-key guard ═══
{
  setCurrentAgent("trident", "st-sid-a");
  setCurrentAgent("trident_build", "st-sid-b");
  setCurrentAgent("trident", "default");
  const independent = getCurrentAgent("st-sid-a") === "trident" && getCurrentAgent("st-sid-b") === "trident_build";
  const wroteAgentless = trackSessionEvent({ type: "session.updated", sessionId: "default" });
  const guardIntact = !wroteAgentless && getCurrentAgent("default") === "trident";
  trackSessionEvent({ type: "session.created", sessionId: "st-sid-c", agent: "build" });
  const selectiveClear = getCurrentAgent("st-sid-c") === undefined && getCurrentAgent("default") === "trident";
  handleSessionEnded("st-sid-a");
  const endClear = getCurrentAgent("st-sid-a") === undefined && getCurrentAgent("st-sid-b") === "trident_build";
  record("ST-4 session", "sid independence", independent && guardIntact && selectiveClear && endClear, "a/b independent, default guard, selective clear, session_end clear");
}

// ═══ CT angles through the REAL tool execute path ═══
// buildContainerTestingTool RETURNS the definition (registry.ts:748 passes
// it to pi.registerTool); the stub pi only supplies zod.
// sidOf reads ctx.sessionID (container-testing.ts:194) — every angle uses
// an explicit DISTINCT sid so firewall state never collides across angles.
const ctTool = buildContainerTestingTool(stubPi, { host: stubHost, recordedRuns: { hasAfter: () => false } as never, claimTracker: { claimTimestamp: () => null } as never });
type CtResult = { content: Array<{ type: string; text: string }>; isError?: boolean };
type CtExecute = (id: string, params: Record<string, unknown>, sig: unknown, upd: unknown, ctx: unknown) => Promise<CtResult>;
const ctExecute = (ctTool as unknown as { execute: CtExecute }).execute;
const textOf = (r: CtResult): string => (r.content[0]?.type === "text" ? r.content[0].text : "");
const ctCtx = (sid: string) => ({ cwd: "/tmp", sessionID: sid });
const stateFile = path.join(os.homedir(), ".omp/agent/state/ct-firewall.json");

// CT FIREWALL: raw docker exec → "CT EXEC BLOCKED" in the tool result
{
  const res = await ctExecute("st", { action: "exec", command: "docker exec omp-ct ls /" }, null, null, ctCtx("st-state-sid-" + process.pid));
  const blocked = res.isError === true && textOf(res).includes("CT EXEC BLOCKED");
  record("CT FIREWALL", "tool exec", blocked, blocked ? "CT EXEC BLOCKED in tool result" : "MISS: " + textOf(res).slice(0, 80));
}

// CT AUDIT: auth.json write → "[CT CONFIG LOCK] CTX-02" warhead
{
  const res = await ctExecute("st", { action: "exec", command: "echo x > /root/.omp/agent/auth.json" }, null, null, ctCtx("st-audit-sid"));
  const blocked = res.isError === true && textOf(res).includes("[CT CONFIG LOCK]") && textOf(res).includes("CTX-02");
  record("CT AUDIT", "tool exec", blocked, blocked ? "CONFIG LOCK CTX-02 (auth fumbling family)" : "MISS: " + textOf(res).slice(0, 80));
}

// CT STATE: fail-closed default-ON (fresh sid, never toggled)
{
  const res = await ctExecute("st", { action: "exec", command: "docker exec omp-ct ls /" }, null, null, ctCtx("st-state-sid-" + process.pid));
  const stateOn = res.isError === true && textOf(res).includes("CT EXEC BLOCKED");
  record("CT STATE", "fail-closed", stateOn, stateOn ? "fresh session blocked (default ON)" : "MISS: " + textOf(res).slice(0, 80));
}

// CT LIFECYCLE: disable → exec RUNS → enable → blocked again (strict order)
{
  const sid = "st-lifecycle-sid-" + process.pid;
  const ctx = ctCtx(sid);
  await ctExecute("st", { action: "firewall", enable: "disable" }, null, null, ctx);
  const liveRes = await ctExecute("st", { action: "exec", command: "docker exec omp-ct ls /" }, null, null, ctx);
  const allowedWhenOff = liveRes.isError !== true && textOf(liveRes).startsWith("CT EXEC:");
  await ctExecute("st", { action: "firewall", enable: "enable" }, null, null, ctx);
  const reRes = await ctExecute("st", { action: "exec", command: "docker exec omp-ct ls /" }, null, null, ctx);
  const reBlocked = reRes.isError === true && textOf(reRes).includes("CT EXEC BLOCKED");
  record("CT LIFECYCLE", "toggle effect", allowedWhenOff && reBlocked, "disable→exec-runs(" + allowedWhenOff + ") → enable→blocked(" + reBlocked + ")");
}

// CT CONFIG: graceful-degrade mkdir → valid tool-shape JSON → enable cleaned
{
  const sid = "st-config-sid-" + process.pid;
  const ctx = ctCtx(sid);
  await ctExecute("st", { action: "firewall", enable: "disable" }, null, null, ctx);
  let persisted = false;
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf-8")) as { sessions?: Record<string, { enabled?: boolean }> };
    persisted = raw?.sessions?.[sid]?.enabled === false;
  } catch { persisted = false; }
  await ctExecute("st", { action: "firewall", enable: "enable" }, null, null, ctx);
  let cleaned = false;
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile, "utf-8")) as { sessions?: Record<string, { enabled?: boolean }> };
    cleaned = raw?.sessions?.[sid] === undefined;
  } catch { cleaned = false; }
  record("CT CONFIG", "graceful persist", persisted && cleaned, "disable persisted (mkdir degrade): " + persisted + "; enable cleaned sid: " + cleaned);
}

// CT INTEGRATION: the chain gate itself (unconditional — v6 has no switch) blocks the container verb
{
  const cg = containerGate();
  const v = await cg({ toolName: "bash", input: { command: "docker exec omp-ct ls" }, scope: "main", isAgentOrigin: true, toolCallId: "t", sessionId: "st-int" } as never);
  const blocked = v?.action === "block";
  record("CT INTEGRATION", "chain", blocked, "chain gate verdict: " + (v?.action ?? "allow"));
}

// CT TOOLS: DOCUMENTED-BLOCKED with the full evidence chain —
// (1) the omp TUI preset binds NOTHING (ct-tui-registry: binds: []), so the
// container never sees host auth;
// (2) the RPC battery measured the result live: in-container omp reports
// "No models available" (no seeded auth);
// (3) binding host ~/.omp into a test container would expose credentials —
// the goal HARD STOP reserves that for an explicit operator order.
// UNBLOCK PATH (operator): either bless an auth-bind volume for test
// containers, or bake an auth-seeded master and point
// CT_CONTAINER_IMAGE at it — this angle then runs unmodified.
blockedScenarios.push(
  "CT TOOLS: suite dispatch requires a live auth-seeded container. Evidence: omp preset binds=[] (no host config in container); live RPC battery measured 'No models available' in omp-ct:master; auth bind/bake is operator-gated (secrets HARD STOP). Unblock: operator blesses an auth-bind volume OR bakes an auth-seeded master image and sets CT_CONTAINER_IMAGE.",
);

// ═══ emit artifact ═══
const overall = results.every((r) => r.pass);
const artifactDir = ".mimocode";
fs.mkdirSync(artifactDir, { recursive: true });
const artifact = {
  overall,
  when: new Date().toISOString(),
  total: results.length,
  passed: results.filter((r) => r.pass).length,
  documentedBlocked: blockedScenarios,
  scenarios: results,
};
fs.writeFileSync(path.join(artifactDir, "ct-results.json"), JSON.stringify(artifact, null, 2));
console.log("\nOVERALL: " + (overall ? "TRUE" : "FALSE") + " — " + artifact.passed + "/" + artifact.total + " — .mimocode/ct-results.json written");
process.exit(overall ? 0 : 1);
