/**
 * verdict-guard.ts — THE INSTRUMENT-VALIDITY GATE (the code half of the anti-theatrical firewall).
 *
 * ROOT CAUSE IT EXISTS FOR (backwards-engineered, CLAIM: CERTAIN):
 *   THE ABSENCE OF A SIGNAL WAS READ AS A SIGNAL. Four false verdicts in one sweep — 8× a false
 *   OVERAGGRESSIVE, two false WEAK, one false PARTIAL — every one from an observation that could not
 *   distinguish "the code did X" from "my harness produced nothing". Five system-level cousins share the
 *   mechanism (V-027, V-048, V-062, V-084, V-087). Six manifestations, one law: **a claim about the world
 *   produced from an observation that does not entail it.**
 *
 * THE LAW THIS ENFORCES (IL-15 LEDGER OR IT DID NOT HAPPEN · IL-16 COMPLETION IS A FACT ABOUT THE WORLD ·
 * IL-10 CODE OWNS EVERY BRANCH):
 *   1. A VERDICT WITHOUT A CONTROL IS REFUSED — exactly as a span-less act is refused by the ledger.
 *   2. THE CONTROL IS DECLARED BEFORE IT IS TAKEN — its expected result is an input, not a rationalization.
 *   3. A BROKEN INSTRUMENT MARKS EVERY VERDICT UNOBSERVED — a failed control cannot be read as a finding.
 *   4. THE CONTROL MUST BE CAPABLE OF CONTRADICTING THE VERDICT — a control that would pass under EVERY
 *      outcome proves nothing. (The judgment half — §6.20's observation form — is the model's; this module
 *      carries the structural half.)
 *
 * WHY THIS IS CODE AND NOT A MODEL QUESTION (IL-23, THE BUCKETS STAY HONEST): the EXISTENCE of a control,
 * its declared expectation, and whether it produced that expectation are STRUCTURAL FACTS. They go to code.
 * The SUFFICIENCY of a control — "could this instrument have produced the opposite result?" — is the
 * judgment, and that is where the model earns its place.
 */

/** The verdict vocabulary. UNOBSERVED is first-class: it is what an unproven instrument earns. */
export type Verdict = 'WORKS' | 'OVERAGGRESSIVE' | 'WEAK' | 'INERT' | 'DEAD' | 'PARTIAL' | 'UNOBSERVED';

/** A control: an observation whose expected result is DECLARED BEFORE IT IS TAKEN. */
export interface Control {
  /** What the control does, in one line. */
  readonly what: string;
  /** The result DECLARED BEFORE the control ran. */
  readonly expected: string;
  /** The result ACTUALLY observed, verbatim. */
  readonly observed: string;
}

/** One verdict, with its control. */
export interface VerdictRecord {
  readonly target: string;
  readonly probe: string;
  readonly observed: string;
  readonly verdict: Verdict;
  readonly control: Control;
}

/** Thrown when a verdict is attempted without a proven instrument. */
export class InstrumentUnprovenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstrumentUnprovenError';
  }
}

/**
 * THE PRE-ORDER: run the control FIRST and decide whether the instrument is live.
 * A control whose observed result does not equal its declared expectation means THE HARNESS IS BROKEN —
 * and every verdict from that run is UNOBSERVED, never a finding.
 */
export function instrumentIsLive(control: Control): boolean {
  return control.observed === control.expected;
}

/**
 * THE GUARD: record a verdict, or refuse it.
 * - REFUSES (throws) when the control did not produce its declared expectation — the run is BLOCKED.
 * - REFUSES (throws) when the control's expectation is empty — an undeclared expectation is not a control.
 * - REFUSES (throws) when the observed result is empty — an absence is not an observation.
 * Returns the record so the caller carries it into the artifact.
 */
export function recordVerdict(input: VerdictRecord): VerdictRecord {
  const c = input.control;
  if (!c || typeof c.what !== 'string' || c.what.trim() === '') {
    throw new InstrumentUnprovenError(
      `verdict "${input.verdict}" for "${input.target}" has NO CONTROL: a verdict without a control is a ` +
        'claim about the world produced from an observation that does not entail it (the absence-as-signal ' +
        'class). Declare the control, its expected result, and run it first.',
    );
  }
  if (typeof c.expected !== 'string' || c.expected.trim() === '') {
    throw new InstrumentUnprovenError(
      `the control for "${input.target}" declares NO EXPECTED RESULT: an expectation written after the ` +
        'observation is a rationalization, not a control.',
    );
  }
  if (typeof input.observed !== 'string' || input.observed.trim() === '') {
    throw new InstrumentUnprovenError(
      `the verdict for "${input.target}" carries NO OBSERVED RESULT: an absence is not an observation. ` +
        'If the probe produced nothing, the verdict is UNOBSERVED.',
    );
  }
  if (!instrumentIsLive(c)) {
    throw new InstrumentUnprovenError(
      `THE INSTRUMENT IS NOT PROVEN for "${input.target}": the control "${c.what}" declared ` +
        `"${c.expected}" and observed "${c.observed}". A broken harness cannot yield findings — the run is ` +
        'BLOCKED and every verdict from it is UNOBSERVED.',
    );
  }
  return input;
}

/**
 * THE RUN-LEVEL GUARD: given the control and a list of pending verdicts, return the verdicts ONLY when the
 * instrument is live; otherwise return every one as UNOBSERVED with the reason attached.
 * This is the shape a harness calls after its control has run.
 */
export function adjudicateRun<T extends { target: string }>(
  control: Control,
  pending: readonly T[],
): { blocked: boolean; reason: string; verdicts: Array<T & { verdict: Verdict }> } {
  if (instrumentIsLive(control)) {
    return { blocked: false, reason: '', verdicts: pending.map((p) => ({ ...p, verdict: 'WORKS' as Verdict })) };
  }
  return {
    blocked: true,
    reason:
      `THE INSTRUMENT IS NOT PROVEN: the control "${control.what}" declared "${control.expected}" and ` +
      `observed "${control.observed}". Every verdict from this run is UNOBSERVED — the absence of a signal ` +
      'is not a signal.',
    verdicts: pending.map((p) => ({ ...p, verdict: 'UNOBSERVED' as Verdict })),
  };
}
