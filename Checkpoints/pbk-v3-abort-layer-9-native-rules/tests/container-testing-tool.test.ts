/**
 * Adversarial battery for the first-class container-testing tool.
 * No docker required for these cases: firewall status, plan-gate loud-fail,
 * unknown-action loud-fail, missing-prompt loud-fail.
 */
import { describe, expect, test } from "bun:test";
import { buildContainerTestingTool, CT_ACTIONS } from "../src/tools/container-testing";
import type { ExtensionAPI } from "../src/types/omp";
import { RecordedRunSet } from "../src/middleware/phantom-gate";

function chainable() {
  const self: Record<string, unknown> = {};
  const wrap = (v: unknown) => {
    const o = v as Record<string, unknown>;
    o.optional = () => wrap(o);
    o.min = () => wrap(o);
    return o;
  };
  self.string = () => wrap({ t: "string" });
  self.number = () => wrap({ t: "number" });
  self.boolean = () => wrap({ t: "boolean" });
  self.array = () => wrap({ t: "array" });
  self.enum = (values: string[]) => wrap({ t: "enum", values });
  self.object = (shape: unknown) => wrap({ t: "object", shape });
  return self;
}

function mockPi(): ExtensionAPI {
  return {
    on() {},
    registerCommand() {},
    registerTool() {},
    registerShortcut() {},
    sendMessage() {},
    sendUserMessage() {},
    appendEntry() {},
    async exec() { return { exitCode: 0, stdout: "", stderr: "" }; },
    setActiveTools() {},
    getActiveTools() { return []; },
    getSystemPrompt() { return ""; },
    setLabel() {},
    logger: { log() {} },
    pi: {},
    zod: chainable() as ExtensionAPI["zod"],
  };
}

function mockHost() {
  return {
    readFileSync: () => null,
    writeFileSync() {},
    existsSync: () => false,
    mkdirSync() {},
    execSync: () => ({ code: 0, stdout: "", stderr: "" }),
    sha256Sync: () => null,
    now: () => "2026-09-14T00:00:00.000Z",
    log() {},
  };
}

function tool() {
  return buildContainerTestingTool(mockPi(), {
    host: mockHost() as never,
    recordedRuns: new RecordedRunSet(),
  });
}

async function run(action: string, extra: Record<string, unknown> = {}) {
  const t = tool();
  return t.execute("id", { action, ...extra });
}

function fatPlan(): string {
  return [
    "OBJECTIVE: verify headed TUI setup is not hardcoded to omp.",
    "TOOLS UNDER TEST: container-testing setup/send/read/check/exec/suite/report/firewall.",
    "TEST SCENARIOS:",
    "SCENARIO 1: setup tui=omp launches headed tmux.",
    "SCENARIO 2: setup tui=mimo uses mimo-ct image.",
    "SCENARIO 3: unknown tui loud-fails.",
    "ADVERSARIAL: unknown tui name, short plan, docker exec mutation.",
    "EVIDENCE: tool result tokens CT SETUP / CT SETUP FAILED / CT FIREWALL.",
    "PASS CRITERIA: loud fail or clear pass, never a silent omp fallback.",
    "pad: " + "N".repeat(1600),
  ].join("\n");
}


describe("container-testing first-class tool", () => {
  test("registers essential loadMode and the mimo action surface", () => {
    const t = tool();
    expect(t.name).toBe("container-testing");
    expect(t.loadMode).toBe("essential");
    expect(t.defaultInactive).toBe(false);
    expect(CT_ACTIONS).toContain("setup");
    expect(CT_ACTIONS).toContain("firewall");
    expect(CT_ACTIONS).toContain("suite");
    expect(CT_ACTIONS).toContain("host-pipeline");
    expect(CT_ACTIONS).toContain("tuis");
  });

  test("firewall status is a clear pass without docker", async () => {
    const r = await run("firewall", { enable: "status" });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(text).toContain("CT FIREWALL:");
    expect(r.isError).toBeUndefined();
  });

  test("setup with empty plan is a loud fail naming the gate", async () => {
    const r = await run("setup", { testPlan: "too short" });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("CT SETUP FAILED");
    expect(text).toContain("2000");
  });

  test("unknown action is a loud fail listing the surface", async () => {
    const r = await run("not-a-real-action");
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("unknown action");
    expect(text).toContain("setup");
  });

  test("send without prompt is a loud fail", async () => {
    const r = await run("send");
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("CT SEND FAILED");
  });

  test("exec docker mutation is firewalled by default", async () => {
    const r = await run("exec", { command: "docker run -d alpine sleep 1" });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("CT EXEC BLOCKED");
  });

  test("action=tuis lists every headed preset", async () => {
    const r = await run("tuis");
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(text).toContain("CT TUIS");
    expect(text).toContain("omp");
    expect(text).toContain("mimo");
    expect(text).toContain("qwen");
    expect(text).toContain("grok");
    expect(text).toContain("opencode");
  });

  test("setup with fat plan but unknown tui is a loud fail, not omp", async () => {
    const r = await run("setup", { testPlan: fatPlan(), tui: "not-a-real-tui" });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("unknown tui");
    expect(text).not.toContain("tui=omp (preset)");
  });

  test("setup grok with missing bind is a loud fail naming the host path", async () => {
    const r = await run("setup", { testPlan: fatPlan(), tui: "grok" });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("bind missing");
    expect(text).toContain("grok");
  });

  test("plan missing SCENARIO markers fails even at 2000+ chars", async () => {
    const plan = "OBJECTIVE\nTOOLS UNDER TEST\nTEST SCENARIOS\nADVERSARIAL\nEVIDENCE\nPASS CRITERIA\n" + "Z".repeat(2000);
    const r = await run("setup", { testPlan: plan });
    const text = (r.content?.[0] as { text?: string })?.text ?? "";
    expect(r.isError).toBe(true);
    expect(text).toContain("scenario markers");
  });
});
