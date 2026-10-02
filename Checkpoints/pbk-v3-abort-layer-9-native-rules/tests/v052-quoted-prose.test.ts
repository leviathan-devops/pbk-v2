/**
 * v052-quoted-prose.test.ts — V-052: quoted PROSE is not the agent's voice (WO-2 extended).
 *
 * FOUND by replaying the corpus's own B2 incident VERBATIM. `derailment-data-log.md` §8 records the exact
 * paused message at 18:23:05:
 *
 *   "The real firing: verification-before-declaration fired and rendered 'You are declaring work
 *    complete', triggered [by a host envelope]"
 *
 * It STILL FIRED in the new L0. The classifier's `hasCodeFence` covered fenced blocks and backtick spans
 * but not quoted PROSE — so the layer punished the report describing the layer, exactly the documented
 * harm ("the layer punishes its own audit trail"). The fixture in the first version of the replay used
 * BACKTICKS and passed: a fixture WEAKER than the incident. The F-03 discipline (copy the corpus
 * verbatim) is what exposed it.
 *
 * THE RULE (WO-2's own words): "a quoted span is never the agent performing the act in its own voice."
 * ADVERSARIAL FIRST: the quotation is suppressed; then the guard that a real claim INSIDE prose with
 * apostrophes is NOT suppressed (the over-exclusion failure mode).
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { decide, stripQuotedProse, resetL0State } from "../src/l0/index";

/** §8's exact text. */
const B2_VERBATIM =
  "The real firing: verification-before-declaration fired and rendered 'You are declaring work complete', triggered [by a host envelope]";

beforeEach(() => resetL0State());

describe("V-052 quoted prose is not the agent's voice", () => {
  test("ADVERSARIAL: the corpus's B2 incident no longer fires", () => {
    const v = decide(B2_VERBATIM);
    expect(v.kind).not.toBe("act");
    expect(v.kind).not.toBe("flag");
    expect(v.rule).toBe("quote-exclusion");
    // V-053 generalised the suppression to every quote kind, so the token is now `quoted:…`
    expect(v.skipReason ?? "").toContain("quoted");
  });

  test("ADVERSARIAL: an apostrophe is NOT a quotation — it cannot hide a claim", () => {
    // The over-exclusion failure mode: a real claim whose sentence contains a contraction. (The FIRST
    // version of this test used "I can't say … don't trust it" and expected `act` — WRONG, and the
    // failure was the test's: a negated sentence is suppressed by the triggerCondition by design, the
    // polarity fix this same corpus demanded. The assertion is now a claim with an apostrophe and no
    // negation, which is what actually isolates the quote-stripper.)
    const v = decide("It's done");
    expect(v.kind).toBe("act");
    expect(v.rule).toBe("verification-before-declaration");
  });

  test("the strip helper removes quoted spans and nothing else", () => {
    expect(stripQuotedProse(B2_VERBATIM)).not.toContain("You are declaring work complete");
    const s = stripQuotedProse("I can't say don't do it");
    expect(s).toBe("I can't say don't do it");            // untouched
  });

  test("double-quoted prose is excluded too", () => {
    const v = decide('the rule rendered "You are declaring work complete" as its example');
    expect(v.kind).not.toBe("act");
  });

  test("CONTROL: a claim in the agent's own voice still fires", () => {
    const v = decide("the task is done");
    expect(v.kind).toBe("act");
    expect(v.matchedSpan).toBeTruthy();                   // the evidence law still holds
  });

  test("CONTROL: a non-quoted clause in the SAME message still fires (speech is suppressed, never the act)", () => {
    const v = decide("The report quoted 'You are declaring work complete' and the task is now done");
    expect(v.kind).toBe("act");                           // the unquoted claim carries it
  });

  test("a quote suppression is a DECISION, not a clean buffer (no silent skips)", () => {
    const v = decide(B2_VERBATIM);
    expect(v.skipReason).toBeTruthy();
    expect(v.reason).toContain("quoted-span hit suppressed"); // V-053's wording (all quote kinds)
    expect(v.reason).toContain("WO-2");                        // it names its work order
  });
});
