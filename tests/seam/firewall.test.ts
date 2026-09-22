// Firewall middleware suite — the 8-gate enforcement chain, order, escape
// hatches, and the SSTF/theatrical/poseidon behaviors. Pure-TS with StubHost;
// exercises MiddlewareChain + the individual gates exactly as wired in
// src/index.ts (order: identity → doc-density → leaf-node → container →
// dispatch → claim → theatrical → poseidon toolset).
import { afterAll, beforeEach, afterEach, describe, expect, test } from "bun:test";
import { unlinkSync } from "node:fs";
import { MiddlewareChain, StructuredBlockError, type BeforeContext, type GateVerdict } from "../../src/middleware/chain";
import { docDensityGate, DOC_FLOORS, classifyDocType } from "../../src/middleware/doc-density-gate";
import { dispatchGate } from "../../src/middleware/dispatch-gate";
import { sttgfGate, armClaimFromCompletedMessage } from "../../src/middleware/sttgf-gate";
import { sttgfStateTracker } from "../../src/firewalls/semantic-smoke-firewall";
import { classifyVerb } from "../../src/firewalls/semantic-smoke-firewall";
import { theatricalGate, theatricalGateAfter, TheatricalStateTracker } from "../../src/middleware/theatrical-gate";
import { PoseidonGateState } from "../../src/middleware/poseidon-gate";
import { containerGate } from "../../src/middleware/container-gate";
import { StubHost } from "../../src/host";

function baseCtx(over: Partial<BeforeContext> = {}): BeforeContext {
  return {
    toolName: "read",
    input: {},
    scope: "main",
    isAgentOrigin: true,
    toolCallId: "call-1",
    sessionId: "/proj/.trident/session.json",
    ...over,
  };
}

/** Narrow a verdict to a block, failing the test if it isn't one. */
function blockOf(verdict: GateVerdict | undefined): { action: "block"; gate: string; reason: string } {
  if (!verdict || verdict.action !== "block") {
    throw new Error("expected a block verdict, got " + JSON.stringify(verdict));
  }
  return verdict;
}

/** Builds the production chain with the real gate order (mirrors src/index.ts). */
function buildChain(host: StubHost, over: { poseidon?: PoseidonGateState } = {}) {
  const poseidon = over.poseidon ?? new PoseidonGateState();
  const theatrical = new TheatricalStateTracker();
  const chain = new MiddlewareChain();
  chain.useBefore(containerGate());
  chain.useBefore(dispatchGate());
  chain.useBefore(sttgfGate());
  chain.useBefore(theatricalGate(theatrical, { poseidonActive: () => poseidon.isActive() }));
  chain.useBefore(docDensityGate(host));
  return { chain, poseidon, theatrical };
}

describe("middleware chain — order + block semantics", () => {
  test("an allowed tool passes through with no mutation", async () => {
    const host = new StubHost();
    const { chain } = buildChain(host);
    const verdict = await chain.runBefore(baseCtx({ toolName: "read", input: { path: "/a" } }));
    expect(verdict.action).toBe("allow");
  });

  test("FIRST block short-circuits — later gates never run", async () => {
    const host = new StubHost();
    const order: string[] = [];
    const chain = new MiddlewareChain();
    chain.useBefore(async () => { order.push("g1"); return { action: "block", gate: "g1", reason: "blocked" }; });
    chain.useBefore(async () => { order.push("g2"); return { action: "block", gate: "g2", reason: "never" }; });
    await expect(chain.runBefore(baseCtx())).rejects.toThrow(StructuredBlockError);
    expect(order).toEqual(["g1"]);
  });

  test("a rewrite mutates the input and the chain continues", async () => {
    const host = new StubHost();
    const chain = new MiddlewareChain();
    chain.useBefore(async () => ({ action: "rewrite", gate: "r", input: { injected: true } }));
    chain.useBefore(async (ctx) => {
      expect((ctx.input as any).injected).toBe(true); // sees the prior rewrite
      return undefined;
    });
    const verdict = await chain.runBefore(baseCtx({ input: { path: "/a" } }));
    expect(verdict.action).toBe("allow");
    expect((verdict as any).input.injected).toBe(true);
  });

  test("after-chain patches flow through handlers in order", async () => {
    const host = new StubHost();
    const chain = new MiddlewareChain();
    chain.useAfter(async (c) => ({ ...c, details: { ...c.details, a: 1 } }));
    chain.useAfter(async (c) => ({ ...c, details: { ...c.details, b: (c.details as Record<string, number>).a + 1 } }));
    const out = await chain.runAfter({
      toolName: "bash", toolCallId: "c", input: {}, content: [], details: {} as Record<string, number>, isError: false, scope: "main",
    });
    expect(out.details).toEqual({ a: 1, b: 2 });
  });
});

