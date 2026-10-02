/**
 * v050-origin-exemption.test.ts — V-050: the origin exemption is UNREACHABLE in production.
 *
 * PROBED 2026-09-21 against the installed package
 * (node_modules/@oh-my-pi/pi-coding-agent, v18.1.14):
 *
 *   - the wrapper emits the tool_call payload as EXACTLY
 *       { type: "tool_call", toolName, toolCallId, input }        (extensions/wrapper.ts:211-224)
 *   - `grep -rn isAgentOrigin` over the WHOLE installed package returns NOTHING.
 *
 * So `event.isAgentOrigin` is always `undefined`, and the chain defaults it to TRUE
 * (src/middleware/chain.ts:121 `event.isAgentOrigin ?? true`). Every gate that exempts loader/host-origin
 * calls (dispatch-gate.ts:75, theatrical-gate.ts:172, dispatch-template-gate.ts:249,
 * semantic-smoke-firewall.ts:265) therefore NEVER exempts anything — while chain.ts:113 documents the
 * exemption as if it were live.
 *
 * THE POLARITY IS FAIL-SAFE (`?? true` = unknown -> ENFORCE), so this is not a live misfire: it is an
 * UNREACHABLE EXEMPTION. The defect is that the code AND its tests claim a filter that cannot exist —
 * the tests that pin the exemption pass `isAgentOrigin: false` explicitly (tests/seam/firewall.test.ts:194),
 * a value the runtime never produces. That is the V-048 lesson in the test dimension: the logic is proven,
 * the wiring is not.
 *
 * THIS TEST PINS THE PRODUCTION REALITY, behaviourally: it drives the REAL attachChain with the host's
 * ACTUAL payload shape and observes what the gates receive.
 */
import { describe, expect, test } from "bun:test";
import { MiddlewareChain, attachChain, type BeforeContext, type AgentScope } from "../src/middleware/chain";

function drive(hostEvent: Record<string, unknown>) {
  const chain = new MiddlewareChain();
  let seen: BeforeContext | null = null;
  chain.useBefore(async (ctx) => { seen = ctx; return undefined; });

  const handlers: Record<string, (e: unknown, c: unknown) => unknown> = {};
  // the handler signature attachChain expects (its ctx is OmpExtensionContext; a test does not need it typed)
  const pi = { on: (ev: string, h: (...a: never[]) => unknown) => { handlers[ev] = h as unknown as (e: unknown, c: unknown) => unknown; } };
  attachChain(pi, chain, (): AgentScope => "main", () => true);

  const ctx = { sessionManager: { getSessionFile: () => "session.jsonl" } };
  return Promise.resolve(handlers["tool_call"](hostEvent, ctx)).then(() => seen as BeforeContext | null);
}

describe("V-050 the origin exemption is unreachable (pinned as the production reality)", () => {
  test("ADVERSARIAL: the host's REAL payload shape yields isAgentOrigin === true", async () => {
    // exactly what extensions/wrapper.ts:211-224 emits — no origin field of any kind
    const seen = await drive({ type: "tool_call", toolName: "bash", toolCallId: "c1", input: { command: "ls" } });
    expect(seen).not.toBeNull();
    expect(seen!.isAgentOrigin).toBe(true);   // unknown -> ENFORCE (the fail-safe polarity)
  });

  test("ADVERSARIAL: an explicit undefined behaves identically (the field can only ever be undefined)", async () => {
    const seen = await drive({ type: "tool_call", toolName: "bash", toolCallId: "c2", input: {}, isAgentOrigin: undefined });
    expect(seen!.isAgentOrigin).toBe(true);
  });

  test("CONTROL: an explicit false IS honoured — the chain returns BEFORE the gates, so no gate runs", async () => {
    // The exemption's observable is that the gate NEVER RUNS (chain.ts:114 returns early), not that the
    // gate sees a false flag. This proves the logic works — and it is precisely the path production
    // cannot reach, because the host never sets the field.
    const seen = await drive({ type: "tool_call", toolName: "bash", toolCallId: "c3", input: {}, isAgentOrigin: false });
    expect(seen).toBeNull();
  });

  test("CONTROL: the host package carries no origin field on its tool events (the source of the finding)", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    // locate the installed package from the repo's own node_modules chain
    // Locate the installed package: the repo's own node_modules first, then the omp worktree installs
    // (~/.omp/wt/*/m/node_modules/...). A missing package is NAMED, never silently skipped.
    const rel = path.join("node_modules", "@oh-my-pi", "pi-coding-agent", "src", "extensibility");
    const candidates: string[] = [
      path.join(import.meta.dir, "..", rel, "shared-events.ts"),
      path.join(import.meta.dir, "..", rel, "extensions", "types.ts"),
    ];
    const wtRoot = path.join(process.env.HOME ?? "/root", ".omp", "wt");
    if (fs.existsSync(wtRoot)) {
      for (const wt of fs.readdirSync(wtRoot)) {
        candidates.push(path.join(wtRoot, wt, "m", rel, "shared-events.ts"));
        candidates.push(path.join(wtRoot, wt, "m", rel, "extensions", "types.ts"));
      }
    }
    const present = candidates.filter((p: string) => fs.existsSync(p));
    if (present.length === 0) {
      console.log("NOTE: the installed @oh-my-pi/pi-coding-agent was not found — the source check did NOT run");
      expect(present.length).toBeGreaterThan(0); // a missing package is a FAILURE of the check, not a pass
      return;
    }
    for (const p of present) {
      const text = fs.readFileSync(p, "utf8");
      const toolEventBlock = text.slice(text.indexOf("ToolCallEventBase"), text.indexOf("ToolCallEventBase") + 400);
      expect(toolEventBlock).not.toContain("isAgentOrigin");
    }
  });
});
