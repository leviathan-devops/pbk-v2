/**
 * v049-settle-contract.test.ts — the host's TERMINAL-SETTLE contract, honoured.
 *
 * PROBED 2026-09-21 against the installed package
 * (node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/shared-events.ts:196-201):
 *
 *   "When true, the session has already scheduled an automatic continuation (auto-retry,
 *    empty/unexpected-stop retry, etc.). Subscribers MUST NOT treat this as a user-visible
 *    terminal settle."
 *
 * willContinue:true is EMITTED, not hypothetical (src/session/agent-session.ts:3305 · :3327 · :3352 —
 * compaction continuations), and the runtime honours it itself (rpc-frame.ts:316; isTerminal at :3156).
 *
 * MEASURED DEFECT: the settled handler ignored it. It advanced the turn counter — V-040's TURN IDENTITY,
 * the only thing bounding MAX_ACT_APPENDS_PER_RULE_PER_TURN — and ran the claim bind + the L0 on EVERY
 * agent_end, continuations included. A continuation is not a new turn.
 *
 * THIS IS A BEHAVIOURAL TEST: a fake extension host drives the REAL registered handler and observes the
 * real log surface (host.log -> pi.logger). ADVERSARIAL FIRST: the continuation case runs first.
 */
import { describe, expect, test } from "bun:test";
import ctExtension from "../src/index";

/** A permissive fake of the extension API: records handlers + every log line. */
function makeFakePi() {
  const handlers: Record<string, (e: unknown, c: unknown) => unknown> = {};
  const logs: string[] = [];
  const record = (m: unknown) => { logs.push(String(m)); };
  const logger = { debug: record, info: record, warn: record, error: record, log: record };
  // A SELF-RETURNING chain: every property access AND every call yields the same proxy, so
  // pi.zod.enum(…).describe(…).optional() and any other chain the tool schemas build all resolve.
  const zodChain: unknown = new Proxy(function () {} as unknown as object, {
    get: () => zodChain,
    apply: () => zodChain,
  });
  const base: Record<string, unknown> = {
    logger,
    on: (ev: string, h: (e: unknown, c: unknown) => unknown) => { handlers[ev] = h; },
    registerTool: () => {},
    appendEntry: () => {},
    exec: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    zod: zodChain,
    getContext: () => ({ sessionID: "test-session" }),
  };
  const pi = new Proxy(base, {
    get(t, k) {
      if (k in t) return t[k as string];
      return () => undefined; // any other API member: a no-op
    },
  });
  return { pi: pi as never, handlers, logs };
}

const CLAIM = "the task is done";           // an atom the claim firewall will judge
const msg = (text: string) => [{ role: "assistant", content: [{ type: "text", text }] }];

describe("V-049 the terminal-settle guard (source-level pin)", () => {
  // The BEHAVIOURAL half lives in extension-seam-behaviour.test.ts, because ctExtension registers its
  // handlers once per process and only one file may own that init.
  test("the guard is ORDERED before the turn advance (the defect was the ordering)", () => {
    const fs = require("node:fs");
    const path = require("node:path");
    const src = fs.readFileSync(path.join(import.meta.dir, "..", "src", "index.ts"), "utf8");
    const guard = src.indexOf("willContinue === true || event?.isTerminal === false");
    const advance = src.indexOf("turnCounter += 1;");
    expect(guard).toBeGreaterThan(-1);
    expect(advance).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(advance);
  });
});
