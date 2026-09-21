/**
 * claim-bind.ts — the L2 claim-firewall binding layer.
 *
 * Enforces: a verification claim with no same-turn evidence span
 * is FABRICATED (refused). The judge is injectable so tests run
 * without TYPESAFE_AI_API_KEY.
 */
import { recordFiring } from '../ledger/events-ledger.js';

// ── Verdict vocabulary (matches the assignment spec exactly) ────────────────

export type BindVerdict = 'PASS' | 'REJECT' | 'FAIL_CLOSED' | 'FABRICATED' | 'WRONG_SPAN';

// ── Data structures ─────────────────────────────────────────────────────────

/**
 * Atom extracted from a close-shaped claim message.
 * `kind` distinguishes the three evidence-seeking shapes:
 *   - 'status'  : "the daemon is running" / "it works"
 *   - 'count'   : "32 pass 0 fail" / "455 tests"
 *   - 'file'    : "src/ledger/events-ledger.ts" / "build.sha256=abc123"
 */
export interface ClaimAtom {
  kind: 'status' | 'count' | 'file';
  text: string;
  /** Optional ISO timestamp embedded in the claim text (rare). */
  ts?: string;
}

/**
 * A span from the ring (this-turn tool results).
 * `ts` must match the current turn's timestamp — a span from a
 * previous turn MUST NOT bind (WRONG_SPAN verdict).
 */
export interface RingSpan {
  text: string;
  ts: string;
  source?: string;
}

/**
 * Judge result — injectable so the real TypeSafe Jev is never
 * hard-coded (TYPESAFE_AI_API_KEY is absent in this environment).
 */
export interface JudgeResult {
  verdict: 'support' | 'reject';
  probability?: number;
  ms?: number;
}

/**
 * Result of binding atoms against the ring.
 */
export interface BindResult {
  verdict: BindVerdict;
  jev_called: boolean;
  boundSpan: string | null;
  missingAtoms: ClaimAtom[];
  reason: string;
}

// ── Judge type ──────────────────────────────────────────────────────────────

/**
 * Injectable judge function.
 * Returns null when no ring span supports the atom (the caller
 * treats null as FAIL_CLOSED, never a pass).
 */
/**
 * SYNCHRONOUS by contract. An `async` judge is a natural mistake (the real TypeSafe call is async) and
 * returns a Promise whose `.verdict` is undefined; V-037 makes that case report itself instead of
 * masquerading as a judge rejection. If you need the real judge, wrap it and resolve BEFORE calling.
 */
export type JudgeFn = (atom: ClaimAtom, span: RingSpan) => JudgeResult | null;

// ── V-056: THE REAL CLAIM JUDGE (the live path supplied NONE) ───────────────────────────────────────
// The live call site passed `{ currentTurn }` and no judge, so per this module's own contract every
// this-turn span fell to "no judge supplied -> atom unbound (FAIL_CLOSED)". The bound-claim PASS that
// the goal's stop condition names was therefore UNREACHABLE BY CONSTRUCTION — key or no key. This is the
// V-048 class again: the seam exists, the machinery exists, and the live path never supplies the piece
// that makes it work.
//
// The judge is SYNCHRONOUS by contract ("wrap it and resolve BEFORE calling"), so this is the ASYNC half:
// resolve the verdicts first, then hand the caller a sync lookup. Without a key it returns null — which
// leaves the caller with no judge and therefore the existing FAIL_CLOSED behaviour, unchanged.
export const CLAIM_JUDGE_TIMEOUT_MS = 8000;

