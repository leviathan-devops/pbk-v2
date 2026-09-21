// src/firewalls/smoke-lexicon.ts — THE SMOKE-DETECTION LEXICON (the 7.5 SSTF
// overhaul's C-2 / FR-2 — the wave 2's deliverable)
//
// THE ROLE (the spec's C-2.1): answers WHAT is slop — the claim-sentence
// detection (the slang-expanded corpus — the 2026-08-11 crack-1 fix) + the
// subject extraction + the evidence-verdict scoring. Its input: the agent's
// message text + the sessionId. Its output: the per-sentence classification the
// surgical mutator (the wave 3) consumes + the single-sentence classification
// the text.complete's arming consumes.
//
// THE EVIDENCE CONTRACT THIS LEXICON ENFORCES: the claim sentences score against
// the C-1 evidence machine's verdict (queryEvidenceVerdict). A claim is slop
// unless the ContainerTestResult evidence (the container red-team's results
// artifact — container-testing's suite/report action) records a LEGIT
// verdict for the subject. The smoke runs (node -e / bun -e / grep-as-proof)
// NEVER satisfy a claim — the container verification is the only evidence.
//
// THE ISE LAW (the spec's Governing law — WARHEAD 9, applied): the detection is
// engineered as a LEXICON (the PatternFamily-style typed members) + a STATE
// MACHINE (the classifySentence pipeline's steps) + the evidence triads
// ({ Pattern, State, Evidence }) — the regex is the mechanical DETECTOR only
// (the matcher field), the DECISION lives in the member's structure
// (the triggerCondition + the severity + the remediationHook) + the evidence
// verdict. NEVER a regex-slop tower.
//
// THE DEPENDENCY GRAPH (the spec's FI-4 :292): smoke-lexicon.ts → evidence-
// tracker.ts (queryEvidenceVerdict — the C-1 machine, the single source of the
// evidence truth). The lexicon QUERIES the machine; it never writes events,
// never re-derives the evidence state.
//
// THE SINGLE-SOURCE EXPORTS (the FI-5.2 — the hooks' slang expansion): the
// SLANG_CLAIM_WORD_RE + the STRONG_PHRASE_RE compiled matchers are exported so
// the hook-chain' isCompletionClaim REFERENCE the same corpus members —
// never a second copy.

import { queryEvidenceVerdict } from './evidence-tracker.js';
import type { EvidenceVerdict, EvidenceVerdictKind } from './evidence-tracker.js';
import { ctLog } from '../utils.js';

// ════════════════════════════════════════════════════════════════════════════
// C-2.2 — THE TYPE DEFINITIONS (the full contracts — the spec :910-953)
// ════════════════════════════════════════════════════════════════════════════

export type LexiconMemberKind =
  | 'claim-word'        // the formal + the slang claim words (the crack-1 fix)
  | 'strong-phrase'     // the sentence-level claim patterns (everything works, ready to deploy)
  | 'negation'          // the claim's canceller (not tested, pending, blocked)
  | 'subject-rule'      // the subject extraction (the tool/module names + the noun-phrase heuristics)
  | 'universal-claim';  // the no-subject declarations (everything/all/the build/this/it)

export interface SmokeLexiconMember {
  id: string;                                // e.g. 'CLAIM-WORD-SLANG-GREEN'
  kind: LexiconMemberKind;
  matcher: RegExp;                           // THE DETECTION LAYER ONLY (the ISE law)
  triggerCondition: (sentence: string) => boolean;   // THE DECISION LAYER
  severity: 'slop' | 'legit' | 'neutral' | 'formal' | 'slang';
  // THE SEVERITY carries the corpus class ('formal'/'slang' per the C-2.3
  // enumeration's mkMember calls) + the slop/legit/neutral decision class.
  messageTemplate: string;                   // the warhead reference (the CN-17.1 single-source)
  remediationHook: (subject: string | null, verdict: EvidenceVerdict) => SpanVerdict;
}

