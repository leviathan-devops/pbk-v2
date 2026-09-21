// src/firewalls/surgical-mutator.ts — THE SURGICAL MUTATOR (the 7.5 SSTF
// overhaul's C-3 / FR-3 — the wave 3's deliverable)
//
// THE ROLE (the spec's C-3.1 :1264-1266): the operator's conditional lift's
// implementation — the slop spans' surgical replacement with the warheads, the
// non-slop content byte-identical, the full-message mutation STRUCTURALLY
// IMPOSSIBLE (the mutator never constructs a full replacement — only the span
// splices). The operator's 2026-08-11 mandate: "I will lift the message mutation
// ban for this specific use case only provided that the surgical mutation
// mechanism is properly engineered w/ its lexicon so we do not lose entire chat
// streams and ONLY the affected chunks/paragraphs of the message are surgically
// mutated" (the spec :86). THE DERALMENT HISTORY (the operator's quote — the
// spec's ANTI-1): "THAT was the biggest derailment is the WHOLE fucking message
// got mutated" — the span-scoped splice is the answer, and the byte-preservation
// is BY CONSTRUCTION (C-3.5 :1350-1390), never by post-hoc repair.
//
// THE ARCHITECTURE (the spec's C-3.7 data-flow :1438-1479): a THREE-STAGE
// PIPELINE — (1) THE IDEMPOTENCE GUARD (the already-mutated marker present →
// the NO-OP, byte-identical — C-3.6 :1404-1413), (2) THE PARSE + THE
// CLASSIFICATION (the smoke lexicon's classifyMessageSpans — the REAL module,
// the wave 2's landed deliverable — the merged ClassifiedSpan[] IS the splice's
// coordinate map — the lexicon's own contract: "the merged shape is the wave-3
// mutator's splice input — the offsets are the splice's coordinates" :78-93),
// (3) THE SPLICE (the string-builder — the non-slop original bytes VERBATIM +
// the warheads at the slop spans' positions — C-3.5).
//
// THE TYPE CONTRACTS (C-3.2 :1268-1302 — with the REAL-module reconciliation):
//   - The spec's MutationResult { text, mutated: number, verdicts, marker }.
//     THE CONTEXT-ARGS DISCREPANCY (flag): the context args said `mutated:
//     boolean` — the spec :1275 says `mutated: number; // the slop-span count`,
//     the wave-4 seam (semantic-smoke-firewall.ts:39) types `mutated: number`,
//     and the hook's consumption (hook-chain.ts:3433) is `tOut.mutated === 0`
//     (the byte-identical pass-through guard — a boolean would break it: `false
//     === 0` is false, so the no-op would NOT continue). THE NUMBER IS THE
//     CONTRACT: the count of the mutated slop spans. Implemented as the number.
//   - The seam's consume (semantic-smoke-firewall.ts:37-40): `mutateMessage?:
//     (text: string, sessionId?: string) => { text: string; mutated: number;
//     verdicts?: unknown[] }` — the sessionId is OPTIONAL in the seam, so this
//     module's sessionId is `string | undefined` (assignable to BOTH the seam's
//     optional form and the spec's MutatorSurface required form). The third
//     opts parameter is the 7.5 TEST 5's test seam (the spec :3698 —
//     `mutateMessage(message, SESSION, { forceClassifierError: true })`).
//   - The warheads: THE SINGLE SOURCE is the smoke lexicon's selectWarheadLocal
//     (smoke-lexicon.ts:108-126 — the C-3.3 drafts implemented by the wave 2) —
//     the classified spans CARRY .warhead; this module CONSUMES span.warhead
//     (the lexicon's contract: "the wave-3 surgical mutator CONSUMES the
//     verdict's warhead ... it never needs to re-derive the text" :112-114).
//     The mutator defines ONLY: (a) the mutation marker (the FR-3.5 visibility —
//     C-3.3 :1320-1322 — the lexicon has no marker), (b) the defensive fallback
//     warheads (used ONLY when a slop span's .warhead is somehow absent — the
//     spec's C-3.3 drafts, capped at WARHEAD_MAX_CHARS), (c) the fail-path
//     markers (the '[SSTF MUTATION FAIL]' family — the spec's 6.3 battery
//     :2548 requires that literal + the 7.5 TEST 5 :3693/:3700 requires
//     'PARSE FAILURE'/'CLASSIFICATION FAILURE').
//   - THE 400-CHAR WARHEAD CAP (the G-9.1 token-economy bound — the register
//     4.8.4 :1808-1814): enforced at the template layer (the fallbacks are
//     pre-verified ≤ 400); the splice's defensive check NEVER truncates — an
//     over-cap warhead (a lexion regression) falls back to the SMOKE variant
//     (the task: "a defensive length check truncates never — it throws or falls
//     back to the SMOKE variant").
//   - THE SLOP-SPAN SANITY LINE (the lexicon's contract :420-426): SLOP_SPAN_MAX
//     _CHARS = 600 is EXPORTED by the lexicon "so the mutator enforces it
//     without re-deriving the constant" — a claim span over 600 chars (a
//     structured block mis-parsed as prose) → the fail-open NO-OP + the marker
//     naming the oversized span, NEVER a partial splice.
//
// THE FAIL-PATHS FIRST (the loud-fail law — FR-16.2 + the spec's C-3.6
// :1415-1435): the parse failure (the unparseable control-byte input) → the
// NO-OP + the marker naming the parse failure; the classification failure → the
// NO-OP + the marker naming the classification failure; the construction failure
// → the NO-OP + the marker. THE NO-OP NEVER produces a partial mutation — the
// message flows through untouched (text === the original, mutated === 0). Every
// catch LOGS via ctLog and recovers by returning the NO-OP — never an
// empty catch, never a throw that escapes the public interface.
//
// THE IDEMPOTENCE (BC-3 / FR-5.2): (a) the short-circuit — the already-mutated
// marker's presence returns the NO-OP (C-3.6 :1404-1413); (b) the property — the
// warhead + the marker texts contain NO claim words, so the second pass over the
// mutated message classifies zero slop EVEN WITHOUT the short-circuit (the
// battery asserts both).
//
// THE ISE LAW (the spec's Governing law — the WARHEAD 9, applied): the
// DETECTION is the lexicon's job (the C-2's lexicons + the state machines); the
// MUTATION is this module's job; the pipeline (guard → parse → classify →
// splice → marker) is the state machine — the fail-state is the NO-OP, never a
// silent pass. NEVER a regex-slop tower — the only regexes here are the
// fail-path DETECTORS (the control-byte scan), never the decision layer.
//
// THE DEPENDENCY GRAPH (the spec :292): surgical-mutator.ts → smoke-lexicon.ts
// (classifyMessageSpans + SLOP_SPAN_MAX_CHARS) → evidence-tracker.ts
// (getEvidenceState — the marker's dist/state) + utils.ts (ctLog).