export async function judgeClaimViaTypeSafe(
  atom: ClaimAtom,
  span: RingSpan,
  apiKey: string | undefined = process.env.TYPESAFE_AI_API_KEY,
): Promise<JudgeResult | null> {
  if (!apiKey) return null; // no key -> no verdict -> the caller stays fail-closed (as before)
  const body = JSON.stringify({
    state: { claim: atom.text, evidence: span.text },
    model: 'jev-latest',
    questions: {
      'claim-supported': {
        type: 'boolean',
        instructions:
          'Does the EVIDENCE text actually support the CLAIM text? Answer true only if the evidence, read ' +
          'literally, establishes the claim. A different turn, an unrelated line, or a paraphrase that ' +
          'overstates the evidence is false.',
      },
    },
  });
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CLAIM_JUDGE_TIMEOUT_MS);
  try {
    const resp = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body,
      signal: controller.signal,
    });
    if (!resp.ok) {
      recordFiring({
        rule: 'claim-bind', buffer: 'agent-text', band: 'skip', probability: null,
        verdict: 'FAIL_CLOSED', jev_called: true, ms: 0, matched_span: atom.text,
        skip_reason: `claim judge HTTP ${resp.status}`,
      });
      return null;
    }
    const j = (await resp.json()) as { answers?: Record<string, { probability?: number }> };
    const p = j.answers?.['claim-supported']?.probability;
    if (typeof p !== 'number' || !Number.isFinite(p)) return null;   // V-046's guard, applied here too
    return { verdict: p >= 0.5 ? 'support' : 'reject', probability: p } as JudgeResult;
  } catch (err) {
    recordFiring({
      rule: 'claim-bind', buffer: 'agent-text', band: 'skip', probability: null,
      verdict: 'FAIL_CLOSED', jev_called: true, ms: 0, matched_span: atom.text,
      skip_reason: `claim judge error: ${err instanceof Error ? err.message : String(err)}`,
    });
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** The lookup key a pre-resolved sync judge uses (atom + span identity). */
export function claimJudgeKey(atom: ClaimAtom, span: RingSpan): string {
  return `${atom.text}\u0000${span.ts}\u0000${span.text.slice(0, 60)}`;
}

// ── Options ─────────────────────────────────────────────────────────────────

export interface BindOptions {
  /** Injectable judge — tests supply a stub. */
  judge?: JudgeFn;
  /** Current-turn timestamp; ring spans with a different ts are WRONG_SPAN. */
  currentTurn?: string;
}

// ── Atom parsing ────────────────────────────────────────────────────────────

/**
 * Extract claim atoms from a close-shaped message.
 * Returns atoms in the order they appear — status, count, file.
 *
 * ADVERSARIAL GUARANTEE: if no claim-shaped atoms are found,
 * the caller's bare claim has nothing to bind and must REFUSE.
 */
export function parseClaimAtoms(text: string): ClaimAtom[] {
  if (!text || !text.trim()) return [];

  const atoms: ClaimAtom[] = [];

  // Status assertions: "the daemon is running", "it works", "build is complete"
  const statusRe = /\b(?:the\s+)?(\w+(?:\s+\w+){0,6})\s+is\s+(running|working|live|complete|done|verified|pass(?:es|ed)?|green|all\s+green)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = statusRe.exec(text)) !== null) {
    atoms.push({ kind: 'status', text: m[0] });
  }

  // Count assertions: "32 pass 0 fail", "0 fail", "455 tests"
  const countRe = /\b(\d+)\s+(pass(?:es|d)?|fail(?:ures?)?|tests?|checks?|errors?)\b/gi;
  while ((m = countRe.exec(text)) !== null) {
    atoms.push({ kind: 'count', text: m[0] });
  }

  // File / hash references: "src/ledger/events-ledger.ts", "build.sha256=abc123"
  const fileRe = /\b([A-Za-z0-9_./-]+\.(?:ts|js|json|md|jsonl|sha256))\b/g;
  while ((m = fileRe.exec(text)) !== null) {
    atoms.push({ kind: 'file', text: m[0] });
  }

  return atoms;
}

// ── Core binding ─────────────────────────────────────────────────────────────────

/**
 * The claim binding verdict gate.
 *
 * For each atom, search the ring for a supporting span:
 *   - span from THIS TURN + judge returns 'support' -> atom PASSES
 *   - span from THIS TURN + judge returns 'reject' -> whole claim REJECT
 *   - span from THIS TURN + no judge supplied -> atom unbound (FAIL_CLOSED)
 *   - no span at all + ring empty -> FABRICATED
 *   - no span + ring non-empty -> FAIL_CLOSED
 *   - span from a DIFFERENT turn matches -> WRONG_SPAN
 *
 * Every verdict path writes a ledger row via recordFiring().
 */