export type SpanKind = 'CLAIM_SLOP' | 'CLAIM_LEGIT' | 'NON_CLAIM' | 'UNCLASSIFIED';

export interface SpanVerdict {
  kind: SpanKind;
  subject: string | null;
  evidenceVerdict: EvidenceVerdict | null;   // nullable — the no-query cases (the spec :937)
  warhead: string | null;                    // the replacement text (the slop only)
}

export interface TextSpan {                  // THE SPAN PARSE'S UNIT (the offsets on the raw text)
  start: number;
  end: number;
  text: string;
}

// THE MERGED SPAN-VERDICT: the acceptance batteries (the spec's 7.4 TEST 1 +
// the 6.2 code-block test) consume the classifyMessageSpans result AS AN ARRAY
// where each element carries BOTH the span's offsets/text AND the verdict
// fields (`.kind`, `.text`, `.evidenceVerdict`). This merged shape is the
// wave-3 mutator's splice input — the offsets are the splice's coordinates.
// THE SEAM COMPATIBILITY (the wave-4 SSTFTransformSeam): the merged span is
// structurally assignable to the semantic-smoke-firewall's SSTFSpanVerdictLike
// (the DI seam's `[k: string]: unknown` index signature + the `evidenceVerdict`
// as `undefined`-only — the null is mapped to undefined at the merge boundary).
export interface ClassifiedSpan extends Omit<SpanVerdict, 'evidenceVerdict'> {
  evidenceVerdict: EvidenceVerdict | undefined;   // the seam requires undefined, not null
  start: number;
  end: number;
  text: string;
  [k: string]: unknown;                          // the SSTFSpanVerdictLike structural requirement
}

// ════════════════════════════════════════════════════════════════════════════
// C-2.3 — THE MEMBER ENUMERATION (the corpora — the full governance)
// ════════════════════════════════════════════════════════════════════════════

// THE EVIDENCE TRIAD TRIPLET NOTES: every member's matcher is the DETECTOR; the decision
// (the claim-vs-not) is reached ONLY through the classifySentence pipeline's
// state machine (the code-block → prediction → claim-word → negation →
// no-claim → subject → evidence verdict → span kind). The matchers never
// decide alone.

// THE WARHEAD LENGTH CAP (the G-9.1's token-economy bound — the C-3.3 member constraint):
const WARHEAD_MAX_CHARS = 400;

function selectWarheadLocal(v: EvidenceVerdict): string {
  // THE WARHEAD SELECTION (the C-3.3 drafts — the CN-17.1 single-source text):
  // the SpanVerdict.warhead is populated HERE (the lexicon's output contract —
  // the C-2.7/6.2 batteries assert the warhead text). The wave-3 surgical
  // mutator CONSUMES the verdict's warhead (the C-3.5 splice uses
  // verdict.warhead) — it never needs to re-derive the text. The warheads name
  // the missing ContainerTestResult evidence (the container red-team's artifact)
  // as the ONLY path that satisfies the claim.
  const sha = v.distSha ?? 'unknown';
  let w: string;
  if (v.verdict === 'SMOKE') {
    w = `[SSTF SMOKE] this claim is a SMOKE TEST — the evidence state for dist ${sha} is SMOKE_ONLY — the smoke runs (node -e/bun -e/grep-as-proof) never constitute the runtime proof. The container verification is the only evidence that satisfies this claim: run the container red-team (container-testing: the setup with a validated plan + the scenarios + the ContainerTestResult artifact).`;
  } else if (v.verdict === 'UNEVIDENCED') {
    w = `[SSTF UNEVIDENCED] this claim has NO verification evidence for dist ${sha} — neither the unit gates nor the container suite have recorded a pass for this build. The verification first: the battery + the container red-team (the setup with a validated plan + the scenarios + the ContainerTestResult artifact).`;
  } else {
    w = `[SSTF UNIT-ONLY] this claim rests on the unit gates only (the battery/tsc) — the unit evidence is NOT the runtime proof. The container verification is required before this claim can stand: the container red-team (the setup with a validated plan + the scenarios + the ContainerTestResult artifact).`;
  }
  return w.length > WARHEAD_MAX_CHARS ? w.slice(0, WARHEAD_MAX_CHARS) + '...' : w;
}

