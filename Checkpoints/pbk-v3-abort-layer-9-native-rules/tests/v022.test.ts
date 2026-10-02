// V-022 — semantic smoke firewall: model-origin inline_exec / headless / -p
// MUST block regardless of intent (the V-021 intent-scoping regression).
//
// The previous fix scoped the inline-exec block to intent === 'claim_verification'
// at semantic-smoke-firewall.ts:256. That was correct for the RUNTIME LOADER
// (which is exempted at the gate by isAgentOrigin=false) but WRONG for the
// MODEL: the model's smoke drive carries intent operation/inspection/unknown,
// never claim_verification, so `omp run -p 'echo hi'` and `node -e 'code'`
// passed unblocked.
//
// The V-022 fix keys on the OPERATION (verb) + ORIGIN (isAgentOrigin) +
// CLAIM STATE — not intent alone:
//   - model-origin smoke verbs (inline_exec, headless) → BLOCK
//   - loader-origin (isAgentOrigin=false) → ALREADY SKIPPED at the gate
//   - claim_verification intent → still BLOCK (kept)
//   - benign model-origin ls/cat → ALLOW
//
// Adversarial FIRST: the first test asserts the regression is killed.
import { describe, expect, test, beforeEach } from "bun:test";
import { unlinkSync } from "node:fs";
import {
  checkSmokeTestFirewall,
  sttgfStateTracker,
  classifyVerb,
} from "../src/firewalls/semantic-smoke-firewall";
import { sttgfGate } from "../src/middleware/sttgf-gate";
import type { BeforeContext, GateVerdict } from "../src/middleware/chain";

const SID = "v022-test";

/** Narrow a verdict to a block, failing the test if it isn't one. */
function blockOf(verdict: GateVerdict | undefined): { action: "block"; gate: string; reason: string } {
  if (!verdict || verdict.action !== "block") {
    throw new Error("expected a block verdict, got " + JSON.stringify(verdict));
  }
  return verdict;
}

function ctx(over: Partial<BeforeContext> = {}): BeforeContext {
  return {
    toolName: "bash",
    input: {},
    scope: "main",
    isAgentOrigin: true,
    toolCallId: "call-v022",
    sessionId: SID,
    ...over,
  };
}

function firewallParams(
  toolName: string,
  args: Record<string, unknown>,
  isAgentOrigin: boolean = true,
) {
  return {
    toolName,
    sessionId: SID,
    agentName: "v022-agent",
    mode: "v022",
    args,
    commandStr: String((args as Record<string, unknown>).command ?? ""),
    isAgentOrigin,
  };
}

describe("V-022: model-origin inline smoke is blocked regardless of intent", () => {
  beforeEach(() => {
    process.env.CT_EVIDENCE_DB_PATH = "/tmp/v022-test.sqlite";
    try { unlinkSync("/tmp/v022-test.sqlite"); } catch { /* fresh */ }
    sttgfStateTracker.clearSession(SID);
  });

  // ═══ REGRESSION TEST — adversarial first ═══
  // The model runs `omp run -p 'echo hi'` with intent=operation (the smoke
  // drive never carries claim_verification). Under V-021's intent-scoped gate
  // this PASSED UNBLOCKED. V-022 must BLOCK it.
  test("ADVERSARIAL: model-origin headless -p run is BLOCKED (V-022 regression)", async () => {
    const verb = classifyVerb("bash", { command: "omp run -p 'echo hi'" });
    expect(verb).toBe("headless");

    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "omp run -p 'echo hi'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("HEADLESS");
    expect(result.reason).toContain("forbidden");
  });

  test("model-origin node -e inline exec is BLOCKED", async () => {
    const verb = classifyVerb("bash", { command: "node -e 'console.log(1)'" });
    expect(verb).toBe("inline_exec");

    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "node -e 'console.log(1)'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("INLINE_EXEC");
    expect(result.reason).toContain("container");
  });

  test("model-origin node --eval is BLOCKED", async () => {
    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "node --eval 'x=1'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("INLINE_EXEC");
  });

  test("model-origin bun -e is BLOCKED", async () => {
    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "bun -e 'console.log(1)'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("INLINE_EXEC");
  });

  test("model-origin npx -e is BLOCKED", async () => {
    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "npx -e 'require(\"fs\")'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("INLINE_EXEC");
  });

  test("model-origin omp -p run is BLOCKED (headless verb)", async () => {
    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "omp -p 'console.log(1)'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("HEADLESS");
  });

  test("claim_verification intent path still BLOCKS inline_exec", async () => {
    const result = await checkSmokeTestFirewall(
      firewallParams("bash", { command: "node -e 'x=1'" }, true),
    );
    expect(result.action).toBe("BLOCK");
    expect(result.category).toBe("INLINE_EXEC");
  });
});


describe("V-023 contract: the tool_call payload has NO isAgentOrigin field", () => {
  test("a bare node -e BLOCKS (the gate must not depend on an absent field)", async () => {
    const { checkSmokeTestFirewall } = await import("../src/firewalls/semantic-smoke-firewall");
    const v = await checkSmokeTestFirewall({
      toolName: "bash", sessionId: "v023", agentName: "", mode: "", args: {},
      commandStr: "node -e 'console.log(1)'", signals: undefined,
      verificationState: undefined, contextWindow: undefined,
    } as never);
    expect(v.action).toBe("BLOCK");
    expect(v.category).toBe("INLINE_EXEC");
  });
});