describe("doc-density gate — per-type floors on write", () => {
  test("classifyDocType maps filenames to floors", () => {
    expect(classifyDocType("BUILD_SPEC.md")).toBe("spec");
    expect(classifyDocType("ARCHITECTURE.md")).toBe("arch");
    expect(classifyDocType("README.md")).toBe("readme");
    expect(classifyDocType("DEBUG_LOG.md")).toBe("log");
    expect(classifyDocType("CHANGELOG.md")).toBe("log");
    expect(classifyDocType("anything.md")).toBe("generic");
    expect(DOC_FLOORS.spec).toBe(3000);
    expect(DOC_FLOORS.generic).toBe(200);
  });

  test("write under floor is blocked with the named shortfall", async () => {
    const host = new StubHost();
    const gate = docDensityGate(host);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/proj/docs/ARCHITECTURE.md", content: "x".repeat(100) },
    });
    const verdict = await gate(ctx);
    expect(verdict).toBeDefined();
    expect(verdict!.action).toBe("block");
    expect(blockOf(verdict).reason).toContain("ARCH requires >= 1000 lines");
  });

  test("write at/over floor passes", async () => {
    const host = new StubHost();
    const gate = docDensityGate(host);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/proj/docs/REPORT.md", content: Array(600).fill("line").join("\n") },
    });
    const verdict = await gate(ctx);
    expect(verdict).toBeUndefined();
  });

  test("exempt paths bypass the floor", async () => {
    const host = new StubHost();
    const gate = docDensityGate(host);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/proj/GENERATED_ARTIFACTS/x.md", content: "tiny" },
    });
    expect(await gate(ctx)).toBeUndefined();
  });

  test("non-.md writes are not gated", async () => {
    const host = new StubHost();
    const gate = docDensityGate(host);
    expect(await gate(baseCtx({ toolName: "write", input: { path: "/a.ts", content: "x" } }))).toBeUndefined();
  });
});