function mkMember(
  id: string,
  kind: LexiconMemberKind,
  matcher: RegExp,
  severity: 'slop' | 'legit' | 'neutral' | 'formal' | 'slang',
): SmokeLexiconMember {
  return {
    id,
    kind,
    matcher,
    triggerCondition: (sentence: string): boolean => matcher.test(sentence),
    severity,
    messageTemplate: `the slop claim matched by ${id} — the ContainerTestResult evidence is the only proof that satisfies this claim`,
    // THE REMEDIATION HOOK (the member decides the SpanVerdict from the evidence verdict):
    remediationHook: (subject: string | null, verdict: EvidenceVerdict): SpanVerdict =>
      verdict.verdict === 'LEGIT'
        ? { kind: 'CLAIM_LEGIT', subject, evidenceVerdict: verdict, warhead: null }
        : { kind: 'CLAIM_SLOP', subject, evidenceVerdict: verdict, warhead: selectWarheadLocal(verdict) },
  };
}

// THE FORMAL CORPUS (the existing isCompletionClaim's forms — preserved + expanded):
const FORMAL_CLAIM_WORDS: SmokeLexiconMember[] = [
  mkMember('CLAIM-WORD-FORMAL-VERIFIED', 'claim-word',
    /\b(?:verified|verifying|confirms?|confirmed|proven|proves)\b/i, 'formal'),
  mkMember('CLAIM-WORD-FORMAL-WORKS', 'claim-word',
    /\b(?:works|working|passed|passes|succeeded|success)\b/i, 'formal'),
  mkMember('CLAIM-WORD-FORMAL-TESTED', 'claim-word',
    /\b(?:tested|complete|done)\b/i, 'formal'),
];

// THE SLANG CORPUS (the crack-1 fix — DD-10 — the 2026-08-11 incident's actual
// forms). THE GOVERNANCE: every member has its test (the corpus tests use the
// incident's exact phrases) — a corpus member without a test is the governance
// violation (FI-5.3). THE EXPANSIONS BEYOND THE SPEC'S C-2.3 DRAFT (required by
// the acceptance tests): the SOLID member matches the spaced 'fully solid' (the
// 7.4 TEST 5's fixture) + the SHIP member matches 'shipped' (the 7.4 TEST 1's
// incident fixture 'the wave shipped') — the bare 'ship' is deliberately NOT a
// claim word (the 7.4 TEST 7's 'then we ship' must stay NON_CLAIM).
const SLANG_CLAIM_WORDS: SmokeLexiconMember[] = [
  mkMember('CLAIM-WORD-SLANG-GREEN', 'claim-word', /\b(?:green|all-green)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-SYNCED', 'claim-word', /\b(?:synced|in-sync)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-READY', 'claim-word', /\b(?:ready|all-ready)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-SOLID', 'claim-word', /\b(?:solid|rock[- ]solid|fully[- ]solid)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-GOOD', 'claim-word', /\b(?:all-good|good-to-go)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-SHIP', 'claim-word', /\b(?:ship-it|ship it|shipped)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-CERTAIN', 'claim-word', /\b(?:bet your life|bet-your-life|100-percent|no-issues)\b/i, 'slang'),
  mkMember('CLAIM-WORD-SLANG-CLEAN', 'claim-word', /\b(?:clean|clean-run)\b/i, 'slang'),
];

