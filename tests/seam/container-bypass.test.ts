// THE BYPASS LEXICON — the operator's directive (2026-08-09): "there SHOULD
// NOT BE a bypass. make sure the bypasses you used are also added to the
// blocking logic lexicon." The bypass shapes this suite pins:
//   B1 spawnSync/execSync indirection smuggling docker into a child process
//   B2 base64-obfuscated docker (echo <b64> | base64 -d | docker ...)
//   B3 entrypoint-override container spawns (docker run --entrypoint sleep)
//   B4 test-runner indirection (bun test on the ad-hoc bypass files)
//   B5 heredoc/pipe writes materializing docker, then executing the file
//   B6 quoted/escaped docker mid-string (the verb regex miss)
//   W1 write/edit of a test file that drives containers (the materialization
//      channel) — exempt only for the st tool's OWN engine files.
import { beforeEach, afterEach, describe, expect, test } from "bun:test";
import { containerGate, containerWriteGate, isContainerPathCommand, isBypassWrite } from "../../src/middleware/container-gate";
import type { BeforeContext, GateVerdict } from "../../src/middleware/chain";

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

describe("container gate — the BYPASS LEXICON (the operator's no-bypass law)", () => {
  // the gate defaults DISABLED during the deploy fix — the tests exercise the
  // ENABLED behavior, so flip the env per-file (deterministic).
  test("B1: spawnSync indirection smuggling docker into a child process is blocked", () => {
    const indirect = `const r = Bun.spawnSync(["bash", "-lc", "docker run -d --entrypoint sleep --name c img infinity"]);`;
    expect(isContainerPathCommand(indirect)).toBe(true);
    // the direct verb alone is ALSO blocked (the baseline)
    expect(isContainerPathCommand(`docker exec c sh -c "cat /etc/hostname"`)).toBe(true);
  });

  test("B2: base64-obfuscated docker is blocked", () => {
    const cmd = `echo ${Buffer.from("docker exec c ls").toString("base64")} | base64 -d | sh`;
    expect(isContainerPathCommand(cmd)).toBe(true);
  });

  test("B3: entrypoint-override container spawns are blocked (the shell-keepalive trick)", () => {
    expect(isContainerPathCommand(`docker run -d --entrypoint sleep --name ${"c"} ${"img"} infinity`)).toBe(true);
    expect(isContainerPathCommand(`docker rm -f c 2>/dev/null; docker run -d --name c img sleep infinity`)).toBe(true);
  });

  test("B4: test-runner indirection on the ad-hoc bypass files is blocked", () => {
    expect(isContainerPathCommand("bun test tests/seam/net-probe.test.ts")).toBe(true);
    expect(isContainerPathCommand("bun test tests/seam/flip-debug.test.ts")).toBe(true);
    expect(isContainerPathCommand("bun test tests/seam/container-flip-gate.test.ts")).toBe(true);
  });

  test("B4-safety: the SANCTIONED battery files are NOT bypasses (they test the st tool)", () => {
    expect(isContainerPathCommand("bun test tests/seam/container-rpc-battery.test.ts")).toBe(false);
    expect(isContainerPathCommand("bun test tests/seam/sandbox-driver.test.ts")).toBe(false);
    expect(isContainerPathCommand("bun test tests/seam/herdr-visibility.test.ts")).toBe(false);
  });

  test("B5: heredoc writes materializing docker, then executing the file, are blocked", () => {
    const heredoc = `cat > /tmp/x.sh << 'EOF'\ndocker exec c ls\nEOF\nbash /tmp/x.sh`;
    expect(isContainerPathCommand(heredoc)).toBe(true);
  });

  test("B6: quoted docker mid-string is blocked", () => {
    expect(isContainerPathCommand(`sh -c 'docker exec c true'`)).toBe(true);
  });

  test("the gate blocks a bash tool call carrying any bypass shape", async () => {
    const gate = containerGate();
    const v = await gate(baseCtx({ toolName: "bash", input: { command: "bun test tests/seam/net-probe.test.ts" } }));
    expect(v).toBeDefined();
    expect(v!.action).toBe("block");
    expect(blockOf(v).reason).toContain("CONTAINER GATE");
  });

  test("W1: writing a docker-driving test file is blocked (the write surface)", async () => {
    const gate = containerWriteGate();
    const v = await gate(baseCtx({
      toolName: "write",
      input: { path: "tests/seam/net-probe.test.ts", content: `import { test } from "bun:test";\nconst r = Bun.spawnSync(["bash", "-lc", "docker run -d --name c img"]);` },
    }));
    expect(v).toBeDefined();
    expect(v!.action).toBe("block");
    expect(blockOf(v).reason).toContain("CONTAINER GATE");
  });

  test("W1-exempt: the st tool's OWN engine files are not bypasses", () => {
    expect(isBypassWrite("src/engines/sandbox/agentos-sandbox.ts", `docker exec c ls`)).toBe(false);
    expect(isBypassWrite("src/engines/sandbox/driver.ts", `Bun.spawnSync(["bash", "-lc", "docker ..."])`)).toBe(false);
  });

  test("W1-safe: a plain test file (no docker) is not a bypass", async () => {
    const gate = containerWriteGate();
    const v = await gate(baseCtx({
      toolName: "write",
      input: { path: "tests/seam/plain.test.ts", content: `import { test } from "bun:test";\ntest("x", () => { expect(1).toBe(1); });` },
    }));
    expect(v).toBeUndefined();
  });

  test("non-bash tools are never container-gated", async () => {
    const gate = containerGate();
    expect(await gate(baseCtx({ toolName: "read", input: { path: "/a.ts" } }))).toBeUndefined();
    expect(await gate(baseCtx({ toolName: "ct-sandbox-test" }))).toBeUndefined();
  });
});
