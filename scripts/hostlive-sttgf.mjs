#!/usr/bin/env bun
/**
 * hostlive-sttgf.mjs — DURABLE host-live teeth harness for the STTGF posture.
 *
 * Why this file exists in-tree: the original harness lived at
 * /tmp/hostlive-sttgf.mjs only. The 2026-09-20 20:42 host reboot wiped /tmp
 * and with it the load-bearing evidence script — the strongest proof short of
 * a model round became unreproducible. Durability law: a proof script that
 * lives in /tmp is not evidence, it is a rumor. It now lives here.
 *
 * What it does: imports the DEPLOYED dist (the same file the omp host loads),
 * builds a fake `pi` that captures the REGISTERED handlers, then fires those
 * handlers with synthetic tool_call events — i.e. it exercises the real
 * registration + chain wiring, not src imports and not `bun -e` of a gate
 * function in isolation.
 *
 * Run:  bun scripts/hostlive-sttgf.mjs
 *       HOSTLIVE_DIST=/path/to/dist.js bun scripts/hostlive-sttgf.mjs
 * Exit: 0 = all rows green, 1 = any row missed.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const DIST = process.env.HOSTLIVE_DIST ?? "/home/leviathan/.omp/agent/extensions/omp-ct/dist.js";
const SESSION_FILE = "/tmp/hostlive-session.jsonl";

// ── fake pi: captures registrations, no-ops everything else ──────────────
const handlers = new Map();
const tools = new Map();
const entries = [];
const execLog = [];

const ui = {
  notify: () => undefined,
  setStatus: () => undefined,
  confirm: async () => true,
  select: async () => undefined,
  input: async () => undefined,
};

const realExec = (cmd, opts = {}) => {
  execLog.push(cmd);
  try {
    const stdout = execFileSync("/bin/sh", ["-c", cmd], {
      encoding: "utf8",
      timeout: opts.timeoutMs ?? 20000,
      cwd: opts.cwd,
    });
    return Promise.resolve({ exitCode: 0, stdout, stderr: "" });
  } catch (e) {
    return Promise.resolve({
      exitCode: typeof e.status === "number" ? e.status : 1,
      stdout: e.stdout ? String(e.stdout) : "",
      stderr: e.stderr ? String(e.stderr) : String(e.message ?? ""),
    });
  }
};

// pi.zod shim — the omp runtime's zod-like builder surface the dist uses to
// declare tool schemas (dist grep: array/boolean/enum/number/object/string).
const zodLeaf = (kind) => {
  const node = { kind, _def: { type: kind } };
  node.optional = () => ({ ...node, optional: true });
  node.describe = () => node;
  node.default = () => node;
  return node;
};
const zod = {
  string: () => zodLeaf("string"),
  number: () => zodLeaf("number"),
  boolean: () => zodLeaf("boolean"),
  enum: (values) => ({ ...zodLeaf("enum"), values }),
  array: (item) => ({ ...zodLeaf("array"), item }),
  object: (shape) => ({ ...zodLeaf("object"), shape }),
};

const target = {
  zod,
  on(event, fn) {
    if (!handlers.has(event)) handlers.set(event, []);
    handlers.get(event).push(fn);
    return undefined;
  },
  registerTool(def) {
    if (def && def.name) tools.set(def.name, def);
    return undefined;
  },
  appendEntry(type, payload) {
    entries.push({ type, payload });
    return undefined;
  },
  setLabel: () => undefined,
  log: () => undefined,
  exec: realExec,
  ui,
};

// any unknown pi surface resolves to a no-op function (robust against
// host API growth) — never to undefined, which would throw on call.
const fakePi = new Proxy(target, {
  get(t, k) {
    if (k in t) return t[k];
    if (typeof k === "symbol") return undefined;
    return () => undefined;
  },
});

// ── load the DEPLOYED dist and register ────────────────────────────────
const mod = await import(DIST);
if (typeof mod.default !== "function") {
  console.log("FAIL  HL-LOAD   dist default export is not a function — dist:", DIST);
  process.exit(1);
}
mod.default(fakePi);

const ctx = {
  cwd: process.cwd(),
  sessionManager: {
    getSessionFile: () => SESSION_FILE,
    getBranch: () => [],
  },
  models: { current: () => "poolside/poolside/laguna-s-2.1" },
  ui,
};

// ── rows ────────────────────────────────────────────────────────────────
const results = [];
const record = (id, pass, detail) => {
  results.push({ id, pass, detail });
  console.log((pass ? "PASS" : "FAIL") + "  " + id.padEnd(12) + " " + detail);
};

const callHandlers = handlers.get("tool_call") ?? [];
const fired = [];
const callTool = async (id, command, toolName = "bash") => {
  for (const h of callHandlers) {
    try {
      const r = await h(
        { toolName, toolCallId: id, input: { command }, isAgentOrigin: true },
        ctx,
      );
      fired.push({ id, verdict: "allow", returned: r === undefined ? "undefined" : JSON.stringify(r).slice(0, 120) });
      return { blocked: false, text: "" };
    } catch (e) {
      fired.push({ id, verdict: "blocked", returned: String(e.message).slice(0, 300) });
      return { blocked: true, text: String(e.message) };
    }
  }
  return { blocked: false, text: "" };
};

const has = (text, ...needles) => needles.every((n) => text.includes(n));

if (callHandlers.length === 0) {
  record("HL-WIRE", false, "no tool_call handler registered by the deployed dist");
  process.exit(1);
}

// 1 — INLINE_EXEC smoke
const r1 = await callTool("hl-1", "node -e 'console.log(1)'");
record(
  "HL-INLINE",
  r1.blocked && has(r1.text, "[STTGF BLOCK]", "INLINE_EXEC", "Use container"),
  r1.blocked ? r1.text.slice(0, 140) : "NOT BLOCKED (allowed)",
);

// 2 — HEADLESS nested omp run
const r2 = await callTool("hl-2", "omp run -p 'echo hi'");
record(
  "HL-HEADLESS",
  r2.blocked && has(r2.text, "[STTGF BLOCK]", "HEADLESS", "Headless exec forbidden", "Use TUI"),
  r2.blocked ? r2.text.slice(0, 140) : "NOT BLOCKED (allowed)",
);

// 3 — third consecutive smoke → ESCALATE
const r3 = await callTool("hl-3", "node -e 'console.log(2)'");
record(
  "HL-ESCALATE",
  r3.blocked && has(r3.text, "[STTGF ESCALATE]", "MANDATORY"),
  r3.blocked ? r3.text.slice(0, 160) : "NOT BLOCKED (allowed)",
);

// 4 — ZERO-MISFIRE: benign read commands must ALLOW
const r4 = await callTool("hl-4", "ls /tmp");
const r5 = await callTool("hl-5", "cat package.json");
record(
  "HL-MISFIRE",
  !r4.blocked && !r5.blocked,
  `ls /tmp -> ${r4.blocked ? "BLOCKED" : "allowed"}; cat package.json -> ${r5.blocked ? "BLOCKED" : "allowed"}`,
);

// ── artifact ────────────────────────────────────────────────────────────
const out = { harness: "hostlive-sttgf", dist: DIST, rows: results, fired, tools: [...tools.keys()], execCalls: execLog.length };
const outPath = ".mimocode/ct-results-hostlive.json";
try {
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(out, null, 2));
} catch {
  /* artifact write is best-effort; verdicts are already on stdout */
}

const overall = results.every((r) => r.pass);
console.log("");
console.log(`HOSTLIVE OVERALL: ${overall ? "TRUE" : "FALSE"} — ${results.filter((r) => r.pass).length}/${results.length} — ${outPath} written`);
process.exit(overall ? 0 : 1);