// THE STRONG-PHRASE FAMILY (the kind 'strong-phrase' — the sentence-level patterns):
const STRONG_PHRASES: SmokeLexiconMember[] = [
  mkMember('STRONG-PHRASE-ALL-WORKS', 'strong-phrase',
    /\b(?:everything works|all tests p[a]ss|all good)\b/i, 'slop'),
  mkMember('STRONG-PHRASE-DEPLOY', 'strong-phrase',
    /\b(?:ready for deploy|ready to deploy|ready for the host|ready for host)\b/i, 'slop'),
  mkMember('STRONG-PHRASE-CERTAIN', 'strong-phrase',
    /\b(?:bet your life|it works|verified working|container tested)\b/i, 'slop'),
  mkMember('STRONG-PHRASE-SHIP', 'strong-phrase',
    /\b(?:ship it|ship this|good to go)\b/i, 'slop'),
];

// THE NEGATION GUARD (the kind 'negation' — the claim's canceller):
// THE NEGATION'S SCOPE (G-9.4): the claim-LOCAL guard — a negation token
// cancels ONLY the claims within CLAIM_NEGATION_WINDOW_CHARS of it (the
// claim's own modifier clause: "is not tested", "not verified", "will pass",
// "everything is pending"). THE 2026-08-11 F-51 FIX (the S3's live catch): the
// OLD sentence-level scope cancelled ANY claim in a sentence carrying a
// negation token — the instruction-level "do NOT call any tools: the
// container red-team passed" cancelled the embedded claim (the container's
// slop=0 — the FALSE GREEN: the claim escaped the mutation for the wrong
// reason — the splitter's comma-vs-colon luck, never a semantic rule). THE
// FIRST-PRINCIPLES RULE: natural language negates the CLAUSE, not the
// sentence — the 'not' in "do NOT call any tools" modifies 'call', and the
// colon opens a new clause where the claim stands as its own assertion. THE
// CALIBRATION 24 (~4-5 words — the claim's local modifier clause): the S3's
// instruction distance (the 'NOT' at ~10, the 'passed' at ~53 — 43 chars)
// falls OUTSIDE; the claim-local negations ("is NOT green" 5, "NOT verified"
// 4, "WILL pass" 6, "everything is pending" 13) fall INSIDE. The strong
// phrase's survival keeps its own ~60-char window (negatesStrongPhrase —
// unchanged).
const CLAIM_NEGATION_WINDOW_CHARS = 24;

const NEGATION_GUARD: SmokeLexiconMember = mkMember('NEGATION-GUARD', 'negation',
  /\b(?:not|never|un-|in-|pending|blocked|untested|unverified|TODO|WIP|to be|will)\b/i, 'neutral');

function negatesStrongPhrase(sentence: string, phrase: SmokeLexiconMember): boolean {
  // THE STRONG-PHRASE SURVIVAL (the C-2.3 :1009-1017): the strong phrase survives the
  // negation ONLY when it is not itself negated ("not yet ready to deploy" = negated;
  // "ready to deploy" = the claim). The window check: a negation word within the
  // ~60 chars before the strong phrase's match negates it.
  const m = sentence.match(phrase.matcher);
  if (!m || m.index === undefined) return false;
  const before = sentence.slice(0, m.index).slice(-60);
  return /\b(?:not|never|un-|in-|pending|blocked|untested|unverified|TODO|WIP)\b/i.test(before);
}

// THE CLAIM-LOCAL NEGATION TEST (the F-51 fix's core): a claim word must sit
// within the window of the negation token — the claim's own negation, never
// the sentence's distant instruction. The corpora are the SINGLE SOURCE (the
// ISE law — the window check reuses the same members the claim scan uses, no
// second word list).
function negatesClaimLocally(sentence: string, negIndex: number): boolean {
  const from = Math.max(0, negIndex - CLAIM_NEGATION_WINDOW_CHARS);
  const to = Math.min(sentence.length, negIndex + CLAIM_NEGATION_WINDOW_CHARS);
  const window = sentence.slice(from, to);
  return FORMAL_CLAIM_WORDS.some(m => m.matcher.test(window))
    || SLANG_CLAIM_WORDS.some(m => m.matcher.test(window))
    || STRONG_PHRASES.some(m => m.matcher.test(window))
    || UNIVERSAL_CLAIMS.some(m => m.matcher.test(window));
}

