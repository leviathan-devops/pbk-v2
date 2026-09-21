/**
 * claim-parser-bounded.test.ts — V-039: a ReDoS-class stall in the claim parser.
 *
 * PROBED 2026-09-21: `parseClaimAtoms` runs SYNCHRONOUSLY in the `agent_end` handler. Its status regex
 * used `(\w+(?:\s+\w+)*)` — NESTED QUANTIFIERS — which backtracks catastrophically on repetitive
 * near-miss input (`"the daemon is ".repeat(N) + "run"`). Measured: 450ms at 20k repeats and **2322ms
 * at 40k** — a multi-second synchronous stall on every turn end, and worse at scale. An agent pasting a
 * long repetitive log could stall its own session.
 *
 * FIXED by bounding the phrase: `(\w+(?:\s+\w+){0,6})`. Measured after: 9ms / 19ms / 38ms at
 * 20k/40k/80k — LINEAR. Legitimate claims still parse (a subject phrase is never seven words).
 *
 * ADVERSARIAL FIRST: the first test feeds the pathological input and asserts a hard time bound.
 */
import { describe, expect, test } from "bun:test";
import { parseClaimAtoms } from "../src/ext/claim-bind";

describe("V-039 the claim parser is bounded (no catastrophic backtracking)", () => {
  test("ADVERSARIAL: 80k repetitive near-misses parse in well under a second", () => {
    const text = "the daemon is ".repeat(80_000) + "run";
    const t0 = performance.now();
    parseClaimAtoms(text);
    const ms = performance.now() - t0;
    // the pre-fix behaviour was 2300ms+ at 40k; this bound fails loudly if the quantifier regresses
    expect(ms).toBeLessThan(500);
  });

  test("CONTROL: legitimate claims still parse", () => {
    expect(parseClaimAtoms("the daemon is running").length).toBe(1);
    expect(parseClaimAtoms("the build is complete").length).toBe(1);
    expect(parseClaimAtoms("the full test suite is green").length).toBe(1);
    expect(parseClaimAtoms("32 pass 0 fail").length).toBe(2);
  });

  test("CONTROL: a long NON-repetitive sentence is unaffected", () => {
    const sentence = "the quick brown fox jumps over the lazy dog and then the service is running";
    expect(parseClaimAtoms(sentence).length).toBeGreaterThan(0);
  });
});
