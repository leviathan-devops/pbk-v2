/**
 * v053-span-level-quotes.test.ts — V-053: quote exclusion is decided at SPAN level, not buffer level.
 *
 * FOUND by following V-052's lesson ("a fixture can be weaker than the incident") into the MIRROR failure
 * mode: over-exclusion. `hasCodeFence` returned true whenever the buffer merely CONTAINED a fence or two
 * backticks, so `classifyBuffer` called the WHOLE buffer 'quoted' and EVERY detector skipped it. Measured:
 *
 *   "The `parse` function is done and the `write` path works"   -> skip / quote-exclusion   (a REAL claim)
 *   "I read `src/foo.ts` and the task is done"                  -> skip / quote-exclusion   (a REAL claim)
 *
 * A coding agent writes backticked identifiers constantly, so the layer was blind to most real
 * declarations — the design's own misfire control says the opposite: *"excluding quoted spans cannot hide
 * a real derailment: the offending act is always in the agent's own prose, outside quotes."*
 *
 * THE FIX: detection runs on the buffer MINUS its quoted spans (fences, inline code, quoted prose); a hit
 * that exists only inside a quotation is suppressed and RECORDED. Both directions are gated here, because
 * only one of them is the failure that was measured.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { decide, stripQuotedSpans, stripQuotedCode, resetL0State } from "../src/l0/index";

beforeEach(() => resetL0State());

describe("V-053 span-level quote exclusion", () => {
  // ── the OVER-EXCLUSION direction: the failure V-053 measured ──
  test("ADVERSARIAL: a claim BESIDE inline code still FIRES", () => {
    const v = decide("The `parse` function is done and the `write` path works");
    expect(v.kind).toBe("act");
    expect(v.rule).toBe("verification-before-declaration");
    expect(v.matchedSpan).toBeTruthy();          // the evidence law: the span is the unquoted hit
  });

  test("ADVERSARIAL: a claim in a message naming a backticked path still FIRES", () => {
    const v = decide("I read `src/foo.ts` and the task is done");
    expect(v.kind).toBe("act");
  });

  test("a fenced block does not blind the prose BESIDE it", () => {
    const v = decide("Here is the diff:\n```\n+ const a = 1\n```\nThe task is done.");
    expect(v.kind).toBe("act");
  });

  // ── the UNDER-EXCLUSION direction: the incident V-052 fixed must stay fixed ──
  test("ADVERSARIAL: a claim INSIDE a fence is still SILENT", () => {
    const v = decide("```\nthe task is done\n```");
    expect(v.kind).not.toBe("act");
    expect(v.rule).toBe("quote-exclusion");
  });

  test("the quoted report table (the corpus's class B) is still SILENT", () => {
    const v = decide("| kernel | condition |\n|---|---|\n| vbd | `\\b(?:done|complete)\\b` |");
    expect(v.kind).not.toBe("act");
  });

  // ── the stripper's own contract ──
  test("stripQuotedCode removes fenced blocks and inline spans, and nothing else", () => {
    expect(stripQuotedCode("```\nthe task is done\n```")).not.toContain("done");
    expect(stripQuotedCode("I read `a.ts` today")).toBe("I read   today");
    expect(stripQuotedCode("no code here")).toBe("no code here");
  });

  test("stripQuotedSpans composes code and prose removal", () => {
    const s = stripQuotedSpans("I read `a.ts` and quoted 'the task is done' as an example");
    expect(s).not.toContain("a.ts");
    expect(s).not.toContain("the task is done");
  });

  test("CONTROL: a bare claim is untouching (no code, no quotes)", () => {
    const v = decide("the task is done");
    expect(v.kind).toBe("act");
  });

  test("CONTROL: plain prose stays silent", () => {
    expect(decide("Let me look at the file first.").kind).toBe("clear");
  });
});