function isNegated(sentence: string): boolean {
  // THE GLOBAL CLONE (the matchAll requires the 'g' flag; the shared matcher
  // stays flag-free — the stateless .test() callers elsewhere never see the
  // stateful lastIndex).
  const negs = Array.from(sentence.matchAll(new RegExp(NEGATION_GUARD.matcher.source, NEGATION_GUARD.matcher.flags + 'g')));
  if (negs.length === 0) return false;
  const strong = STRONG_PHRASES.find(p => p.matcher.test(sentence) && !negatesStrongPhrase(sentence, p));
  if (strong) return false;
  return negs.some(n => negatesClaimLocally(sentence, n.index ?? 0));
}

// THE SUBJECT-RULE FAMILY (the kind 'subject-rule' — the extraction):
// THE SUBJECT DICTIONARY (the tool/module names the lexicon recognizes — the incident's subjects):
const SUBJECT_DICTIONARY: Array<{ id: string; matcher: RegExp; subject: string }> = [
  { id: 'SUBJECT-CONTAINER-TEST', matcher: /\b(?:container[- ]test|closeout-ct|the container)\b/i, subject: 'container-test' },
  { id: 'SUBJECT-BATTERY', matcher: /\b(?:the battery|bun test|vitest|the tests|the suite)\b/i, subject: 'battery' },
  { id: 'SUBJECT-REGISTRY', matcher: /\b(?:the registry|wave-registry|the wave dispatch)\b/i, subject: 'registry' },
  { id: 'SUBJECT-GATE', matcher: /\b(?:the gate|the firewall|the SSTF)\b/i, subject: 'gate' },
  { id: 'SUBJECT-WAVE-GEN', matcher: /\b(?:the wave generator|the generator)\b/i, subject: 'wave-generator' },
  { id: 'SUBJECT-CONFIG-LOCK', matcher: /\b(?:the config lock|the config-lock)\b/i, subject: 'config-lock' },
  { id: 'SUBJECT-PLUGIN', matcher: /\b(?:the plugin|the dist|the build|the ship)\b/i, subject: 'ship' },
];

// THE UNIVERSAL-CLAIM MEMBER (DD-4): the no-subject declarations — the universal words
// ARE the subject-indicators. "everything synced" / "all good" / "it works" score the
// DIST-LEVEL verdict. The '*dist*' sentinel is INTERNAL — the emitted SpanVerdict.subject
// is null (the universal has no specific subject) while the query goes dist-level.
const UNIVERSAL_CLAIMS: SmokeLexiconMember[] = [
  mkMember('UNIVERSAL-EVERYTHING', 'universal-claim', /\b(?:everything|all|the build|the whole)\b/i, 'slop'),
  mkMember('UNIVERSAL-IT', 'universal-claim', /\b(?:it|this|that)\b/i, 'slop'),
];

const DIST_SENTINEL = '*dist*';

function extractSubject(sentence: string, hasClaimWord: boolean): string | null {
  // (1) THE DICTIONARY MATCH FIRST — the tool/module names are the precise subjects.
  //     THE G-9.2 MULTI-SUBJECT RULE: two or more distinct dictionary subjects → the
  //     dist-level (the claim is about the whole build, not one entity).
  const matched = SUBJECT_DICTIONARY.filter(r => r.matcher.test(sentence));
  if (matched.length > 1) return DIST_SENTINEL;
  if (matched.length === 1) return matched[0].subject;
  // (2) THE UNIVERSAL-CLAIM FALLBACK (DD-4) — the universal words ARE the subject-indicators
  if (hasClaimWord && UNIVERSAL_CLAIMS.some(u => u.matcher.test(sentence))) return DIST_SENTINEL;
  // (3) THE NOUN-PHRASE HEURISTIC (the "X works" patterns — the claim-word adjacency)
  const m = sentence.match(/\b(\w[\w-]*)\s+(?:works|passed|is green|is synced|is ready|is solid)\b/i);
  if (m) return m[1];
  return null;   // the UNCLASSIFIED (the fail-open — the no-subject, non-universal claim → the dist-level query)
}