import { classifyMessageSpans, SLOP_SPAN_MAX_CHARS } from './smoke-lexicon.js';
import type { ClassifiedSpan, TextSpan, SpanKind } from './smoke-lexicon.js';
import { getEvidenceState } from './evidence-tracker.js';
import type { EvidenceRecord, EvidenceState, EvidenceVerdict } from './evidence-tracker.js';
import { ctLog } from '../utils.js';

// ════════════════════════════════════════════════════════════════════════════
// C-3.2 — THE TYPE CONTRACTS (the public surface + the internal fail carriers)
// ════════════════════════════════════════════════════════════════════════════

/** THE PUBLIC RESULT (the spec's C-3.2 MutationResult :1273-1278 — the seam
 *  consumes a SUBSET: { text, mutated, verdicts? }; the marker is the extra
 *  FR-3.5 visibility field). */
export interface MutationResult {
  text: string;                     // the mutated message (the splice + the marker)
  mutated: number;                  // THE SLOP-SPAN COUNT (the number — the spec :1275
                                    // + the seam :39 + the hook's `=== 0` guard :3433)
  verdicts: ClassifiedSpan[];       // the full per-span classification (the audit —
                                    // the lexicon's merged spans: .text + .kind +
                                    // .start + .end + .subject + .evidenceVerdict +
                                    // .warhead + the `[k: string]: unknown` index sig)
  marker: string | null;            // the appended marker (the FR-3.5 visibility —
                                    // null when nothing was mutated)
}

/** THE MUTATOR'S OPTIONS (the 7.5 TEST 5's test seam — the spec :3698):
 *  forceClassifierError forces the classification-failure path deterministically
 *  (the real lexicon is fail-open — the query errors never escape — so the
 *  battery needs this seam to exercise the catch). */
