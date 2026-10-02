/**
 * bind-diagnostic-honesty.test.ts — V-037.
 *
 * PROVENANCE: a probe of the claim firewall's TEMPORAL rule found that an `async` judge (a natural
 * mistake — the real TypeSafe call IS async) produced a REJECT whose reason read "judge rejected atom
 * …", a LIE about the cause. My probe itself was malformed; the code was fail-closed (the safe
 * direction) — but the DIAGNOSTIC named the wrong cause, which is the exact failure mode that cost
 * this campaign hours. Fixed: the reason now names the real one.
 *
 * The temporal rule itself was verified correct in the same probe (a previous-turn span → WRONG_SPAN).
 */
import { describe, expect, test } from "bun:test";
import { bindAtoms, parseClaimAtoms } from "../src/ext/claim-bind";

const TS = "2026-09-21T12:00:00.000Z";
const span = [{ text: "32 pass / 0 fail — Ran 455 tests", ts: TS, source: "bash" }];

describe("V-037 diagnostic honesty", () => {
  test("a SYNCHRONOUS support judge binds the claim (PASS)", () => {
    const r = bindAtoms(parseClaimAtoms("32 pass 0 fail"), span as never, {
      currentTurn: TS,
      judge: (() => ({ verdict: "support" })) as never,
    });
    expect(r.verdict).toBe("PASS");
  });

  test("an ASYNC judge is FAIL_CLOSED and NAMES the real cause (never 'judge rejected')", () => {
    const r = bindAtoms(parseClaimAtoms("32 pass 0 fail"), span as never, {
      currentTurn: TS,
      judge: (async () => ({ verdict: "support" })) as never,
    });
    expect(r.verdict).toBe("FAIL_CLOSED");
    expect(r.reason).toContain("returned a Promise");
    expect(r.reason).not.toContain("judge rejected");
  });

  test("TEMPORAL: a previous-turn span never binds (WRONG_SPAN)", () => {
    const old = [{ text: "32 pass / 0 fail — Ran 455 tests", ts: "2026-09-20T00:00:00.000Z", source: "bash" }];
    const r = bindAtoms(parseClaimAtoms("32 pass 0 fail"), old as never, {
      currentTurn: TS,
      judge: (() => ({ verdict: "support" })) as never,
    });
    expect(r.verdict).toBe("WRONG_SPAN");
  });
});
