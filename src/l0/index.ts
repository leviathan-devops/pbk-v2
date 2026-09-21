/**
 * L0 — THE ISE PORT (Paragon V2 §4-5 laws applied to the 6 parked kernels).
 *
 * The six parked kernels at ~/.agent/rules.parked-20260920/*.md were bare-word
 * regex matchers (`contextMode: discard`) that misfired 27 times in one session
 * and destroyed their own evidence (deleted the text they punished).
 *
 * V2 rebuilds them to the canonical ISE shape:
 *   - typed member record: {id, kind, matcher, triggerCondition, severity, messageTemplate, remediationHook}
 *   - priority-ordered decide() — the state machine that DECIDES
 *   - the role classifier (classifyBuffer) runs BEFORE any detector — host
 *     envelopes never reach a detector
 *   - quoted regions are excluded — a quotation is not the agent performing the act
 *   - every firing writes a ledger row BEFORE any discard (the audit law)
 *
 * BUILD ORDER (per blueprint §2): LEDGER -> RUBRIC -> L0 PORT.
 * This file depends on the events-ledger.ts role classifier (WO-1) and the
 * recordFiring ledger writer (WO-3).
 */

import { classifyBuffer, type BufferOrigin, recordFiring, sealLedger } from '../ledger/events-ledger.js';
import type { L0Member, L0Verdict, Band } from './types.js';

// ── SHARED DETECTION FRAMES ─────────────────────────────────────────────────
// These regexes are exported so the six-probe tests can verify the detection
// layer independently from the decide() routing. They DETECT only.

/** Claim words — the verification-before-declaration detector. */
export const CLAIM_WORD_RE = /\b(?:done|complete[d]?\b|fixed|verified|it\s+works|all\s+green|all\s+pass(?:ed|es)?)\b/i;

/** Negation tokens — a negated claim is not a claim (P2 polarity, P3 mention). */
export const CLAIM_NEGATION_RE = /\b(?:not|cannot|can't|won't|refuse|refused|never|without|unverified|unsubstantiated|fail(?:ed|ing|s)?|pending|todo|wip|to\s+be)\b/i;

/** Past-tense forms — reporting a completion is not asserting one (P3 probe). */
export const PAST_TENSE_RE = /\b(?:completed|finished|passed|confirmed|closed|shipped|built|tested)\b/i;

/** Present-tense work entities for the claim-word test. */
export const WORK_ENTITY_RE = /\b(?:task|work|build|fix|feature|module|file|test|suite|battery|gate|chain|engine|tool|pipeline|component|function|scope|phase)\b/i;

/** Strong phrases that are claims outright (no negation need apply). */
export const STRONG_PHRASE_RE = /\b(?:everything\s+works|all\s+green|all\s+(?:tests|pass|checks)\s+pass|verified\s+everything|is\s+verified|confirmed\s+correct|task\s+completed|wave\s+succeeded|build\s+succeeded|audit\s+passed)\b/i;

/** Gap-record exemptor — sentences that discuss the audit/remedy are not claims (P2 probe). */
export const CLAIM_AUDIT_REMEDY_RE = /\b(?:manifest\s+records|gap|what\s+is\s+not|not\s+verified|records\s+what)\b/i;

/** Scope-shrink phrases — the anti-scope-shrink detector. */
export const SCOPE_SHRINK_RE = /\b(?:too\s+complex|too\s+big|simplify\s+the\s+scope|reduce\s+the\s+scope|out\s+of\s+scope|shrink(?:ing|ed)?\s+(?:scope|the\s+promise))\b/i;

/** Scope gap-record exemptor — "the manifest records what is not verified" (P2 polarity). */
export const SCOPE_GAP_RE = /\b(?:not\s+verified|what\s+is\s+not|records\s+what|gap|missing\s+(?:scope|item))\b/i;

/** Theatrical substitute-frame phrases — the anti-theatrical detector. */
export const THEATRICAL_RE = /\b(?:skip\s+(?:the\s+)?(?:test|battery|verification|suite)|mock|stub|fake)\b/i;