describe("dispatch gate — DPL1-grade task dispatches", () => {
  test("a thin task dispatch is REWRITTEN with the DPL1 scaffold", async () => {
    const host = new StubHost();
    const gate = dispatchGate();
    const ctx = baseCtx({
      toolName: "task",
      input: { tasks: [{ name: "X", agent: "scout", task: "do stuff" }] },
    });
    const verdict = await gate(ctx);
    expect(verdict).toBeDefined();
    expect(verdict!.action).toBe("rewrite");
    const rewritten = (verdict as any).input.tasks[0].task as string;
    expect(rewritten).toContain("# Mission");
    expect(rewritten).toContain("# Acceptance");
    expect(rewritten).toContain("do stuff"); // the original text is preserved inside
  });

  test("a disallowed agent type is blocked", async () => {
    const host = new StubHost();
    const gate = dispatchGate();
    const ctx = baseCtx({
      toolName: "task",
      input: { tasks: [{ name: "X", agent: "spawn_shark_agent", task: "# Mission\nlong enough" }] },
    });
    const verdict = await gate(ctx);
    expect(verdict).toBeDefined();
    expect(verdict!.action).toBe("block");
    expect(blockOf(verdict).reason).toContain("agent type not allowed");
  });

  test("a fully-DPL1 dispatch passes untouched", async () => {
    const host = new StubHost();
    const gate = dispatchGate();
    const full = `# Mission\ntask\n# Acceptance\ndone\n# Reading-order\n/home/leviathan/proj/a.ts\n# Per-task\nwhat\n# Constraints\nnone\n# Verification\nbun test\n# Return-format\nreport\n# Grounding\nanchors\n` + Array(160).fill("line").join("\n");
    const ctx = baseCtx({
      toolName: "task",
      input: { tasks: [{ name: "X", agent: "scout", task: full }] },
    });
    expect(await gate(ctx)).toBeUndefined();
  });

  test("extension-origin task calls are exempt", async () => {
    const host = new StubHost();
    const gate = dispatchGate();
    const ctx = baseCtx({
      toolName: "task",
      isAgentOrigin: false,
      input: { tasks: [{ task: "x" }] },
    });
    expect(await gate(ctx)).toBeUndefined();
  });
});
describe("sttgf gate — the v6 production block, verbatim (STTGF posture)", () => {
  beforeEach(() => { process.env.CT_EVIDENCE_DB_PATH = "/tmp/sttgf-a.sqlite"; try { unlinkSync("/tmp/sttgf-a.sqlite"); } catch { /* fresh */ } });
  const SID = "sttgf-test";
  // v6 has NO kill-switch: the gate is unconditional. These tests exercise
  // the production behavior — no env flips, no inert defaults.
  // Per-test evidence DB: the projection reads the EVIDENCE MACHINE (sqlite),
  // so each test gets an isolated DB — otherwise claim/container events leak
  // across tests (the D-DB-LOCK flake class).
  const ctx = (toolName: string, input: Record<string, unknown> = {}) => baseCtx({ toolName, input, sessionId: SID });
  beforeEach(() => { process.env.CT_EVIDENCE_DB_PATH = "/tmp/sttgf-firewall-test.sqlite"; try { unlinkSync("/tmp/sttgf-firewall-test.sqlite"); } catch { /* fresh */ } sttgfStateTracker.clearSession(SID); });
  test("inline-exec is blocked (no claim needed — v6 Phase A fires on verb)", async () => {
    const gate = sttgfGate();
    const verdict = await gate(ctx("bash", { command: "node -e 'console.log(1)'" }));
    expect(verdict).toBeDefined();
    expect(verdict!.action).toBe("block");
    expect(blockOf(verdict).reason).toContain("STTGF BLOCK");
  });

  test("bash inline-exec is blocked (the real inline shape)", async () => {
    const gate = sttgfGate();
    const verdict = await gate(ctx("bash", { command: "node --eval \"x=1\"" }));
    expect(verdict).toBeDefined();
    expect(verdict!.action).toBe("block");
    expect(blockOf(verdict).reason).toContain("STTGF BLOCK");
  });

  test("read/grep work (info gathering is never claim-blocked)", async () => {
    const gate = sttgfGate();
    expect(await gate(ctx("read", { path: "/a.ts" }))).toBeUndefined();
  });

  test("a tool result NEVER arms the claim (B1 regression — the killed loop)", async () => {
    // arming lives ONLY in armClaimFromCompletedMessage (completed message):
    // a bash tool result with NO claim word changes NOTHING in the tracker.
    sttgfStateTracker.clearSession(SID + "-never");
    armClaimFromCompletedMessage(SID + "-never", "ok — nothing to report");
    expect(sttgfStateTracker.getState(SID + "-never").verificationClaimed).toBe(false);
    armClaimFromCompletedMessage(SID + "-arms", "the wave succeeded — the full battery passed");
    expect(sttgfStateTracker.getState(SID + "-arms").verificationClaimed).toBe(true);
  });
  test("claim demand lives in the BLOCK string, not a demand append (v6: tool.before throws)", async () => {
    // Phase B demand-append is GONE (no claimGateAfter): the v6 gate enforces
    // ONLY at tool.before — the demand travels in the BLOCK reason itself.
    const gate = sttgfGate();
    armClaimFromCompletedMessage(SID, "the wave succeeded — the full battery passed");
    const verdict = await gate(ctx("bash", { command: "node -e 'x=1'" }));
    expect(blockOf(verdict).reason).toContain("STTGF BLOCK");
    expect(blockOf(verdict).reason).toContain("container-testing");
  });

  test("B7: container-side `omp --mode rpc` is NEVER a smoke op", async () => {
    const gate = sttgfGate();
    armClaimFromCompletedMessage(SID, "the wave succeeded — the full battery passed");
    // the sanctioned evidence channel passes even with a pending claim
    expect(await gate(ctx("bash", { command: "omp --mode rpc" }))).toBeUndefined();
    expect(classifyVerb("bash", { command: "omp --mode rpc" })).not.toBe("headless");
    expect(classifyVerb("bash", { command: "docker exec c omp --mode rpc" })).not.toBe("headless");
  });

  test("container-testing run is the escape hatch that clears the gate", async () => {
    armClaimFromCompletedMessage(SID, "the wave succeeded — the full battery passed");
    expect(sttgfStateTracker.getState(SID).verificationClaimed).toBe(true);
    // v6 :2531-2532 — the hatch ingests the container/container-clear events;
    // the machine needs artifact+dist the unit sandbox never builds, so this
    // asserts the hatch path (toolName+action routing) not the DB projection.
    const v = await sttgfGate()(ctx("container-testing", { action: "suite" }));
    expect(v).toBeUndefined(); // the hatch NEVER blocks the clearing tool
  });

  test("escalation at 3 blocks with [STTGF ESCALATE]", async () => {
    const gate = sttgfGate();
    armClaimFromCompletedMessage(SID, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) await gate(ctx("bash", { command: "node -e \"x=1\"" })); // 3 incrementBlockCount
    const verdict = await gate(ctx("bash", { command: "node -e \"x=1\"" }));
    expect(blockOf(verdict).reason).toContain("STTGF ESCALATE");
  });
});