export interface MutatorOptions {
  forceClassifierError?: boolean;
}

/** THE INTERNAL CLASSIFY-STEP OUTCOME (the fail-path as a FIRST-CLASS VALUE —
 *  the task's Task 1: the carrier distinguishes the parse failure from the
 *  classification failure, each carrying the marker text it must emit — the
 *  "never a partial mutation" invariant is then ASSERTABLE, never a hope). */
type ClassifyOutcome =
  | { ok: true; verdicts: ClassifiedSpan[] }
  | { ok: false; failure: 'parse' | 'classify'; marker: string };

// ════════════════════════════════════════════════════════════════════════════
// C-3.3 — THE MARKER + THE DEFENSIVE WARHEADS (the single-source reconciliation)
// ════════════════════════════════════════════════════════════════════════════

// THE WARHEAD LENGTH CAP (the register 4.8.4 :1808-1814 + the lexicon's local
// const :106 — the lexicon's is private, so the mutator re-declares the bound
// per the register for its OWN defensive check; the register is the authority).
const WARHEAD_MAX_CHARS = 400;

/** THE MUTATION MARKER (FR-13.3 + C-3.3 :1320-1322 — the EXACT draft text — the
 *  visibility: the agent SEES what was mutated + why. The S1 container
 *  scenario's pass token is the literal `[SSTF SMOKE MUTATION]` — the spec's
 *  CONTAINER TEST PLAN :62 — this marker carries it verbatim. The marker carries
 *  NO message contents (CN-17.3 — the privacy of the non-slop content). */
function mutationMarker(n: number, sha: string, state: EvidenceState): string {
  return `[SSTF SMOKE MUTATION] ${n} claim span(s) mutated: the evidence state for dist ${sha} is ${state} — the warheads name the missing container verification. The non-claim content is untouched.`;
}

// THE DEFENSIVE FALLBACK WARHEADS (the spec's C-3.3 drafts :1306-1316 — used
// ONLY when a CLAIM_SLOP span carries no .warhead — the primary path is the
// lexicon's span.warhead. Each is pre-verified ≤ WARHEAD_MAX_CHARS + contains
// NO claim words (the idempotence property) + no [SSTF MUTATION FAIL] text.
const FALLBACK_SMOKE_WARHEAD = (sha: string): string =>
  `[SSTF SMOKE] this claim is a SMOKE TEST — the evidence state for dist ${sha} is SMOKE_ONLY — the smoke runs (node -e/bun -e/grep-as-proof) never constitute the runtime proof. The container verification is the only evidence that satisfies this claim: run the container red-team (container-testing: the setup with a validated plan + the scenarios + the results artifact).`;
const FALLBACK_UNEVIDENCED_WARHEAD = (sha: string): string =>
  `[SSTF UNEVIDENCED] this claim has NO verification evidence for dist ${sha} — neither the unit gates nor the container suite have recorded a pass for this build. The verification first: the battery + the container red-team (the setup with a validated plan + the scenarios + the results artifact).`;
const FALLBACK_UNIT_ONLY_WARHEAD = (sha: string): string =>
  `[SSTF UNIT-ONLY] this claim rests on the unit gates only (the battery/tsc) — the unit evidence is NOT the runtime proof. The container verification is required before this claim can stand: the container red-team (the setup with a validated plan + the scenarios + the results artifact).`;

/** THE DEFENSIVE WARHEAD SELECTOR (the C-3.3 selection logic — mirrors the
 *  lexicon's selectWarheadLocal :108-126 — the mutator's fallback floor when a
 *  slop span's .warhead is absent. NEVER truncates — the cap is enforced at the
 *  template layer; the selection is by the span's evidence verdict. */
function selectFallbackWarhead(v: EvidenceVerdict | undefined): string {
  const sha = v?.distSha ?? 'unknown';
  if (v?.verdict === 'SMOKE') return FALLBACK_SMOKE_WARHEAD(sha);
  if (v?.verdict === 'UNEVIDENCED') return FALLBACK_UNEVIDENCED_WARHEAD(sha);
  return FALLBACK_UNIT_ONLY_WARHEAD(sha);
}