/** Guessing patterns — the basic-logic-check detector. */
export const GUESS_RE = /\b(?:i(?:'ll| will)\s+just\s+assume|let\s+me\s+guess|probably\s+calls|maybe\s+imports|might\s+be|i\s+think|could\s+be)\b/i;

/** Drift / structural-edit phrases — the graph-before-structural-edit detector. */
export const DRIFT_RE = /\b(?:drift|GRAPH_GATE_DRIFT_HIGH|structural\s+edit|structural\s+code|reimplement|reimplemented)\b/i;

/** Happy-path claim phrases — the red-team-default detector. */
export const HAPPY_PATH_RE = /\b(?:happy\s+path|all\s+tests\s+pass|everything\s+works|pass\s+\d+|0\s+fail(?:ures)?)\b/i;

/** Evidence tokens — real test output binds a claim to evidence (T7 probe). */
export const EVIDENCE_RE = /\b(?:\d+\s+pass(?:ed)?|\d+\s+fail(?:ed)?|exit\s+code\s+\d+|ran\s+just\s+now|container\s+test|tsc\s+exit|battery)\b/i;

// ── SENTENCE-LEVEL CLASSIFIERS (the polarity/tense logic) ───────────────────
// These are pure functions — no state, no side effects. They extract the
// decision-level context for the triggerConditions.

/** True if the sentence contains a negation that cancels the claim (P2 polarity). */
export function isNegated(sentence: string): boolean {
  return CLAIM_NEGATION_RE.test(sentence);
}

/** True if the sentence is pure past-tense reporting (P3 mention). */
export function isPastTense(sentence: string): boolean {
  return PAST_TENSE_RE.test(sentence) && !STRONG_PHRASE_RE.test(sentence);
}

/** True if the sentence is a gap-record (discusses what is NOT verified). */
export function isGapRecord(sentence: string): boolean {
  return CLAIM_AUDIT_REMEDY_RE.test(sentence) || SCOPE_GAP_RE.test(sentence);
}

// ── THE SIX MEMBERS ─────────────────────────────────────────────────────────
// Priority order: the most specific / highest-assurance rules first.
// (Paragon V2 §1 law 1: the regex may DETECT; it may never DECIDE.
//  The triggerCondition is the DECISION.)

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 1 — verification-before-declaration (the claim kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/verification-before-declaration.md
//
// P1 ("the task is done")        -> matcher hits "done" + triggerCondition passes -> FIRES
// P2 ("the manifest records what is not verified") -> matcher hits "verified"
//   but isGapRecord (not verified) -> triggerCondition false -> SILENT (polarity)
// P3 ("### bg_25 [bash] - completed") -> matcher hits "completed" but isPastTense
//   -> triggerCondition false -> SILENT (mention)
// ════════════════════════════════════════════════════════════════════════════
const VERIFICATION_BEFORE_DECLARATION: L0Member = {
  id: 'verification-before-declaration',
  kind: 'claim',
  matcher: (text: string): string | null => {
    const m = text.match(CLAIM_WORD_RE);
    if (!m) return null;
    // T4 guard (§5 incident class E): "goal.complete" — "complete" is part of
    // an identifier (preceded by a dot), NAMING an interface, not a claim.
    const idx = m.index ?? 0;
    if (idx > 0 && text[idx - 1] === '.') return null;
    return m[0];
  },
  triggerCondition: (text: string, matchedSpan: string): boolean => {
    // T4 guard (§5 incident class E): if the matched span is preceded by a
    // dot, it is part of an identifier (e.g. "goal.complete"), NAMING an
    // interface, not making a claim.
    const spanIdx = text.indexOf(matchedSpan);
    if (spanIdx > 0 && text[spanIdx - 1] === '.') {
      return false;
    }
    const sentences = text.split(/[.!?]+\s+|\n+/);
    for (const s of sentences) {
      if (!CLAIM_WORD_RE.test(s)) continue;
      const wordIdx = s.indexOf(matchedSpan);
      if (wordIdx > 0 && s[wordIdx - 1] === '.') {
        return false;
      }
      if (isNegated(s)) continue;            // P2: "not verified" -> skip
      if (isPastTense(s)) continue;          // P3: "completed" -> skip
      if (isGapRecord(s)) continue;          // P2: "manifest records what is not verified" -> skip
      return true;                           // P1: "the task is done" -> fire
    }
    return false;
  },
  severity: 'act',
  messageTemplate: 'You are declaring work complete. State the PASTED test output or build exit code that proves it. A "done" without a run is FALSE. Run the verification now.',
  remediationHook: 'RUN the test or the build before saying it works. If you cannot run it, state BLOCKED with the reason.',
};

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 2 — anti-scope-shrink (the scope kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/anti-scope-shrink.md
//
// P2 ("the manifest records what is not verified") -> the SCOPE_SHRINK_RE
//   does NOT match (no "too complex" / "simplify scope" etc.) -> SILENT
// ════════════════════════════════════════════════════════════════════════════
const ANTI_SCOPE_SHRINK: L0Member = {
  id: 'anti-scope-shrink',
  kind: 'scope-shrink',
  matcher: (text: string): string | null => {
    const m = text.match(SCOPE_SHRINK_RE);
    return m ? m[0] : null;
  },
  triggerCondition: (text: string, _matchedSpan: string): boolean => {
    // If the sentence is a gap record (reporting what is NOT verified),
    // it is not an assertion to shrink — allow it (P2 polarity).
    if (isGapRecord(text)) return false;
    return true;
  },
  severity: 'act',
  messageTemplate: 'You are about to shrink the scope. Decompose + first wave instead. NEVER reduce the promise. The scope is the contract.',
  remediationHook: 'Expand the decomposition into more tasks. Do NOT trim the promise — surface the open item as operator-gated, not as a shrink.',
};

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 3 — anti-theatrical (the theater-kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/anti-theatrical.md
//
// P4 (quoted trigger list) -> buffer classified as 'quoted' by classifyBuffer
//   -> decide() returns SILENT before any matcher runs (WO-2 quote exclusion)
// A non-quoted agent text with theatrical language -> FIRES.
// ════════════════════════════════════════════════════════════════════════════
const ANTI_THEATRICAL: L0Member = {
  id: 'anti-theatrical',
  kind: 'theatrical',
  matcher: (text: string): string | null => {
    const m = text.match(THEATRICAL_RE);
    return m ? m[0] : null;
  },
  triggerCondition: (_text: string, _matchedSpan: string): boolean => {
    return true;
  },
  severity: 'act',
  messageTemplate: 'You are about to make a theatrical claim without mechanical evidence. RUN the test or the build before saying it works.',
  remediationHook: 'Run the battery. "just mock the result" -> replace with a real container test. Theatrical claims are FALSE.',
};

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 4 — basic-logic-check (the guessing kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/basic-logic-check.md
//
// T4 ("naming the close interface") -> "goal.complete" / "the claim firewall
//   intercepts" does NOT match GUESS_RE -> SILENT (not guessing, just naming)
// ════════════════════════════════════════════════════════════════════════════
const BASIC_LOGIC_CHECK: L0Member = {
  id: 'basic-logic-check',
  kind: 'logic-guess',
  matcher: (text: string): string | null => {
    const m = text.match(GUESS_RE);
    return m ? m[0] : null;
  },
  triggerCondition: (_text: string, _matchedSpan: string): boolean => {
    return true;
  },
  severity: 'flag',
  messageTemplate: 'You are guessing a dependency. QUERY the graph instead: ripwire verb=callers or graph-query verb=who-calls. Never guess what you can measure.',
  remediationHook: 'ripwire verb=callers target=<symbol> before making structural assumptions.',
};

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 5 — graph-before-structural-edit (the drift kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/graph-before-structural-edit.md
//
// T4 ("naming the close interface") -> "goal.complete" is naming an interface,
//   not editing structural code. The matcher may hit "drift" or "edit" but
//   triggerCondition requires structural-edit intent + drift context.
// ════════════════════════════════════════════════════════════════════════════
const GRAPH_BEFORE_STRUCTURAL_EDIT: L0Member = {
  id: 'graph-before-structural-edit',
  kind: 'structural-edit',
  matcher: (text: string): string | null => {
    const m = text.match(DRIFT_RE);
    return m ? m[0] : null;
  },
  triggerCondition: (text: string, _matchedSpan: string): boolean => {
    const structuralIntent = /\b(?:edit|editing|rewrite|rewrite|modify|refactor|change|structural)\b/i.test(text);
    return structuralIntent || /GRAPH_GATE_DRIFT_HIGH/.test(text);
  },
  severity: 'flag',
  messageTemplate: 'You are editing structural code (exports, imports, types) with high session drift. QUERY the graph first: ripwire verb=callers or graph-query verb=who-calls.',
  remediationHook: 'ripwire verb=callers target=<symbol> or graph-query verb=who-calls on the symbol before editing structural code.',
};

// ════════════════════════════════════════════════════════════════════════════
// MEMBER 6 — red-team-default (the verification kernel)
// The parked kernel: ~/.agent/rules.parked-20260920/red-team-default.md
//
// T7 ("32 pass 0 fail ran just now") -> matcher hits "pass" / "0 fail" but
//   triggerCondition sees evidence tokens ("ran just now", "pass 0 fail")
//   -> evidenceBound -> the claim is grounded, NOT theatrical -> PASSES
// ════════════════════════════════════════════════════════════════════════════
const RED_TEAM_DEFAULT: L0Member = {
  id: 'red-team-default',
  kind: 'verification',
  matcher: (text: string): string | null => {
    const m = text.match(HAPPY_PATH_RE);
    return m ? m[0] : null;
  },
  triggerCondition: (text: string, _matchedSpan: string): boolean => {
    // If the text carries real evidence (test counts, exit codes, "ran just now"),
    // the claim is bound to a span -> the claim is grounded, not theatrical.
    // T7: "32 pass 0 fail ran just now" -> evidence present -> NOT a violation.
    return !EVIDENCE_RE.test(text);
  },
  severity: 'act',
  messageTemplate: 'Happy-path-only testing is theater. The adversarial cases run FIRST.',
  remediationHook: 'Run the adversarial/failure cases first. Then the happy path. Cite the full test output.',
};

// ── THE MEMBER SET (priority order) ─────────────────────────────────────────
// Priority: the most specific / highest-assurance rules first.
// The claim kernel (VBD) fires on bare claims; the verification kernel
// (red-team) fires on happy-path theater. Scope-theatrical-logic-graph
// follow. The order matters: a claim that also contains a scope-shrink phrase
// should be judged by the claim kernel first (the claim is the act).
export const L0_MEMBERS: L0Member[] = [
  VERIFICATION_BEFORE_DECLARATION,
  ANTI_SCOPE_SHRINK,
  RED_TEAM_DEFAULT,
  ANTI_THEATRICAL,
  BASIC_LOGIC_CHECK,
  GRAPH_BEFORE_STRUCTURAL_EDIT,
];

/**
 * The L0 decide() — the state machine (Paragon V2 §4 law 1, §5 laws 1-6).
 *
 * THE OVER-BREADTH LAW (§1 class 24): scope to the OPERATION, not to a token
 * anywhere. The role classifier (WO-1) runs FIRST — host envelopes and quoted
 * regions NEVER reach a detector. The matchers DETECT; the triggerConditions
 * DECIDE. The regex never decides alone.
 *
 * Buffer kinds that skip all detectors (WO-1 + WO-2):
 *   - host-envelope: <system-notice>, <system-reminder>, <task-result>, MCP envelopes
 *   - quoted: fenced code blocks, inline code spans
 *
 * Verdict mapping to the acceptance probes:
 *   P1 ("the task is done")        -> FIRES  (VBD matcher + triggerCondition pass)
 *   P2 ("the manifest records what is not verified") -> SILENT (VBD triggerCondition: gap-record)
 *   P3 (past-tense "completed")    -> SILENT (VBD triggerCondition: past-tense)
 *   P4 (quoted trigger list)       -> SILENT (role classifier: quoted -> skip)
 *   T4 (interface name "goal.complete") -> SILENT (no matcher hits)
 *   T7 ("32 pass 0 fail ran just now") -> PASSES (red-team matcher hits but
 *       triggerCondition sees evidence -> evidenceBound=true, kind=clear)
 */
export function decide(text: string, origin: BufferOrigin = 'agent'): L0Verdict {
  const classified = classifyBuffer(text, origin);

  // ── WO-1: host envelopes never reach a detector ──
  // INCIDENT CLASS A (derailment-data-log.md §1): the kernel fired on host-
  // authored text. classifyBuffer returns 'host-envelope' for system tags +
  // MCP envelopes BEFORE any detector sees the text.
  if (classified.kind === 'host-envelope') {
    recordFiring({
      rule: 'role-skip',
      buffer: 'host-envelope',
      band: 'skip',
      matched_span: null,
      verdict: 'host buffer — rule not applicable (WO-1)',
      skip_reason: 'role:' + classified.reason,
    });
    return {
      kind: 'skip',
      rule: 'role-filter',
      matchedSpan: null,
      reason: 'host-envelope buffer — detectors skipped (WO-1: FIRE-ON-HOST-TEXT)',
      remediation: 'No action — host-authored text is structurally exempt.',
      skipReason: 'host-envelope:' + classified.reason,
      evidenceBound: false,
    };
  }

  // ── WO-2: quoted regions are not the agent's voice ──
  // INCIDENT CLASS B (derailment-data-log.md §2): the kernel fired on the
  // agent's own vocabulary, quoted. classifyBuffer returns 'quoted' for fenced
  // code blocks + inline code spans BEFORE any detector sees the text.
  if (classified.kind === 'quoted') {
    recordFiring({
      rule: 'quote-exclusion',
      buffer: 'quoted',
      band: 'skip',
      matched_span: null,
      verdict: 'quoted region — not the agent performing the act (WO-2)',
      skip_reason: 'quoted:' + classified.reason,
    });
    return {
      kind: 'skip',
      rule: 'quote-exclusion',
      matchedSpan: null,
      reason: 'quoted buffer — detectors skipped (WO-2: USE/MENTION blindness)',
      remediation: 'No action — quoted regions are not the agent performing the act.',
      skipReason: 'quoted:' + classified.reason,
      evidenceBound: false,
    };
  }

  // ── Run members in priority order ──
  // Track the last matcher hit (even if suppressed by triggerCondition)
  // so the verdict reports which detector fired but was contextually killed.
  let lastMatchedMember: L0Member | null = null;
  let lastMatchedSpan: string | null = null;

  for (const member of L0_MEMBERS) {
    const matchedSpan = member.matcher(text);
    if (!matchedSpan) continue;

    lastMatchedMember = member;
    lastMatchedSpan = matchedSpan;
    const triggered = member.triggerCondition(text, matchedSpan);

    if (triggered) {
      // The matcher DETECTED + the triggerCondition DECIDED -> the act is real.
      recordFiring({
        rule: member.id,
        buffer: classified.kind,
        band: member.severity as Band,
        matched_span: matchedSpan,
        verdict: member.messageTemplate,
        jev_called: true,
      });

      if (member.severity === 'act') {
        return {
          kind: 'act',
          rule: member.id,
          matchedSpan,
          reason: member.messageTemplate,
          remediation: member.remediationHook,
          skipReason: null,
          evidenceBound: false,
        };
      }
      // flag bands -> warn but don't block
      return {
        kind: 'flag',
        rule: member.id,
        matchedSpan,
        reason: member.messageTemplate,
        remediation: member.remediationHook,
        skipReason: null,
        evidenceBound: false,
      };
    }

    // Matcher hit but triggerCondition false -> the detection was a false
    // positive (negated, past-tense, gap-record, evidence-bound) -> SILENT.
    recordFiring({
      rule: member.id,
      buffer: classified.kind,
      band: 'clear',
      matched_span: null,
      verdict: 'matcher hit but triggerCondition false — contextual gate suppressed',
      skip_reason: 'triggerCondition-false:' + matchedSpan,
    });

    // Special case: the red-team-default matcher hit but was suppressed by
    // evidence in the triggerCondition — this is PASSES (T7 probe).
    if (member.id === 'red-team-default') {
      return {
        kind: 'clear',
        rule: member.id,
        matchedSpan,
        reason: 'claim bound to real evidence — NOT a theatrical claim (T7: PASSES)',
        remediation: 'No action — the claim has supporting evidence.',
        skipReason: 'evidence-bound:' + matchedSpan,
        evidenceBound: true,
      };
    }
  }

  // No member FIRED (matcher hit but triggerCondition suppressed, or no matcher hit).
  // Report the last matcher hit as the rule — this proves the detector ran
  // but was contextually suppressed (polarity, mention, gap record).
  // T4: "goal.complete" does not match ANY matcher -> true no-match.
  recordFiring({
    rule: lastMatchedMember ? lastMatchedMember.id : 'l0-decide',
    buffer: classified.kind,
    band: 'clear',
    matched_span: lastMatchedSpan,
    verdict: lastMatchedMember
      ? 'matcher hit but triggerCondition false — contextual gate suppressed'
      : 'no matcher or triggerCondition passed — SILENT',
    skip_reason: lastMatchedMember ? 'triggerCondition-false:' + lastMatchedSpan : 'no-match',
  });

  return {
    kind: 'clear',
    rule: lastMatchedMember ? lastMatchedMember.id : 'l0-decide',
    matchedSpan: lastMatchedSpan,
    reason: lastMatchedMember
      ? 'matcher hit but triggerCondition suppressed — SILENT'
      : 'No L0 member fired — the buffer is clean (SILENT).',
    remediation: 'No action required.',
    skipReason: lastMatchedMember ? 'triggerCondition-false:' + lastMatchedSpan : 'no-match',
    evidenceBound: false,
  };
}

// ── Re-exports for consumers ────────────────────────────────────────────────
export type { L0Member, L0Verdict, Band };
export { sealLedger };