describe("theatrical gate — v4.4.2 semantics: state-set, escalate at 3, USE never", () => {
  test("substitute-frame in a proposal tool SETS STATE, does not block on hit 1", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/a.md", content: "just mock the result" },
    });
    const verdict = await gate(ctx);
    expect(verdict).toBeUndefined(); // allow — v4.4.2 no hard throw on args patterns
    expect(tracker.pending(ctx.sessionId)).toBe(true);
    expect(tracker.count(ctx.sessionId)).toBe(1);
  });

  test("escalation ONLY after 3 suggestions → [TRIDENT THEATRICAL ESCALATE]", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/a.md", content: "just mock the result" },
    });
    expect(await gate(ctx)).toBeUndefined(); // 1
    expect(await gate(ctx)).toBeUndefined(); // 2
    const verdict = await gate(ctx); // 3
    expect(blockOf(verdict).reason).toContain("THEATRICAL ESCALATE");
  });

  test("the container-dodge frame only matches WITH the host word on the SAME line (v4.4.2 span boundary)", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    // Same-line: container + host → hit (state set)
    const sameLine = baseCtx({
      toolName: "write",
      input: { path: "/a.md", content: "just skip the container test on the host" },
    });
    expect(await gate(sameLine)).toBeUndefined();
    expect(tracker.pending(sameLine.sessionId)).toBe(true);
    // Cross-line: container on one line, host on another → NO match (the .* boundary)
    const tracker2 = new TheatricalStateTracker();
    const gate2 = theatricalGate(tracker2);
    const crossLine = baseCtx({
      toolName: "write",
      input: { path: "/a.md", content: "this line mentions the container\nand a later line mentions host-only" },
    });
    expect(await gate2(crossLine)).toBeUndefined();
    expect(tracker2.pending(crossLine.sessionId)).toBe(false);
  });

  test("the JSON-stringify whole-input false positive is gone (newlines preserved)", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    // A long canonical doc with the trigger words on separate lines must NOT fire
    const doc = [
      "## 5. BLOCKED ITEMS",
      "| claim gate | fires on verification claims lacking container evidence | run the battery |",
      "## 8.2 The VERIFY gate",
      "A host-only audit is NOT the VERIFY gate.",
      "The container-side RPC stream is the sanctioned channel.",
    ].join("\n");
    const ctx = baseCtx({ toolName: "write", input: { path: "/a.md", content: doc } });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false); // no false fire
  });

  test("non-proposal tools (read/grep) are never scanned", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "read",
      input: { path: "/mock/result.md" },
    });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false);
  });

  test("poseidon-unlocked tools are skipped when poseidon is active", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker, { poseidonActive: () => true });
    const ctx = baseCtx({
      toolName: "bash",
      input: { command: "just mock the result" },
    });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false);
  });

  test("trident-* tools are never scanned (own surfaces are not proposals)", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "trident-code-audit",
      input: { targetPath: "/proj" },
    });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false);
  });

  test("legit use-frame (jest.mock in a test) is NEVER flagged", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/a.test.ts", content: "jest.mock('../db')" },
    });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false);
  });

  test("mock server / stub API use-frames are NEVER flagged", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const ctx = baseCtx({
      toolName: "write",
      input: { path: "/a.test.ts", content: "const server = mockServer(port); stub(api)" },
    });
    expect(await gate(ctx)).toBeUndefined();
    expect(tracker.pending(ctx.sessionId)).toBe(false);
  });

  test("Phase B after-gate appends the demand while pending, clears on container-test", async () => {
    const host = new StubHost();
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const after = theatricalGateAfter(tracker, () => false);
    // set the state via a first hit
    await gate(baseCtx({ toolName: "write", input: { content: "just mock the result" } }));
    const out = await after({
      toolName: "bash", toolCallId: "c", input: {}, content: [{ type: "text", text: "done" }], details: {}, isError: false, scope: "main",
    });
    expect(out.content.map((b: any) => b.text ?? "").join("")).toContain("[PBK THEATRICAL GATE]");
    // container-test clears
    const tracker2 = new TheatricalStateTracker();
    const gate2 = theatricalGate(tracker2);
    await gate2(baseCtx({ toolName: "write", input: { content: "just mock the result" } }));
    const after2 = theatricalGateAfter(tracker2, () => false);
    await after2({
      toolName: "ct-sandbox-test", toolCallId: "c", input: {}, content: [], details: {}, isError: false, scope: "main",
    });
    const out2 = await after2({
      toolName: "bash", toolCallId: "c2", input: {}, content: [{ type: "text", text: "done" }], details: {}, isError: false, scope: "main",
    });
    expect(out2.content.map((b: any) => b.text ?? "").join("")).not.toContain("[PBK THEATRICAL GATE]");
  });
});