// THE TENSE/MODAL RULES (G-9.3 — the future/past claims):
// THE FUTURE CLAIMS (the predictions) = NON_CLAIM — "the test WILL pass" is not a
// declaration (the modal guard). THE PAST-TENSE claims with the evidence → the LEGIT;
// without → the claim classification. THE PRESENT-TENSE declarations → the claim classification.
function isPrediction(sentence: string): boolean {
  return /\b(?:will|would|should|may|might|could)\b/i.test(sentence);
}

// ════════════════════════════════════════════════════════════════════════════
// C-2.4 — THE SENTENCE SPLITTER (the span parse with the offsets — the G-8.1 rules)
// ════════════════════════════════════════════════════════════════════════════

const SENTENCE_BOUNDARY_MIN_CHARS = 2;
// THE SENTENCE_BOUNDARY_MIN_CHARS = 2 BECAUSE (the register) a sub-2-char span is the
// splitter's noise (a single punctuation, a stray marker) — the filter keeps the parse
// clean without dropping real content.

// THE TOKEN-AWARE BOUNDARY RULES (G-8.1): the sentence boundaries = the .!? followed by
// the whitespace/newline + the newlines themselves + the comma boundaries + the list
// markers. THE EXCEPTIONS (never split): the decimals (0.5, 3.14 — the '.' followed by a
// digit), the file extensions (.ts, .json — the '.' followed by a letter), the URL
// fragments, the code tokens, the abbreviation interiors (the 'e.g.' — a '.' followed by
// a non-space is NEVER a boundary). THE FENCE EXCLUSION (G-8.2): the boundaries inside a
// ``` fenced code block are suppressed — the block stays ONE span so the code's claim
// words never classify as prose.
function splitSentences(text: string): TextSpan[] {
  const spans: TextSpan[] = [];
  const n = text.length;
  let start = 0;
  let inFence = false;
  let i = 0;
  while (i < n) {
    // THE FENCE STATE (G-8.2): the ``` delimiters toggle the exclusion — the boundaries
    // inside a fenced block are suppressed (the block stays within the current span).
    if (text.startsWith('```', i)) { inFence = !inFence; i += 3; continue; }
    if (inFence) { i++; continue; }
    const ch = text[i];
    const next = i + 1 < n ? text[i + 1] : '';
    if (ch === '\n') {
      // A newline is a boundary when it ends a line of content (the next line starts).
      if (next !== '' && next !== ' ' && next !== '\t' && next !== '\r') {
        pushSpan(spans, text, start, i + 1);
        start = i + 1;
      }
      i++;
      continue;
    }
    const isBoundaryChar = ch === '.' || ch === '!' || ch === '?' || ch === ',';
    if (isBoundaryChar) {
      // THE TOKEN-AWARE GUARD: the .!? must be followed by whitespace/end (a '.' followed
      // by a non-space is a decimal/extension/URL/abbreviation-interior — NEVER a boundary).
      // The ',' must be followed by whitespace/end (a tight list 'a,b' stays whole).
      if (next === '' || next === ' ' || next === '\t' || next === '\r' || next === '\n') {
        pushSpan(spans, text, start, i + 1);
        start = i + 1;
      }
    }
    i++;
  }
  const tail = text.slice(start);
  if (tail.trim().length >= SENTENCE_BOUNDARY_MIN_CHARS) spans.push({ start, end: text.length, text: tail });
  return spans;
}

function pushSpan(spans: TextSpan[], text: string, start: number, end: number): void {
  const seg = text.slice(start, end);
  if (seg.trim().length >= SENTENCE_BOUNDARY_MIN_CHARS) spans.push({ start, end, text: seg });
}

