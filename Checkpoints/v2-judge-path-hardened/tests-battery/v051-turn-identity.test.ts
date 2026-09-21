/**
 * v051-turn-identity.test.ts — V-051: the turn identity must advance on the TURN, never on a MESSAGE.
 *
 * PROBED 2026-09-21. The host's two shapes are unambiguous:
 *   agent_end   -> messages: AgentMessage[]   (PLURAL, the whole loop)   = the TURN boundary
 *   message_end -> message:  AgentMessage     (SINGULAR, one record)     = a MESSAGE
 * and message_end is emitted PER RECORD (session/agent-session.ts:946-952, a `for` over `records`).
 *
 * MEASURED DEFECT: the settled handler advanced `turnCounter` on EVERY registered event. The per-turn
 * ring is keyed `sessionId::T<currentTurn>` (kernel-judge.ts:734), so a turn with N messages rotated the
 * judge's identity N+1 times and handed the rule a FRESH EMPTY RING each time. V-040's cap was undone one
 * layer up. The mechanism is pinned behaviourally in judge-per-turn-cap.test.ts ("rotating the turn
 * between edits DEFEATS the cap" — 5 rotations, 5 acts; the same 5 edits in one turn cap at 2).
 *
 * WHY THIS FILE IS PARTLY SOURCE-LEVEL: the turn counter is a private closure variable; no behavioural
 * test can read it. The honest pin is therefore on the WIRING — the advance must sit inside the
 * turn-carrying branch. (Same reasoning as V-048's l0-wiring pin.)
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import ctExtension from "../src/index";

const ENTRY = join(import.meta.dir, "..", "src", "index.ts");
const src = readFileSync(ENTRY, "utf8");

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

describe("V-051 the turn identity advances only on a turn-carrying event (source-level pins)", () => {
  // The BEHAVIOURAL half lives in extension-seam-behaviour.test.ts (one init per process).
  test("ADVERSARIAL: the advance sits INSIDE the turn-carrying branch", () => {
    const guardIdx = src.indexOf("const isTurnBoundary = Array.isArray(");
    const advanceIdx = src.indexOf("turnCounter += 1;");
    expect(guardIdx).toBeGreaterThan(-1);
    expect(advanceIdx).toBeGreaterThan(-1);
    expect(guardIdx).toBeLessThan(advanceIdx);
    expect(src.slice(guardIdx, advanceIdx)).toContain("if (isTurnBoundary) {");
  });

  test("ADVERSARIAL: the discriminator is the PLURAL shape, never the singular one", () => {
    const line = src.slice(src.indexOf("const isTurnBoundary"), src.indexOf("const isTurnBoundary") + 140);
    expect(line).toContain("Array.isArray(");
    expect(line).toContain("messages");
    expect(line).not.toContain("message:");
  });
});