describe("warmup + host-init skipping (the load-crash fix)", () => {
  test("before ready, host-init tool calls pass through", async () => {
    // attachChain skips all gates when !isReady — the chain contract
    // it depends on: isAgentOrigin === false is visible to the gates.
    // (poseidonGate removed 2026-09-17; no toolset lock remains in the chain.)
    const before = baseCtx({ toolName: "bash", isAgentOrigin: false });
    expect(before.isAgentOrigin).toBe(false);
  });
});

describe("AUTONOMY-BREAKER REGRESSION — no total tool lock, escape hatch always open (the operator's BANNED-AS-FUCK law)", () => {
  beforeEach(() => { process.env.CT_EVIDENCE_DB_PATH = "/tmp/sttgf-b.sqlite"; try { unlinkSync("/tmp/sttgf-b.sqlite"); } catch { /* fresh */ } });
  const ASID = "sttgf-autonomy";
  beforeEach(() => { process.env.CT_EVIDENCE_DB_PATH = "/tmp/sttgf-firewall-test.sqlite"; try { unlinkSync("/tmp/sttgf-firewall-test.sqlite"); } catch { /* fresh */ } sttgfStateTracker.clearSession(ASID); });
  beforeEach(() => { sttgfStateTracker.clearSession(ASID); sttgfStateTracker.getBlockCount("sttgf-test"); });
  // v6 has NO kill-switch: unconditional production behavior, no env flips.
  test("escalation NEVER blocks read/grep/glob — info gathering is ALWAYS allowed", async () => {
    const host = new StubHost();
    const tracker = sttgfStateTracker /* the verbatim tracker — ONE state machine */;
    const gate = sttgfGate();
    // force escalation: 3 smoke blocks with a pending claim
    sttgfStateTracker.setVerificationClaimed(ASID, true, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) await gate(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID }));
    expect(sttgfStateTracker.getBlockCount(ASID) >= 3).toBe(true);
    // reads/greps pass even when escalated
    expect(await gate(baseCtx({ toolName: "read", input: { path: "/a.ts" } }))).toBeUndefined();
    expect(await gate(baseCtx({ toolName: "grep", input: { pattern: "x", path: "/a.ts" } }))).toBeUndefined();
    expect(await gate(baseCtx({ toolName: "glob", input: { path: "**/*.ts" } }))).toBeUndefined();
    // work tools (write/edit) also pass — only the CLAIM is gated
    expect(await gate(baseCtx({ toolName: "write", input: { path: "/a.md", content: "x" } }))).toBeUndefined();
  });

  test("escalation still blocks smoke ops (inline-exec/headless)", async () => {
    const host = new StubHost();
    const tracker = sttgfStateTracker /* the verbatim tracker — ONE state machine */;
    const gate = sttgfGate();
    sttgfStateTracker.setVerificationClaimed(ASID, true, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) await gate(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID }));
    const verdict = await gate(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID }));
    expect(blockOf(verdict).reason).toContain("STTGF ESCALATE");
  });

  test("the escape hatch (st) is NEVER claim-blocked — even escalated", async () => {
    const host = new StubHost();
    const tracker = sttgfStateTracker /* the verbatim tracker — ONE state machine */;
    const gate = sttgfGate();
    sttgfStateTracker.setVerificationClaimed(ASID, true, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) await gate(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID }));
    expect(sttgfStateTracker.getBlockCount(ASID) >= 3).toBe(true);
    // the tool that clears the state must always be callable — a block here deadlocks the session
    expect(await gate(baseCtx({ toolName: "ct-sandbox-test", sessionId: ASID }))).toBeUndefined();
    expect(await gate(baseCtx({ toolName: "container-test", sessionId: ASID }))).toBeUndefined();
  });

  test("the escape hatch clears the escalation", async () => {
    const host = new StubHost();
    sttgfStateTracker.setVerificationClaimed(ASID, true, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) await sttgfGate()(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID }));
    expect(sttgfStateTracker.getBlockCount(ASID) >= 3).toBe(true);
    const hv = await sttgfGate()(baseCtx({ toolName: "container-testing", input: { action: "suite" }, sessionId: ASID }));
    expect(hv).toBeUndefined(); // the hatch NEVER blocks the clearing tool
  });

  test("no gate blocks read/grep/glob — the full chain passes info gathering even under claim+theatrical escalation", async () => {
    const host = new StubHost();
    const poseidon = new PoseidonGateState();
    const { chain } = buildChain(host, { poseidon });
    sttgfStateTracker.setVerificationClaimed(ASID, true, "the wave succeeded — the full battery passed");
    for (let i = 0; i < 3; i++) {
      try { await chain.runBefore(baseCtx({ toolName: "bash", input: { command: "node -e \"x=1\"" }, sessionId: ASID })); } catch { /* smoke blocks */ }
    }
    // full chain: read still passes with every gate in the path
    const verdict = await chain.runBefore(baseCtx({ toolName: "read", input: { path: "/a.ts" }, sessionId: ASID }));
    expect(verdict.action).toBe("allow");
  });
});

