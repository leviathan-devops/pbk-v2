/**
 * extension-seam-behaviour.test.ts — the SEAM's behavioural tests, in ONE file by necessity.
 *
 * WHY ONE FILE: `ctExtension(pi)` registers its handlers ONCE PER PROCESS (module-level state), so the
 * FIRST caller gets them and every later caller gets nothing. Measured 2026-09-21: with the behavioural
 * tests split across two files, the second file's handlers were `undefined` and three tests failed —
 * a test-isolation property, not a product defect. The behavioural seam tests therefore live here, with
 * exactly one init; the SOURCE-LEVEL pins stay in their own files (they never call ctExtension).
 *
 * The host seam under test (all citations from the installed @oh-my-pi/pi-coding-agent):
 *   agent_end   -> { type: "agent_end",   messages: AgentMessage[], willContinue?, isTerminal? }
 *                  (shared-events.ts:193-202 · types.ts:1265)
 *   message_end -> { type: "message_end", message:  AgentMessage }
 *                  (types.ts:789-792 · emitted PER RECORD at session/agent-session.ts:946-952)
 *
 * V-049: a willContinue/isTerminal:false event is NOT a terminal settle (must not be judged).
 * V-051: the turn identity advances on the TURN (plural `messages`), never on a MESSAGE.
 */
import { describe, expect, test } from "bun:test";
import ctExtension from "../src/index";

function makeFakePi() {
  const handlers: Record<string, (e: unknown, c: unknown) => unknown> = {};
  const logs: string[] = [];
  const record = (m: unknown) => { logs.push(String(m)); };
  const zodChain: unknown = new Proxy(function () {} as unknown as object, { get: () => zodChain, apply: () => zodChain });
  const base: Record<string, unknown> = {
    logger: { debug: record, info: record, warn: record, error: record, log: record },
    on: (ev: string, h: (...a: never[]) => unknown) => { handlers[ev] = h as unknown as (e: unknown, c: unknown) => unknown; },
    registerTool: () => {}, appendEntry: () => {},
    exec: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
    zod: zodChain,
    getContext: () => ({ sessionID: "test-session" }),
  };
  return { pi: new Proxy(base, { get(t, k) { return k in t ? t[k as string] : () => undefined; } }) as never, handlers, logs };
}

const CLAIM = "the task is done";
const msg = (text: string) => [{ role: "assistant", content: [{ type: "text", text }] }];
const claims = (logs: string[], from: number) => logs.slice(from).filter((l) => l.includes("[CT CLAIM]")).length;

const { pi, handlers, logs } = makeFakePi();
let initError: unknown = null;
try { ctExtension(pi); } catch (e) { initError = e; }
const onAgentEnd = handlers["agent_end"] as ((e: unknown, c: unknown) => unknown) | undefined;
const onMessageEnd = handlers["message_end"] as ((e: unknown, c: unknown) => unknown) | undefined;

describe("the extension seam — behaviour through the REAL registered handlers", () => {
  test("precondition: the extension initialised and registered both ends", () => {
    expect(initError).toBeNull();
    expect(typeof onAgentEnd).toBe("function");
    expect(typeof onMessageEnd).toBe("function");
  });

  // ── V-049 ────────────────────────────────────────────────────────────────
  test("V-049 ADVERSARIAL: willContinue is NOT a settle (no claim judgement)", async () => {
    const from = logs.length;
    await onAgentEnd!({ type: "agent_end", messages: msg(CLAIM), willContinue: true }, { sessionID: "s" });
    expect(claims(logs, from)).toBe(0);
  });

  test("V-049 ADVERSARIAL: isTerminal === false is not a settle either", async () => {
    const from = logs.length;
    await onAgentEnd!({ type: "agent_end", messages: msg(CLAIM), isTerminal: false }, { sessionID: "s" });
    expect(claims(logs, from)).toBe(0);
  });

  test("V-049 CONTROL: a REAL settle DOES judge the claim", async () => {
    const from = logs.length;
    await onAgentEnd!({ type: "agent_end", messages: msg(CLAIM) }, { sessionID: "s" });
    expect(claims(logs, from)).toBeGreaterThan(0);
  });

  // ── V-051 ────────────────────────────────────────────────────────────────
  test("V-051: a message_end still PROCESSES its message (the fallback stays useful)", async () => {
    const from = logs.length;
    await onMessageEnd!({ type: "message_end", message: { role: "assistant", content: [{ type: "text", text: CLAIM }] } }, { sessionID: "s" });
    expect(claims(logs, from)).toBeGreaterThan(0);
  });

  test("V-051 CONTROL: the plural agent_end shape is processed too", async () => {
    const from = logs.length;
    await onAgentEnd!({ type: "agent_end", messages: msg(CLAIM) }, { sessionID: "s" });
    expect(claims(logs, from)).toBeGreaterThan(0);
  });

  test("V-051: a message_end with NO assistant text is inert (no claim, no crash)", async () => {
    const from = logs.length;
    await onMessageEnd!({ type: "message_end", message: { role: "user", content: [{ type: "text", text: CLAIM }] } }, { sessionID: "s" });
    expect(claims(logs, from)).toBe(0);
  });
});
