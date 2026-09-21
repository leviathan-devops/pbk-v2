/**
 * L0 — THE ISE PORT (Paragon V2 §4-5 laws applied to the 6 parked kernels).
 *
 * The six parked kernels at ~/.agent/rules.parked-20260920/*.md were bare-word
 * regex matchers (`contextMode: discard`) that misfired 27 times in one session
 * and destroyed their own evidence (deleted the text they punished).
 *
 * V2 rebuilds them to the canonical ISE shape (Paragon V2 §1 law 1):
 *   - a typed member record: {id, kind, matcher, triggerCondition, severity, messageTemplate, remediationHook}
 *   - a priority-ordered decide() — the state machine that DECIDES (the regex never decides alone)
 *   - the role classifier (classifyBuffer) runs BEFORE any detector — host envelopes never reach a detector
 *   - quoted regions are excluded — a quotation is not the agent performing the act
 *   - every firing writes a ledger row BEFORE any discard (the audit law)
 *
 * This file: the type contracts only. The members + decide() live in index.ts.
 */

// ── VERDICT BANDS ───────────────────────────────────────────────────────────
// mirror the events-ledger.ts Band type: act (block) | flag (warn) | clear (silent) | skip (role/quote)
export type Band = 'act' | 'flag' | 'clear' | 'skip';

// ── VERDICT ─────────────────────────────────────────────────────────────────
// The six-probe verdict vocabulary (Paragon V2 §6 instrument 1):
//   FIRES  -> kind: 'act'    (the act is real, the claim is unsupported — REFUSE)
//   SILENT -> kind: 'skip'|'clear' (no detector fired — polarity, mention, quote, gap record)
//   PASSES -> kind: 'clear' + evidenceBound: true (the claim is bound to real evidence)
export interface L0Verdict {
  /** FIRES=act | SILENT=skip|clear | PASSES=clear+evidenceBound */
  kind: 'act' | 'flag' | 'clear' | 'skip';
  /** The rule that produced this verdict (or 'l0-decide' for the default) */
  rule: string;
  /** The exact matched substring — non-null for act/flag bands; null on skip/clear */
  matchedSpan: string | null;
  /** Why this verdict (for the ledger + operator) */
  reason: string;
  /** The remediation path */
  remediation: string;
  /** Why a skip happened, else null */
  skipReason: string | null;
  /** True when the claim was bound to real evidence (T7: "32 pass 0 fail ran just now") */
  evidenceBound: boolean;
  /**
   * ST-7 (escalate-after-3): how many CONSECUTIVE decide() calls this rule has fired. A clean buffer
   * resets every streak — compliance clears the claim by design (measured: S3, 2026-09-21).
   */
  consecutive: number;
  /**
   * ST-7: true when the streak reached the escalate threshold. The L0 DECIDES this deterministically;
   * a consumer must treat it as the operator-notification signal. Additive: no existing field changes,
   * so the 14 call sites keep their behaviour.
   */
  escalate: boolean;
}

// ── THE TYPED MEMBER RECORD (the ISE law §5.1) ──────────────────────────────
// This is the canonical shape — identical in structure to
// src/firewalls/ct-anti-derailment.ts:CtMutationPattern.
//
// THE REGEX-AS-DETECTOR LAW: the matcher field is the DETECTION layer ONLY —
// it flags the candidate text. The DECISION lives in the triggerCondition
// (the contextual gate) + the priority-ordered decide(). A regex body without
// the machine is slop; the machine + the typed member + the evidence triad
// make it the canon's sanctioned form.
export interface L0Member {
  /** Stable identifier — the parked kernel's name */
  id: string;
  /** The evidence class (the ISE pattern family) */
  kind: 'claim' | 'scope-shrink' | 'theatrical' | 'logic-guess' | 'structural-edit' | 'verification';
  /** The mechanical DETECTOR — a function that returns the matched substring or null.
      DETECTS only; never decides. */
  matcher: (text: string) => string | null;
  /** The contextual gate — the DECISION layer. Receives the text + the matched span.
      Returns true ONLY when the act is really happening (not negated, not past-tense,
      not quoted, not a gap record, etc.). */
  triggerCondition: (text: string, matchedSpan: string) => boolean;
  /** BLOCK (act) | WARN (flag) | INFO (info) */
  severity: Band;
  /** The message shown when the rule fires */
  messageTemplate: string;
  /** The repair path named to the agent */
  remediationHook: string;
}

// ── THE DECIDE RESULT ───────────────────────────────────────────────────────
export type DecideResult = L0Verdict;
