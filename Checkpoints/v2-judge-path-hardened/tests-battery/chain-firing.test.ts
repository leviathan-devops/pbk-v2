/**
 * chain-firing.test.ts — THE WHOLE ENFORCEMENT SURFACE, probed for the one thing that matters: DOES IT FIRE?
 *
 * V-060 found a wired security gate that could never fire. That result deserves to be checked across the
 * whole chain rather than at one node, so every gate was driven with an input that MUST trigger it:
 *
 *   docDensityGate      BLOCKS a short .md below its type's floor
 *   containerGate       BLOCKS the protected-path mutation class ([PBK CONFIG LOCK])
 *   guardianGate        INERT — structurally unable to fire (V-060; its assertion below is the pin)
 *   containerWriteGate  BLOCKS a test file that smuggles a container run
 *   dispatchGate        BLOCKS a disallowed agent, REWRITES a thin task
 *   sttgfGate           BLOCKS the inline-exec class
 *   theatricalGate      BLOCKS on the 3rd substitute-frame suggestion (escalate-after-3)
 *
 * A NOTE THAT COST THREE PROBES: each gate reads its OWN parameter keys (`input.path`, not `file_path`;
 * `input.task` + `input.agent`, not `prompt` + `subagent_type`). Three probes in a row passed the wrong
 * keys and every gate dutifully "did nothing". **A probe with invented parameter names produces a false
 * "it is inert"** — the same failure shape as V-052's weak fixture and V-059's invented event kinds. The
 * assertions below use the keys the SOURCE reads.
 *
 * ADVERSARIAL FIRST within each gate: the blocking case before the allow case.
 */
import { describe, expect, test } from "bun:test";
import type { BeforeContext } from "../src/middleware/chain";
import { docDensityGate } from "../src/middleware/doc-density-gate";
import { containerGate, containerWriteGate } from "../src/middleware/container-gate";
import { dispatchGate } from "../src/middleware/dispatch-gate";
import { sttgfGate } from "../src/middleware/sttgf-gate";
import { theatricalGate, TheatricalStateTracker } from "../src/middleware/theatrical-gate";
import { guardianGate } from "../src/hooks/guardian-hook";

const host = {
  readFileSync: () => null, writeFileSync() {}, existsSync: () => false, mkdirSync() {},
  execSync: () => ({ code: 0, stdout: "", stderr: "" }), sha256Sync: () => null,
  now: () => "2026-09-21T00:00:00Z", log() {},
} as never;
const ctx = (toolName: string, input: Record<string, unknown>, extra: Record<string, unknown> = {}): BeforeContext =>
  ({ toolName, input, scope: "main", isAgentOrigin: true, toolCallId: "c", sessionId: "chain-test", ...extra }) as never;

describe("the chain — every gate's firing ability", () => {
  test("docDensityGate BLOCKS a short .md, and allows a DRAFT (the relaxation)", async () => {
    const g = docDensityGate(host);
    expect(await g(ctx("write", { path: "SPEC_X.md", content: "too short" }))).toBeDefined();
    expect(await g(ctx("write", { path: "SPEC_X.md", content: "DRAFT — work in progress" }))).toBeUndefined();
  });

  test("containerGate BLOCKS the protected-path class and allows a benign command", async () => {
    const g = containerGate();
    const blocked = await g(ctx("bash", { command: "cp x auth.json" }));
    expect(blocked).toBeDefined();
    expect(String((blocked as { reason?: string }).reason)).toContain("CT CONFIG LOCK");
    expect(await g(ctx("bash", { command: "ls -la" }))).toBeUndefined();
  });

  test("containerWriteGate BLOCKS a smuggled container run and allows a bare string mention", async () => {
    const g = containerWriteGate();
    const smuggled = await g(ctx("write", { path: "tests/x.test.ts", content: "import { spawnSync } from 'child_process';\nspawnSync('docker', ['run','x']);" }));
    expect(smuggled).toBeDefined();
    // the precise discrimination: a bare docker STRING in a test is not execution
    expect(await g(ctx("write", { path: "tests/x.test.ts", content: "const s = 'docker run x';" }))).toBeUndefined();
  });

  test("dispatchGate BLOCKS a disallowed agent, REWRITES a thin task, exempts extension origin", async () => {
    const g = dispatchGate();
    const bad = await g(ctx("task", { task: "# Mission", agent: "not-a-real-agent" }));
    expect(bad).toBeDefined();
    expect((bad as { action?: string }).action).toBe("block");
    const thin = await g(ctx("task", { task: "do the thing", agent: "scout" }));
    expect((thin as { action?: string }).action).toBe("rewrite");
    expect(await g(ctx("task", { task: "x", agent: "nope" }, { isAgentOrigin: false }))).toBeUndefined();
  });

  test("sttgfGate BLOCKS the inline-exec class", async () => {
    const v = await sttgfGate()(ctx("bash", { command: 'bun -e "console.log(1)"' }));
    expect(v).toBeDefined();
    expect(String((v as { reason?: string }).reason)).toContain("STTGF");
  });

  test("theatricalGate BLOCKS on the THIRD substitute-frame suggestion (escalate-after-3)", async () => {
    const g = theatricalGate(new TheatricalStateTracker());
    const c = ctx("bash", { command: "mock the result" }, { sessionId: "th-" + Date.now() });
    expect(await g(c)).toBeUndefined();   // 1 — state-marked only
    expect(await g(c)).toBeUndefined();   // 2 — state-marked only
    const third = await g(c);             // 3 — escalates
    expect(third).toBeDefined();
    expect(String((third as { reason?: string }).reason)).toContain("THEATRICAL ESCALATE");
  });

  test("guardianGate is INERT in production (V-060) — the assertion that pins the finding", async () => {
    // The live path can never track an agent, so the gate always returns early. If this ever starts
    // BLOCKING, the pin in f1-isolation-wiring.test.ts fails first and this test says why.
    for (const tool of ["code-audit", "poseidon-tool", "ct-gate"]) {
      expect(await guardianGate()(ctx(tool, {}, { sessionId: "g-" + tool }))).toBeUndefined();
    }
  });
});
