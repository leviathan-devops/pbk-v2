/**
 * V-030 REFUTED (2026-09-21). The "extension failed" string is a BLOCKED TOOL CALL delivered as a
 * tool result — verified: every session carrying it has a model drive, and boot-only sessions (zero
 * tool_call events) never carry it. THE LOADER IS NEVER BLOCKED, so the extension-path exclusion was
 * built on a misreading and WEAKENED the gates. This file now pins the exclusion's ABSENCE.
 */
import { describe, expect, test } from "bun:test";
import { checkSmokeTestFirewall } from "../src/firewalls/semantic-smoke-firewall";

const call = (cmd: string) =>
  checkSmokeTestFirewall({
    toolName: "bash", sessionId: "v030r", agentName: "", mode: "", args: {},
    commandStr: cmd, signals: undefined, verificationState: undefined, contextWindow: undefined,
  } as never);

describe("V-030 REFUTED — no extension-path exclusion exists", () => {
  test("a model command naming the extension path is STILL policed (the hole is closed)", async () => {
    const v = await call(`node -e 'require("/root/.omp/agent/extensions/omp-ct/dist.js")'`);
    expect(v.action).toBe("BLOCK");
  });

  test("CONTROL: an ordinary inline exec still blocks", async () => {
    const v = await call("node -e 'console.log(1)'");
    expect(v.action).toBe("BLOCK");
  });
});