// THE CODE-BLOCK EXCLUSION (G-8.2):
// THE fenced code blocks (the ``` delimiters) + the inline code (the backticks) — the spans
// inside the code are EXCLUDED from the claim classification (the code's claim words never
// trigger the mutation). The exclusion is applied in the span classification, never in the
// splice (the code-block spans' bytes preserved by construction).
function isCodeSpan(text: string): boolean {
  if (text.startsWith('```') || text.endsWith('```')) return true;
  return (text.match(/`/g) ?? []).length >= 2;   // the inline-code heuristic
}

// ════════════════════════════════════════════════════════════════════════════
// C-2.5 — THE CLASSIFICATION PIPELINE (the per-sentence verdict scoring)
// ════════════════════════════════════════════════════════════════════════════

// THE CLAIM-WORD SCAN's compiled matchers (the single-source exports for the hooks):
// the smoke-lexicon's members GOVERN; the hook-chain' isCompletionClaim REFERENCES
// these compiled matchers (the FI-5.2 — never a second copy).
export const SLANG_CLAIM_WORD_RE: RegExp = new RegExp(
  SLANG_CLAIM_WORDS.map(m => m.matcher.source).join('|'),
  'i',
);
export const STRONG_PHRASE_RE: RegExp = new RegExp(
  STRONG_PHRASES.map(m => m.matcher.source).join('|'),
  'i',
);

function findClaimMember(sentence: string): SmokeLexiconMember | null {
  // THE STRONG → SLANG → FORMAL precedence (the strongest signal decides the message):
  for (const member of [...STRONG_PHRASES, ...SLANG_CLAIM_WORDS, ...FORMAL_CLAIM_WORDS]) {
    if (member.matcher.test(sentence)) return member;
  }
  return null;
}

export function classifySentence(sentence: string, sessionId: string): SpanVerdict {
  // THE STATE MACHINE (the ISE law — the fail-state is NON_CLAIM, never a silent pass):
  // THE STEP 1 — THE CODE-BLOCK EXCLUSION (G-8.2): the code spans are NEVER claims
  if (isCodeSpan(sentence)) return { kind: 'NON_CLAIM', subject: null, evidenceVerdict: null, warhead: null };
  // THE STEP 2 — THE PREDICTION GUARD (G-9.3): the future claims are NOT declarations
  if (isPrediction(sentence)) return { kind: 'NON_CLAIM', subject: null, evidenceVerdict: null, warhead: null };
  // THE STEP 3 — THE CLAIM-WORD SCAN (the formal + the slang + the strong — the crack-1 fix)
  const hasFormal = FORMAL_CLAIM_WORDS.some(m => m.matcher.test(sentence));
  const hasSlang = SLANG_CLAIM_WORDS.some(m => m.matcher.test(sentence));
  const hasStrong = STRONG_PHRASES.some(m => m.matcher.test(sentence));
  const hasClaim = hasFormal || hasSlang || hasStrong;
  // THE STEP 4 — THE NEGATION GUARD (the claim's canceller)
  if (isNegated(sentence)) return { kind: 'NON_CLAIM', subject: null, evidenceVerdict: null, warhead: null };
  // THE STEP 5 — THE NO-CLAIM EXIT (the descriptive sentences flow through untouched)
  if (!hasClaim) return { kind: 'NON_CLAIM', subject: null, evidenceVerdict: null, warhead: null };
  // THE STEP 6 — THE SUBJECT EXTRACTION (the tool names + the universal claims + the noun phrases)
  const subject = extractSubject(sentence, hasClaim);
  // THE STEP 7 — THE EVIDENCE VERDICT (the machine's query — the subject feeds it).
  // THE DIST-LEVEL FALLBACK: the '*dist*' sentinel (the universal) AND the no-subject
  // no-strong claim (e.g. '708/10 green', 'the wave shipped') BOTH query the dist-level —
  // the C-2.5 draft's strong-only fallback would let the incident's exact phrases escape
  // the slop classification (a claim with no extractable subject is a dist-level claim).
  const querySubject = (subject === DIST_SENTINEL || subject === null) ? undefined : subject;
  let verdict: EvidenceVerdict | null = null;
  try {
    verdict = queryEvidenceVerdict(sessionId, querySubject);
  } catch (err) {
    // THE FAIL-CLOSED MIRROR (the machine's FR-16.1 contract — the load never throws, but
    // a defensive catch is the error-path-first mandate): a query error NEVER produces a
    // silent LEGIT — the fail-open NON_CLAIM (the message flows untouched; the safe
    // direction for a mutation).
    void ctLog('ERROR', 'smoke-lexicon', `evidence verdict query failed for ${sessionId}: ${err instanceof Error ? err.message : String(err)}`);
  }
  const emittedSubject = subject === DIST_SENTINEL ? null : subject;
  // THE STEP 8 — THE SPAN KIND (the slop definition — FR-2.3):
  //   the LEGIT → CLAIM_LEGIT (untouched); the SMOKE/UNEVIDENCED/UNIT_ONLY → CLAIM_SLOP;
  //   the verdict's absence (the query error) → the fail-open NON_CLAIM.
  if (!verdict) return { kind: 'NON_CLAIM', subject: emittedSubject, evidenceVerdict: null, warhead: null };
  const member = findClaimMember(sentence);
  if (member) return member.remediationHook(emittedSubject, verdict);
  // THE DEFENSIVE FALLBACK (the member scan should always find one — the step 5 gate):
  return verdict.verdict === 'LEGIT'
    ? { kind: 'CLAIM_LEGIT', subject: emittedSubject, evidenceVerdict: verdict, warhead: null }
    : { kind: 'CLAIM_SLOP', subject: emittedSubject, evidenceVerdict: verdict, warhead: selectWarheadLocal(verdict) };
}

export function classifyMessageSpans(text: string, sessionId: string): ClassifiedSpan[] {
  // THE PER-SENTENCE CLASSIFICATION → THE MERGED SPAN-VERDICTS (the mutator's splice input):
  // the classifySentence's nullable evidenceVerdict (the spec :937) is mapped to
  // undefined at the merge boundary — the seam's SSTFSpanVerdictLike requires it.
  const spans = splitSentences(text);
  return spans.map((span) => {
    const verdict = classifySentence(span.text, sessionId);
    return { ...verdict, evidenceVerdict: verdict.evidenceVerdict ?? undefined, start: span.start, end: span.end, text: span.text };
  });
}

// ════════════════════════════════════════════════════════════════════════════
// C-2.8 — THE THRESHOLDS + THE FAILURE MODES (the lexicon's specifics)
// ════════════════════════════════════════════════════════════════════════════

// THE SLOP_SPAN_MAX_CHARS = 600 BECAUSE (the register's expansion): the sentence-splitter's
// sanity line — a "sentence" beyond 600 chars is almost certainly a structured block
// mis-parsed as prose (a report table, a code block without the fences); the mutator treats
// the oversized span as the fail-open (the no-op + the marker naming the oversized span),
// never a partial splice. The lexicon EXPOSES the bound so the mutator enforces it without
// re-deriving the constant.
export const SLOP_SPAN_MAX_CHARS = 600;

// THE FAILURE MODES (the G-10 ledger): the corpus's blind spot (a new slang form unseen) →
// the formal claims still caught (the subject-evidence verdicts — a formal claim about an
// unevidenced subject still scores the slop) + the corpus's governance addition (DD-10 —
// the named, tested member-set); the negation's scope miss (a real claim with a stray 'not'
// cancelled) → the fail-open (the missed mutation is safer than the false one — G-9.4's
// accepted trade-off). The ContainerTestResult evidence is the ONLY verdict that clears a
// claim — the smoke/unit/unevidenced classifications all demand the container red-team.