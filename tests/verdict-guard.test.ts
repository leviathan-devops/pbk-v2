/**
 * verdict-guard.test.ts — THE INSTRUMENT-VALIDITY GATE, pinned.
 *
 * The root cause it answers (CLAIM: CERTAIN): THE ABSENCE OF A SIGNAL WAS READ AS A SIGNAL. Four false
 * verdicts in one sweep, and five system-level cousins (V-027, V-048, V-062, V-084, V-087).
 *
 * ADVERSARIAL FIRST — every refusal case before the acceptance case, because the refusals ARE the gate.
 */
import { describe, expect, test } from "bun:test";
import {
  recordVerdict, instrumentIsLive, adjudicateRun, InstrumentUnprovenError,
  type Control, type VerdictRecord,
} from "../src/shared/verdict-guard";

const live: Control = { what: "the factory boots", expected: "handler registered", observed: "handler registered" };
const broken: Control = { what: "the factory boots", expected: "handler registered", observed: "NO HANDLER" };
const base = (v: Partial<VerdictRecord> = {}): VerdictRecord => ({
  target: "someGate", probe: "a hostile input", observed: "allow", verdict: "WEAK", control: live, ...v,
});

describe("the instrument-validity gate", () => {
  // ── THE REFUSALS (the gate's whole purpose) ──
  test("ADVERSARIAL: a verdict with NO control is REFUSED", () => {
    expect(() => recordVerdict(base({ control: undefined as unknown as Control }))).toThrow(InstrumentUnprovenError);
  });

  test("ADVERSARIAL: a control with NO declared expectation is REFUSED (a rationalization is not a control)", () => {
    expect(() => recordVerdict(base({ control: { what: "the boot", expected: "", observed: "ok" } }))).toThrow(/NO EXPECTED RESULT/);
  });

  test("ADVERSARIAL: an EMPTY observed result is REFUSED (an absence is not an observation)", () => {
    expect(() => recordVerdict(base({ observed: "   " }))).toThrow(/NO OBSERVED RESULT/);
  });

  test("ADVERSARIAL: a BROKEN instrument REFUSES every verdict — the exact sweep failure", () => {
    // this is the 8 x OVERAGGRESSIVE case: the harness produced no handler and the verdict was recorded anyway
    expect(() => recordVerdict(base({ control: broken }))).toThrow(/INSTRUMENT IS NOT PROVEN/);
  });

  test("ADVERSARIAL: a broken run marks EVERY pending verdict UNOBSERVED, never a finding", () => {
    const run = adjudicateRun(broken, [{ target: "docDensityGate" }, { target: "containerGate" }, { target: "sttgfGate" }]);
    expect(run.blocked).toBe(true);
    expect(run.verdicts.every((v) => v.verdict === "UNOBSERVED")).toBe(true);
    expect(run.reason).toContain("INSTRUMENT IS NOT PROVEN");
  });

  // ── THE ACCEPTANCE (only after the instrument is proven) ──
  test("CONTROL: with a LIVE instrument, the verdict is accepted and returned", () => {
    const r = recordVerdict(base());
    expect(r.verdict).toBe("WEAK");
    expect(r.control.observed).toBe(r.control.expected);
  });

  test("CONTROL: a live run passes its verdicts through", () => {
    const run = adjudicateRun(live, [{ target: "a" }, { target: "b" }]);
    expect(run.blocked).toBe(false);
    expect(run.verdicts).toHaveLength(2);
  });

  test("the liveness predicate compares the DECLARED expectation to the observation", () => {
    expect(instrumentIsLive(live)).toBe(true);
    expect(instrumentIsLive(broken)).toBe(false);
  });
});
