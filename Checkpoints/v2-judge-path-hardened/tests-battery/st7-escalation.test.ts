/**
 * st7-escalation.test.ts — W-1's S3, CLOSED AS AN L0 RULE.
 *
 * THE MEASURED REASON S3 FAILED (2026-09-21): the criterion required the [STTGF ESCALATE] token, which
 * needed 3 CONSECUTIVE blocks — but any compliance call cleared the claim by design, so ESCALATE was
 * UNREACHABLE for a well-behaved model. Measured: two blocks and 7 compliance calls; no 3rd block.
 *
 * The law that made this a defect: "a gate that cannot fire is not a layer."
 *
 * THE FIX: the streak is counted by the L0 ITSELF (ST-7), deterministic and independent of what the
 * consumer does next. A firing increments the member's streak and clears every other member's; a clean
 * buffer clears every streak; at ESCALATE_AT the verdict carries escalate=true.
 *
 * ADVERSARIAL FIRST: the reachability proof (3 firings -> escalate) runs BEFORE the controls.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { decide, resetL0State, newL0EscalationState, ESCALATE_AT, L0_MEMBERS } from "../src/l0/index";

/** P1: the VBD matcher + its triggerCondition pass -> FIRES. */
const FIRES = "the task is done";
/** No matcher hits -> a clean buffer. */
const CLEAN = "let me look at the file";
/** The basic-logic-check member -> a flag. */
const FIRES_FLAG = "i think it probably calls that";

beforeEach(() => resetL0State());

describe("ST-7 escalate-after-3 (W-1's S3, closed as an L0 rule)", () => {
  test("ADVERSARIAL REACHABILITY: three consecutive firings DO escalate (the unreachable path now fires)", () => {
    expect(ESCALATE_AT).toBe(3);
    const v1 = decide(FIRES);
    const v2 = decide(FIRES);
    const v3 = decide(FIRES);

    expect([v1.kind, v2.kind, v3.kind]).toEqual(["act", "act", "act"]);
    expect([v1.consecutive, v2.consecutive, v3.consecutive]).toEqual([1, 2, 3]);
    expect([v1.escalate, v2.escalate, v3.escalate]).toEqual([false, false, true]);
    expect(v3.escalate).toBe(true); // <- the criterion the STTGF path could never satisfy
  });

  test("THE BOUNDARY: two firings do NOT escalate (off-by-one is the easy bug here)", () => {
    decide(FIRES);
    const v2 = decide(FIRES);
    expect(v2.consecutive).toBe(2);
    expect(v2.escalate).toBe(false);
  });

  test("ADVERSARIAL: a CLEAN buffer resets every streak — escalation is not sticky", () => {
    decide(FIRES);
    decide(FIRES);
    decide(CLEAN);                 // the compliance reset, by design
    const after = decide(FIRES);
    expect(after.consecutive).toBe(1);
    expect(after.escalate).toBe(false);
  });

  test("a different member firing breaks the first member's streak", () => {
    decide(FIRES);
    decide(FIRES);
    const other = decide(FIRES_FLAG);
    const back = decide(FIRES);
    expect(other.consecutive).toBe(1);   // B has its own streak
    expect(back.consecutive).toBe(1);    // A's streak was broken by B
    expect(back.escalate).toBe(false);
  });

  test("a skip verdict (host envelope / quoted) also resets", () => {
    decide(FIRES);
    decide(FIRES);
    decide("the task is done", "host");  // the role classifier skips host text
    const after = decide(FIRES);
    expect(after.consecutive).toBe(1);
  });

  test("CONTROL: an explicit state object isolates the streak from the module default", () => {
    const iso = newL0EscalationState();
    decide(FIRES, "agent", iso);
    decide(FIRES, "agent", iso);
    const third = decide(FIRES, "agent", iso);
    expect(third.consecutive).toBe(3);
    expect(third.escalate).toBe(true);
    // the module default never saw those calls
    const fresh = decide(FIRES);
    expect(fresh.consecutive).toBe(1);
  });

  test("CONTROL: the pre-existing verdict fields are UNCHANGED (the wrapper is additive)", () => {
    const v = decide(FIRES);
    // the rule that fired is a REAL L0 member (not an invented id)
    expect(L0_MEMBERS.map((m) => m.id)).toContain(v.rule);
    expect(v.rule).toBe("verification-before-declaration"); // the member's id, lowercase by contract
    expect(v.kind).toBe("act");
    expect(v.matchedSpan).toBeTruthy();   // the evidence-destruction law still holds
    expect(v.evidenceBound).toBe(false);
    expect(typeof v.remediation).toBe("string");
  });
});