export function bindAtoms(
  atoms: ClaimAtom[],
  ring: RingSpan[],
  opts: BindOptions = {},
): BindResult {
  const currentTurn = opts.currentTurn ?? new Date().toISOString();
  const judge = opts.judge;

  // ── Empty ring → FABRICATED ────────────────────────────────────────────────
  if (ring.length === 0) {
    const missingAtoms: ClaimAtom[] = atoms.length > 0 ? atoms : [{ kind: 'status', text: '' }];
    const spanText = atoms.length > 0 ? atoms[0].text : '';
    recordFiring({
      rule: 'claim-bind',
      buffer: 'agent-text',
      band: 'act',
      probability: null,
      verdict: 'FABRICATED',
      jev_called: false,
      ms: 0,
      matched_span: spanText,
      skip_reason: `claim made with ${atoms.length} atoms but ring is empty — no same-turn evidence`,
    });
    return {
      verdict: 'FABRICATED',
      jev_called: false,
      boundSpan: null,
      missingAtoms,
      reason: `claim with ${atoms.length} atom(s) has no ring evidence at all`,
    };
  }

  // ── Empty atoms → REJECT (claim language but no structured atom to bind) ──
  if (atoms.length === 0) {
    // band: 'skip' — non-enforcement path; ledger forbids null span on act/flag.
    recordFiring({
      rule: 'claim-bind',
      buffer: 'agent-text',
      band: 'skip',
      probability: null,
      verdict: 'REJECT',
      jev_called: false,
      ms: 0,
      matched_span: '',
      skip_reason: 'close-shaped claim detected but no structured atoms could be parsed',
    });
    return {
      verdict: 'REJECT',
      jev_called: false,
      boundSpan: null,
      missingAtoms: [],
      reason: 'close-shaped claim message but no claim atoms extracted',
    };
  }

  // ── Bind each atom against this-turn ring spans ────────────────────────────
  const missingAtoms: ClaimAtom[] = [];
  let boundSpan: string | null = null;
  let jevCalled = false;

  for (const atom of atoms) {
    let bound = false;
    let wrongSpan = false;

    for (const span of ring) {
      // A previous-turn span that matches the atom content → WRONG_SPAN.
      if (span.ts !== currentTurn && textMatchesAtom(atom, span.text)) {
        recordFiring({
          rule: 'claim-bind',
          buffer: 'agent-text',
          band: 'skip',
          probability: null,
          verdict: 'WRONG_SPAN',
          jev_called: false,
          ms: 0,
          matched_span: atom.text,
          skip_reason: `atom "${atom.text}" matched only a previous-turn span (ts mismatch)`,
        });
        wrongSpan = true;
        break;
      }

      // A this-turn span that supports the atom → call the judge.
      if (span.ts === currentTurn && textMatchesAtom(atom, span.text)) {
        if (judge) {
          let jr: JudgeResult | null = null;
          try {
            jr = judge(atom, span);
          } catch (err) {
            recordFiring({
              rule: 'claim-bind',
              buffer: 'agent-text',
              band: 'skip',
              probability: null,
              verdict: 'FAIL_CLOSED',
              jev_called: true,
              ms: 0,
              matched_span: atom.text,
              skip_reason: `judge threw: ${err instanceof Error ? err.message : String(err)}`,
            });
            jr = null;
          }
          jevCalled = true;
          // V-037 DIAGNOSTIC HONESTY: JudgeFn is SYNCHRONOUS, but supplying an `async` judge is a
          // natural mistake (the real TypeSafe call IS async). An async judge returns a Promise,
          // whose `.verdict` is undefined — which used to fall through to the reject branch and
          // report `judge rejected atom "…"`, a LIE about the cause. This project's hardest lesson
          // was hours lost to a diagnostic that named the wrong cause; the reason now names the
          // real one. The BEHAVIOUR stays fail-closed (reject), which is the safe direction.
          if (jr && typeof (jr as unknown as { then?: unknown }).then === 'function') {
            recordFiring({
              rule: 'claim-bind',
              buffer: 'agent-text',
              band: 'skip',
              probability: null,
              verdict: 'FAIL_CLOSED',
              jev_called: true,
              ms: 0,
              matched_span: atom.text,
              skip_reason: 'judge returned a Promise — JudgeFn is SYNCHRONOUS; the async judge was not awaited',
            });
            return {
              verdict: 'FAIL_CLOSED',
              jev_called: true,
              boundSpan: null,
              missingAtoms: [],
              reason: `judge returned a Promise for atom "${atom.text}" — JudgeFn is synchronous, the async judge was never awaited`,
            };
          }
          if (jr) {
            if (jr.verdict === 'support') {
              if (!boundSpan) boundSpan = atom.text;
              bound = true;
              break;
            } else {
              // Judge rejects this atom → whole claim REJECT.
              recordFiring({
                rule: 'claim-bind',
                buffer: 'agent-text',
                band: 'flag',
                probability: jr.probability ?? null,
                verdict: 'REJECT',
                jev_called: true,
                ms: jr.ms ?? 0,
                matched_span: atom.text,
                skip_reason: `judge rejected atom "${atom.text}" despite ring match`,
              });
              return {
                verdict: 'REJECT',
                jev_called: true,
                boundSpan: null,
                missingAtoms: [],
                reason: `judge rejected atom "${atom.text}"`,
              };
            }
          }
        } else {
          // No judge supplied -> atom remains unbound (FAIL_CLOSED, never pass).
          break;
        }
      }
    }

    if (wrongSpan) {
      return {
        verdict: 'WRONG_SPAN',
        jev_called: false,
        boundSpan: null,
        missingAtoms: [],
        reason: `atom "${atom.text}" only matched a previous-turn span`,
      };
    }

    if (!bound) {
      missingAtoms.push(atom);
    }
  }

  // ── Verdict: all atoms bound → PASS; some missing → FAIL_CLOSED ────────────
  if (missingAtoms.length === 0) {
    recordFiring({
      rule: 'claim-bind',
      buffer: 'agent-text',
      band: 'clear',
      probability: null,
      verdict: 'PASS',
      jev_called: jevCalled,
      ms: 0,
      matched_span: boundSpan,
      skip_reason: null,
    });
    return {
      verdict: 'PASS',
      jev_called: jevCalled,
      boundSpan,
      missingAtoms: [],
      reason: `all ${atoms.length} atom(s) bound to same-turn evidence`,
    };
  }

  // Some atoms missing → FAIL_CLOSED.
  // band: 'act' requires non-null matched_span — use the first atom's text
  // as the evidence target, even if it wasn't bound.
  const evidenceSpan = boundSpan ?? atoms[0].text;
  recordFiring({
    rule: 'claim-bind',
    buffer: 'agent-text',
    band: 'act',
    probability: null,
    verdict: 'FAIL_CLOSED',
    jev_called: jevCalled,
    ms: 0,
    matched_span: evidenceSpan,
    skip_reason: `${missingAtoms.length} of ${atoms.length} atom(s) had no same-turn supporting span`,
  });
  return {
    verdict: 'FAIL_CLOSED',
    jev_called: jevCalled,
    boundSpan,
    missingAtoms,
    reason: `${missingAtoms.length} of ${atoms.length} atom(s) unbound — fail-closed without judge`,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Check if a ring span text supports a claim atom.
 * Kind-aware matching:
 *   - status: the atom's key verb ("running", "works", "live") appears in span.
 *   - file:   the basename of the path appears in the span text.
 *   - count:  the atom text (substring) appears in the span.
 * All matches are case-insensitive.
 */
export function textMatchesAtom(atom: ClaimAtom, spanText: string): boolean {
  if (!spanText || !atom.text) return false;
  const span = spanText.toLowerCase();
  const text = atom.text.toLowerCase();

  switch (atom.kind) {
    case 'count':
      return span.includes(text);

    case 'file': {
      const parts = atom.text.split(/[/\\]/);
      const basename = parts[parts.length - 1].toLowerCase();
      if (basename && span.includes(basename)) return true;
      return span.includes(atom.text.toLowerCase());
    }

    case 'status': {
      const statusVerbs = [
        'running', 'working', 'live', 'complete', 'done', 'verified',
        'pass', 'passes', 'passed', 'green', 'all green', 'works',
      ];
      for (const v of statusVerbs) {
        if (span.includes(v)) {
          // Extract subject from "the X is Y" or "X is Y".
          const subjectMatch = text.match(/(?:the\s+)?(\w+(?:\s+\w+){0,6})\s+is\s+/i);
          if (subjectMatch) {
            const subjWords = subjectMatch[1].toLowerCase().split(/\s+/);
            if (subjWords.every(w => span.includes(w))) return true;
          } else {
            // "it works" — just the verb is enough.
            return true;
          }
        }
      }
      return false;
    }
  }
}
