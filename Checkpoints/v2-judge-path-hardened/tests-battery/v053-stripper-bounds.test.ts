/**
 * v053-stripper-bounds.test.ts — the NEW stripper regexes are on the HOT path; they must be bounded.
 *
 * V-039's lesson: a new regex on a synchronous path is a stall waiting to happen (the class that produced a
 * 2.3 s freeze). `stripQuotedSpans` runs on EVERY agent message that reaches the L0 — a message is
 * attacker-influenced text (anything the agent writes), so the adversarial shapes belong in the suite, not
 * in a one-off probe.
 *
 * The bound asserted here is deliberately loose (a ceiling, not a benchmark): the point is to catch a
 * BACKTRACKING BLOWUP, not to tune micro-seconds. Measured on this host at the time of writing: worst
 * 0.7 ms across these shapes.
 *
 * ADVERSARIAL FIRST: the pathological shapes run before the plain-text control.
 */
import { describe, expect, test } from "bun:test";
import { stripQuotedSpans } from "../src/l0/index";

const CEILING_MS = 250; // generous: a blowup is orders of magnitude, not percent

const SHAPES: Array<[string, string]> = [
  ["many unclosed fences", "```\n".repeat(400) + "the task is done"],
  ["one unclosed fence + a 60k tail", "```\n" + "x".repeat(60000)],
  ["5000 unpaired backticks", "`".repeat(5000) + " the task is done"],
  ["4000 paired backticks", "`a`".repeat(4000) + " the task is done"],
  ["5000 single quotes", "'".repeat(5000) + " the task is done"],
  ["quote-heavy prose", "he said '".repeat(500) + "done' and then ".repeat(500)],
  ["alternating fence kinds", ("```\na\n~~~\nb\n```\n").repeat(300)],
  ["no newline but many ticks", "```".repeat(2000)],
  ["a 60k plain message", "the task is done. " + "word ".repeat(12000)],
];

describe("the quote-stripper is bounded (V-039's class, on the new hot path)", () => {
  for (const [label, text] of SHAPES) {
    test(`ADVERSARIAL: ${label} completes well under the ceiling`, () => {
      const t0 = performance.now();
      const out = stripQuotedSpans(text);
      const ms = performance.now() - t0;
      expect(typeof out).toBe("string");
      expect(ms).toBeLessThan(CEILING_MS);
    });
  }

  test("CONTROL: plain text is returned unchanged and fast", () => {
    const t0 = performance.now();
    expect(stripQuotedSpans("the task is done")).toBe("the task is done");
    expect(performance.now() - t0).toBeLessThan(CEILING_MS);
  });

  test("the unclosed-fence rule does not swallow a CLOSED pair before it", () => {
    // a closed pair is removed by the pair rule; only a genuinely unclosed fence swallows the tail
    const s = stripQuotedSpans("```\nquoted\n```\nreal prose here");
    expect(s).not.toContain("quoted");
    expect(s).toContain("real prose here");
  });
});
