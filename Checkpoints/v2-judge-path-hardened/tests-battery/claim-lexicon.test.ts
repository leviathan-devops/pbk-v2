/**
 * claim-lexicon.test.ts — V-083, the negation over-suppression, pinned.
 *
 * TWO DEFECTS IN ONE GUARD (both measured):
 *   1. the negation set carried POSITIVE-LOADED tokens (`no `, `fail(ed|ing|s)?`, `yet`) — so
 *      "There are no failures, all tests pass" was discarded, and **`0 failures` / `zero failures` —
 *      two of the STRONG-PHRASE regex's own patterns — were DEAD BY CONSTRUCTION**;
 *   2. the guard discarded the WHOLE SENTENCE, so a negation in one clause killed a claim in another.
 *
 * ADVERSARIAL FIRST: the two cases the defect killed, then the genuine negations that MUST still hold.
 */
import { describe, expect, test } from "bun:test";
import { isCompletionClaim, CLAIM_STRONG_PHRASE_RE, CLAIM_NEGATION_RE } from "../src/middleware/claim-lexicon";

describe("V-083 the completion-claim detector", () => {
  // ── THE FALSE NEGATIVES THE DEFECT PRODUCED (must now ARM) ──
  test("ADVERSARIAL: 'there are no failures, all tests pass' ARMS (the positive-loaded token)", () => {
    expect(isCompletionClaim("There are no failures, all tests pass")).toBe(true);
  });

  test("ADVERSARIAL: '0 failures' ARMS — the strong phrase that was dead by construction", () => {
    expect(CLAIM_STRONG_PHRASE_RE.test("0 failures")).toBe(true);   // the pattern exists
    expect(isCompletionClaim("the battery reports 0 failures")).toBe(true);
  });

  test("ADVERSARIAL: 'zero failures' ARMS", () => {
    expect(isCompletionClaim("zero failures across the suite")).toBe(true);
  });

  test("ADVERSARIAL: a negation in ONE clause does not kill the claim in the NEXT", () => {
    expect(isCompletionClaim("Not verified before, but now all tests pass")).toBe(true);
  });

  // ── THE GENUINE NEGATIONS THAT MUST STILL HOLD ──
  test("CONTROL: 'not verified' does NOT arm", () => {
    expect(isCompletionClaim("the build is not verified")).toBe(false);
  });

  test("CONTROL: 'needs verification' does NOT arm", () => {
    expect(isCompletionClaim("this still needs verification")).toBe(false);
  });

  test("CONTROL: 'I am trying to verify the build' does NOT arm", () => {
    expect(isCompletionClaim("I am trying to verify the build")).toBe(false);
  });

  test("CONTROL: 'will verify' does NOT arm", () => {
    expect(isCompletionClaim("I will verify the suite next")).toBe(false);
  });

  // ── THE ORIGINAL ADAPTATION'S LAW (no work-state verbs) ──
  test("CONTROL: work-state prose does NOT arm (the omp adaptation's own law)", () => {
    expect(isCompletionClaim("I am working on the extension")).toBe(false);
    expect(isCompletionClaim("the build is complete")).toBe(false);
    expect(isCompletionClaim("I fixed the tool")).toBe(false);
  });

  test("CONTROL: an audit is not a container test", () => {
    expect(isCompletionClaim("the audit verified the build")).toBe(false);
  });

  test("CONTROL: a real claim with a work entity ARMS", () => {
    expect(isCompletionClaim("I verified the build and the suite passes")).toBe(true);
  });
});