// THE FAIL-PATH MARKERS (the 6.3 battery's `[SSTF MUTATION FAIL]` literal
// :2548 + the 7.5 TEST 5's 'PARSE FAILURE'/'CLASSIFICATION FAILURE' :3693/:3700
// — the distinct prefix keeps the fail marker from ever tripping the success
// marker's idempotence short-circuit). THE CONTRACT (the coherent 7.5 form:
// text UNTOUCHED + the marker in the marker field — the spec's C-3.6 :1433 +
// the 7.5 TEST 5 :3691-3693 — the 6.3 draft's `result.text.toContain(...)` at
// :2548 is internally contradictory with its own `result.text === broken` at
// :2547 and is NOT implemented — flagged in the wave audit).
const PARSE_FAILURE_MARKER = '[SSTF MUTATION FAIL] PARSE FAILURE — the message was left untouched (the parse-failure no-op).';
const CLASSIFICATION_FAILURE_MARKER = '[SSTF MUTATION FAIL] CLASSIFICATION FAILURE — the message was left untouched (the classification-failure no-op).';
const CONSTRUCTION_FAILURE_MARKER = '[SSTF MUTATION FAIL] CONSTRUCTION FAILURE — the message was left untouched (the no-op).';

function oversizedSpanMarker(len: number): string {
  return `[SSTF MUTATION FAIL] OVERSIZED SPAN — a claim span of ${len} chars exceeds the ${SLOP_SPAN_MAX_CHARS}-char sanity line — the message left untouched (never a partial splice).`;
}

// ════════════════════════════════════════════════════════════════════════════
// THE PIPELINE STAGES (the spec's C-3.4/3.5/3.6 — the state machine)
// ════════════════════════════════════════════════════════════════════════════

/** THE IDEMPOTENCE GUARD (C-3.6 :1404-1413 — the belt-and-suspenders): the
 *  already-mutated message's marker/warhead tags short-circuit the mutation —
 *  the second pass over the mutated message = the NO-OP (byte-identical). */
function isIdempotentNoOp(text: string): boolean {
  return text.includes('[SSTF SMOKE MUTATION]') || text.includes('[SSTF SMOKE]') ||
    text.includes('[SSTF UNEVIDENCED]') || text.includes('[SSTF UNIT-ONLY]');
}

// THE FORBIDDEN-CONTROL-CHARACTER PREDICATE — THE CALIBRATION (the register):
// the standard ASCII C0/C1 control classification — a char is the unparseable
// class when (a) it is BELOW the C0 printable ceiling (0x20 — the space, the
// lowest legitimate message char) AND it is NOT one of the whitespace trio
// (0x09 \t / 0x0a \n / 0x0d \r — the legitimate message formatting), or (b) it
// is the DEL char (0x7f — the C1 ceiling's first non-printable). THE FIXTURE
// (the spec's 7.5 TEST 5 :3689 — '\u0000\u0001' — "forces the parse-failure
// path deterministically" :3728) is exactly this class. THE DETECTOR LAYER
// ONLY (the ISE law) — the DECISION (the NO-OP + the marker) lives in the
// pipeline state machine, never in this predicate.
function isForbiddenControlChar(code: number): boolean {
  return (code < 0x20 && code !== 0x09 && code !== 0x0a && code !== 0x0d) || code === 0x7f;
}

/** THE PARSE-FAILURE DETECTION (the spec's 7.5 TEST 5 fixture): a message
 *  containing the forbidden control characters is the unparseable class — the
 *  parse step refuses it deterministically (the NO-OP + the marker naming the
 *  parse failure). */
function isParseableText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    if (isForbiddenControlChar(text.charCodeAt(i))) return false;
  }
  return true;
}

/** THE SLOP-SPAN PREDICATE (the splice's decision — a typed named predicate over
 *  the lexicon's SpanKind, never an inline untyped comparison). */
function isSlopSpan(v: { kind: SpanKind; warhead: string | null }): boolean {
  return v.kind === 'CLAIM_SLOP';
}

/** THE SPAN LENGTH (the TextSpan's measure — used by the oversized-span guard). */
function spanLength(span: TextSpan): number {
  return span.end - span.start;
}

/** THE PARSE + THE CLASSIFICATION STEP (the C-3.4 + C-2 fusion — the REAL
 *  lexicon's classifyMessageSpans fuses the splitter + the classifier into ONE
 *  merged ClassifiedSpan[] — the offsets ARE the splice's coordinates, so the
 *  parse never happens as a separate exported step; this step's OUTCOME is the
 *  discriminated union that makes the fail-paths first-class). */
function parseAndClassify(
  text: string,
  sessionId: string,
  forceClassifierError: boolean,
): ClassifyOutcome {
  // THE PARSE FAILURE FIRST (the error paths FIRST): the unparseable input is
  // refused BEFORE the classifier — the NO-OP + the marker naming the parse.
  if (!isParseableText(text)) return { ok: false, failure: 'parse', marker: PARSE_FAILURE_MARKER };
  // THE CLASSIFICATION-FAILURE TEST SEAM (the spec :3698): the real lexicon is
  // fail-open (the query errors never escape — smoke-lexicon.ts:385-390), so
  // the battery forces the catch deterministically through this option.
  if (forceClassifierError) {
    ctLog('WARN', 'surgical-mutator', `the classification failure forced by the test seam (forceClassifierError) for ${sessionId}`);
    return { ok: false, failure: 'classify', marker: CLASSIFICATION_FAILURE_MARKER };
  }
  try {
    const verdicts = classifyMessageSpans(text, sessionId);
    return { ok: true, verdicts };
  } catch (err) {
    ctLog('ERROR', 'surgical-mutator', `the classification failed for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
    return { ok: false, failure: 'classify', marker: CLASSIFICATION_FAILURE_MARKER };
  }
}

/** THE SPLICE (C-3.5 :1353-1389 — the byte-preservation BY CONSTRUCTION): the
 *  string-builder — iterate the classified spans in file order; the non-slop
 *  spans' ORIGINAL bytes are copied VERBATIM (text.slice — no trim, no re-wrap,
 *  no case changes); each CLAIM_SLOP span is replaced by its warhead (the
 *  span.warhead from the lexicon's single source, with the defensive fallback).
 *  THE FULL-MESSAGE REPLACEMENT IS STRUCTURALLY IMPOSSIBLE (ANTI-1): the builder
 *  only ever concatenates the original bytes + the warhead strings — it never
 *  reorders, never drops a non-slop character, never constructs a full
 *  replacement. A mutation can only ADD (the warheads + the marker), never
 *  remove the non-slop content — the chat-stream loss impossible (CN-1.1). */
function spliceSpans(text: string, spans: ClassifiedSpan[]): { text: string; mutated: number } {
  const parts: string[] = [];
  let cursor = 0;
  let mutated = 0;
  for (const span of spans) {
    if (isSlopSpan(span)) {
      // THE WARHEAD RESOLUTION: the lexicon's single-source warhead first; the
      // defensive fallback (by the span's evidence verdict) when absent; an
      // over-cap warhead (a lexicon regression) falls back to the SMOKE variant —
      // NEVER truncated, NEVER dropped (a dropped warhead would leave the slop
      // claim's span silently deleted — the loud-fail violation).
      let warhead = typeof span.warhead === 'string' && span.warhead.length > 0 ? span.warhead : selectFallbackWarhead(span.evidenceVerdict);
      if (warhead.length > WARHEAD_MAX_CHARS) warhead = selectFallbackWarhead(span.evidenceVerdict);
      parts.push(text.slice(cursor, span.start));   // the verbatim pre-span bytes
      parts.push(warhead);                          // the warhead at the span's position
      cursor = span.end;
      mutated++;
    }
  }
  parts.push(text.slice(cursor));                   // the verbatim post-last-span bytes
  return { text: parts.join(''), mutated };
}

/** THE MARKER APPEND (C-3.6 :1395-1402 — the visibility): the marker appended
 *  at the message's END (never a mid-message insertion). No mutation → no
 *  marker (the byte-identical pass-through). THE MESSAGE WRAPPER (2026-08-11 —
 *  the operator's directive: "make sure the entire mutated message is in {}
 *  brackets so its identifiable and the warhead prefix is in [] nested
 *  brackets"): the ENTIRE mutated message (the spliced body + the marker) is
 *  wrapped in `{...}` — the one-pair visual boundary that identifies the
 *  system-mutated message; the warheads' `[SSTF ...]` prefixes (the lexicon's
 *  single source) sit NESTED inside the braces. The wrapper is an ADDITION at
 *  the boundaries (like the marker) — the non-slop bytes between the braces
 *  are untouched — the idempotence tags ([SSTF SMOKE MUTATION] etc.) survive
 *  inside, so the second pass stays the no-op. */
function appendMarker(resultText: string, mutated: number, record: EvidenceRecord): string {
  if (mutated === 0) return resultText;
  const sha = record.distSha ?? 'unknown';
  return '{' + resultText + '\n\n' + mutationMarker(mutated, sha, record.state) + '}';
}

// ════════════════════════════════════════════════════════════════════════════
// THE SINGLE ENTRY (the public interface — the hook's call + the seam's member)
// ════════════════════════════════════════════════════════════════════════════

/** THE SURGICAL MUTATION (FR-3 — the single entry). THE SIGNATURE CONTRACT:
 *  the wave-4 seam consumes `mutateMessage(text, sessionId?)` via the computed-
 *  specifier dynamic import (index.ts:158-167) — sessionId is optional here to
 *  match the seam's `(text: string, sessionId?: string)` exactly; the returned
 *  MutationResult is structurally assignable to the seam's `{ text: string;
 *  mutated: number; verdicts?: unknown[] }` (verdicts: ClassifiedSpan[] →
 *  unknown[] via the index signature; the extra marker field is allowed in the
 *  return position). The third opts parameter is the 7.5 TEST 5's test seam.
 *
 * THE PIPELINE (the spec's C-3.7): idempotence guard → parse+classify → the
 *  oversized-span guard → the splice → the marker. THE FAIL-PATHS FIRST: every
 *  stage's failure returns the NO-OP (text === the original, mutated === 0) +
 *  the marker naming the failure — NEVER a partial mutation, NEVER a throw that
 *  escapes (the outer catch is the last line of defense — the loud log + the
 *  NO-OP, per FR-16.4's never-break-the-stream). */
export function mutateMessage(
  text: string,
  sessionId?: string,
  opts?: MutatorOptions,
): MutationResult {
  const sid = sessionId ?? 'default';
  try {
    // THE IDEMPOTENCE GUARD (BC-3): the already-mutated message = the no-op.
    if (isIdempotentNoOp(text)) return { text, mutated: 0, verdicts: [], marker: null };
    // THE PARSE + THE CLASSIFICATION (the fail-path outcome is a first-class value).
    const outcome = parseAndClassify(text, sid, opts?.forceClassifierError === true);
    if (!outcome.ok) return { text, mutated: 0, verdicts: [], marker: outcome.marker };
    const verdicts = outcome.verdicts;
    // THE OVERSIZED-SPAN GUARD (the lexicon's SLOP_SPAN_MAX_CHARS contract
    // :420-426): a claim span beyond the sanity line is a structured block
    // mis-parsed as prose — the fail-open NO-OP + the marker naming the span,
    // NEVER a partial splice (the verdicts returned as the audit trail).
    const oversized = verdicts.find((v) => isSlopSpan(v) && spanLength(v) > SLOP_SPAN_MAX_CHARS);
    if (oversized) return { text, mutated: 0, verdicts, marker: oversizedSpanMarker(spanLength(oversized)) };
    // THE SPLICE (the byte-preservation by construction).
    const { text: spliced, mutated } = spliceSpans(text, verdicts);
    // THE NO-SLOP CASE: the byte-identical pass-through — no marker (the hook's
    // `tOut.mutated === 0 → continue` guard consumes exactly this).
    if (mutated === 0) return { text, mutated: 0, verdicts, marker: null };
    // THE MARKER (the visibility — the count + the dist + the state from the
    // machine's record — the <sha>/<state> SUBSTITUTED at runtime, never left
    // as placeholders).
    const record = getEvidenceState(sid);
    const finalText = appendMarker(spliced, mutated, record);
    return {
      text: finalText,
      mutated,
      verdicts,
      marker: mutationMarker(mutated, record.distSha ?? 'unknown', record.state),
    };
  } catch (err) {
    // THE CONSTRUCTION FAILURE (the loud-fail law — the last line of defense):
    // the NO-OP + the marker — the message NEVER breaks the stream (FR-16.4).
    ctLog('ERROR', 'surgical-mutator', `mutation failed (the no-op): ${err instanceof Error ? err.message : String(err)}`);
    return { text, mutated: 0, verdicts: [], marker: CONSTRUCTION_FAILURE_MARKER };
  }
}
