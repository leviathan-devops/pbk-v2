/**
 * kernel-judge.ts — the L1 per-edit judge as an omp extension module.
 *
 * Author: Paragon V2 §6 (the per-edit judge). Port target:
 * @coldtea/abide src/hooks/postToolUse.ts:35-171, with the host seam
 * substituted. omp has no process hook; the extension API's `tool_result`
 * event is the seam.
 *
 * LAW: Abide postToolUse control flow, verbatim in structure:
 *   1. On the tool-result event for `write` | `edit`, excerpt the diff
 *      into the this-turn ring (the in-memory ring, not a sidecar).
 *   2. Pack ALL rubric rules whose `when` is `edit` and whose check bucket
 *      is `model` into ONE judge call (one batch).
 *   3. Band each verdict:
 *        act >= 0.8  -> APPEND the repair text to the tool result's content
 *        flag >= 0.5 -> an operator notice (appended as a notice block)
 *        clear       -> silent (no mutation)
 *   4. THE WRITE IS NEVER BLOCKED. The handler returns the mutated content;
 *      it never throws.
 *   5. Caps: at most MAX_ACT_APPENDS_PER_RULE_PER_TURN (2) `act` appends
 *      per rule per turn, then `flag` only.
 *   6. Every branch writes a ledger row via recordFiring() from
 *      src/ledger/events-ledger.ts.
 *
 * The judge call is INJECTABLE: opts.judge is a function
 *   (rules, state) => Promise<Record<ruleId, probability>>
 * Default it to the TypeSafe HTTP call:
 *   POST https://api.typesafe.ai/v1/systemone
 *   body: { state, model: 'jev-latest', questions }
 *   header: Authorization: Bearer $TYPESAFE_AI_API_KEY
 * The key is read from the env; if ABSENT, log a `skip` row with
 * skip_reason: 'no-key' and return WITHOUT calling. Never a silent pass.
 *
 * Timeouts: EDIT_CHECK_TIMEOUT_MS (8000ms) per edit call; a timeout is a
 * `skip` row with skip_reason: 'timeout', never a block.
 *
 * Author: this is a self-contained extension module — no dist/ rebuild.
 */

import { join as joinPath } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';
import {
  recordFiring,
  type Band,
} from '../ledger/events-ledger.js';
import type { OmpToolResultEvent, OmpExtensionContext } from '../types/omp.js';
export type { OmpToolResultEvent, OmpExtensionContext };
// ── CONSTANTS (mirror @coldtea/abide lib/constants.js) ──
export const EDIT_CHECK_TIMEOUT_MS = 8_000;
export const MAX_ACT_APPENDS_PER_RULE_PER_TURN = 2;

// ── RUBRIC THRESHOLDS (mirror .abide/rubric.json) ──
export const ACT_THRESHOLD = 0.8;
export const FLAG_THRESHOLD = 0.5;

// Diff size caps (mirror @coldtea/abide lib/constants.js)
const MAX_STATE_CHARS = 24_000;
const MAX_DIFF_INPUT_CHARS = 1_000_000;

/**
 * V-025: the rubric is a WORKSPACE artifact (`<cwd>/.abide/rubric.json`, abide's own
 * convention — `abide rubric validate` reads it there). The original default resolved
 * relative to the extension's dist dir (`extensions/omp-ct/../.abide/`), which does not
 * exist in the deployed layout, so the live judge skipped every edit with
 * `skip_reason: 'no-model-rules'` even with 6 active edit+model rules compiled.
 * Resolution order: an explicit path, then the workspace, then the extension-relative
 * path (a bundled fallback). Measured on the rig 2026-09-21.
 */
const DEFAULT_RUBRIC = (() => {
  const workspace = joinPath(process.cwd(), '.abide', 'rubric.json');
  if (existsSync(workspace)) return workspace;
  return joinPath(import.meta.dirname, '..', '.abide', 'rubric.json');
})();

// ── JUDGE SEAM ──────────────────────────────────────────────────────────────
// The injected judge function. One call carries ALL model rules for one edit.
// Returns a Record of ruleId -> probability (0..1).
export type JudgeFn = (
  rules: RubricRule[],
  state: JudgeState,
) => Promise<Record<string, number>>;

// ── STATE SHAPE ────────────────────────────────────────────────────────────
// Mirrors the abide postToolUse state: the diff text + the task (user prompt).
export interface JudgeState {
  /** The diff excerpt for this edit (unified-diff format). */
  diff: string;
  /** The user prompt that drove this turn (the task context for the judge). */
  task?: string;
  /** The file path the edit touched (relative). */
  file: string;
  /** The buffer kind the rule fires on — always 'edit' for this L1 judge. */
  phase: 'edit';
  /** Session id for ring tracking. */
  sessionId?: string;
  /** Turn id for per-turn cap tracking. */
  turnId?: string;
}

// ── RUBRIC RULE (minimal structural shape) ─────────────────────────────────
// We only consume: id, when, check.type, check.question (instructions + criteria).
// The full rubric is compiled at src/.abide/rubric.json by scripts/compile-rubric.
export interface RubricRule {
  id: string;
  text: string;
  when: string | null;
  check: {
    type: string;
    question?: {
      type: string;
      instructions: string;
      criteria?: Record<string, string>;
    };
  };
  status: string;
  source?: { path?: string; line?: number };
}

// ── RUBRIC LOADING ─────────────────────────────────────────────────────────
/**
 * Load rubric rules. Reads from opts.rubricPath or the default
 * .abide/rubric.json at the repo root. Returns the raw rule list.
 */
export function loadRubric(rubricPath?: string): RubricRule[] {
  const path = rubricPath ?? DEFAULT_RUBRIC;
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed.rules) ? parsed.rules : [];
  } catch {
    return [];
  }
}

// ── RULE SELECTION (mirror @coldtea/abide lib/checkRunner.js selectRules) ──
// Only model rules in the 'edit' phase are packed into the judge call.
export function selectEditModelRules(rules: RubricRule[]): RubricRule[] {
  return rules.filter(
    (r) => r.status === 'active' && r.check?.type === 'model' && r.when === 'edit',
  );
}

// ── BAND COMPUTATION (mirror @coldtea/abide lib/band.js) ──
function computeBand(probability: number): Band {
  if (probability >= ACT_THRESHOLD) return 'act';
  if (probability >= FLAG_THRESHOLD) return 'flag';
  return 'clear';
}

// ── THIS-TURN RING ─────────────────────────────────────────────────────────
// The judge writes a per-turn ring of (ruleId, probability, band, verdict)
// so the cap logic can see how many times the same rule has produced an
// `act` verdict in this turn.
export interface RingEntry {
  ruleId: string;
  probability: number;
  band: Band;
  ts: string;
  verdict: string;
  matchedSpan: string | null;
  repairText: string | null;
}

interface TurnRing {
  sessionId: string;
  turnId: string;
  entries: RingEntry[];
}

type RingAccessor = (
  sessionId: string | undefined,
  turnId: string | undefined,
) => TurnRing;

// ── CAP LOGIC ─────────────────────────────────────────────────────────────
// At most MAX_ACT_APPENDS_PER_RULE_PER_TURN (2) `act` appends per rule per turn.
// After the cap, a rule that would `act` downgrades to `flag`.
function countActsInRing(ring: TurnRing, ruleId: string): number {
  return ring.entries.filter((e) => e.ruleId === ruleId && e.band === 'act').length;
}

// ── OMP Content Block helpers ──────────────────────────────────────────────
// Content blocks in omp are {type: "text", text: string} | {type: "image", ...}.
// We only append text blocks (the repair text / notice).

function isTextBlock(b: unknown): b is { type: 'text'; text: string } {
  return (
    b != null &&
    typeof b === 'object' &&
    'type' in b &&
    (b as { type: unknown }).type === 'text' &&
    'text' in b &&
    typeof (b as { text: unknown }).text === 'string'
  );
}

function allTextFrom(blocks: unknown[]): string {
  return blocks
    .filter(isTextBlock)
    .map((b) => b.text)
    .join('\n');
}

// ── REPAIR TEXT ────────────────────────────────────────────────────────────
// Mirrors @coldtea/abide lib/reason.js repairReason — one sentence per
// violation, naming the rule. The repair text is APPENDED to the tool result
// content so the agent sees it inline (never blocks the write).
function repairText(rule: RubricRule, probability: number): string {
  const where =
    rule.source?.line !== undefined
      ? `${rule.source.path ?? 'unknown'} line ${rule.source.line}`
      : rule.source?.path ?? 'unknown';
  const trimmed = rule.text.trim().replace(/\s+/g, ' ');
  const quoted = trimmed.length > 220 ? `${trimmed.slice(0, 217)}...` : trimmed;
  const pct = (probability * 100).toFixed(0);
  return (
    `Abide: this edit appears to break rule "${rule.id}" from ${where}: ` +
    `"${quoted}" Judged: ${pct}%. Repair the edit now.`
  );
}

// ── FLAG NOTICE ────────────────────────────────────────────────────────────
function flagNoticeText(rule: RubricRule, probability: number): string {
  const pct = probability.toFixed(2);
  return `Abide: uncertain about "${rule.id}" ${pct} on this edit. Not blocking. Details in .abide/events.jsonl.`;
}

// ── TYPE-SAFE DEFAULT JUDGE ────────────────────────────────────────────────
// Default implementation: POST https://api.typesafe.ai/v1/systemone
// body: { state, model: 'jev-latest', questions }
// header: Authorization: Bearer $TYPESAFE_AI_API_KEY
// Returns Record<ruleId, probability>.
// If the key is ABSENT, throws an error with code 'NO_API_KEY' — the caller
// catches it and writes a skip row with skip_reason: 'no-key'.
export async function defaultJudge(
  rules: RubricRule[],
  state: JudgeState,
  apiKey?: string,
): Promise<Record<string, number>> {
  const key = apiKey ?? process.env.TYPESAFE_AI_API_KEY;
  if (!key) {
    const err = new Error('no-key') as Error & { code?: string };
    err.code = 'NO_API_KEY';
    throw err;
  }

  // Pack ALL rules into ONE judge call — ONE questions object.
  const questions: Record<string, unknown> = {};
  for (const rule of rules) {
    const q = rule.check?.question;
    if (!q) continue;
    questions[rule.id] = {
      type: q.type,
      ...(q.instructions ? { instructions: q.instructions } : {}),
      ...(q.criteria ? { criteria: q.criteria } : {}),
    };
  }

  const body = JSON.stringify({
    state: {
      file: state.file,
      phase: state.phase,
      diff: state.diff,
      ...(state.task ? { task: state.task } : {}),
    },
    model: 'jev-latest',
    questions,
  });

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), EDIT_CHECK_TIMEOUT_MS);

  try {
    const resp = await fetch('https://api.typesafe.ai/v1/systemone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body,
      signal: controller.signal,
    });

    if (!resp.ok) {
      const err = new Error(
        `HTTP ${resp.status}: ${resp.statusText}`,
      ) as Error & { code?: string };
      err.code = 'HTTP_ERROR';
      throw err;
    }

    const result = (await resp.json()) as {
      answers?: Record<string, { probability?: number }>;
    };
    const scores: Record<string, number> = {};
    for (const rule of rules) {
      const answer = result.answers?.[rule.id];
      if (answer && typeof answer.probability === 'number') {
        scores[rule.id] = Math.min(1, Math.max(0, answer.probability));
      } else {
        scores[rule.id] = 0;
      }
    }
    return scores;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ── JUDGE STATE INPUT ──────────────────────────────────────────────────────
export interface JudgeOpts {
  /** Injectable judge function. Default = TypeSafe HTTP call. */
  judge?: JudgeFn;
  /** Override the API key (for tests). Default = env TYPESAFE_AI_API_KEY. */
  apiKey?: string;
  /** Override the rubric source. Default = .abide/rubric.json. */
  rubricPath?: string;
  /** Session + turn identifiers for the per-turn ring + ledger. */
  sessionId?: string;
  turnId?: string;
  /** The user's task prompt for this turn. */
  task?: string;
  /** OMP host logger (optional). */
  logger?: { log(level: string, msg: string): void };
}

// ── DIFF EXCERPTION ────────────────────────────────────────────────────────
// Extract the diff text from a tool result event. omp's tool_result event
// carries `input` (the original tool call input) + `content` (the result).
// For `write` and `edit`, the diff is the new content vs. the old file content.
function excerptDiff(event: OmpToolResultEvent): string {
  const input = event.input;
  const toolName = event.toolName;
  const filePath =
    typeof input.file_path === 'string' ? input.file_path : 'unknown';

  if (toolName === 'edit') {
    const oldStr =
      typeof input.old_string === 'string' ? input.old_string : '';
    const newStr =
      typeof input.new_string === 'string' ? input.new_string : '';
    return synthesizeDiff(oldStr, newStr, filePath);
  }

  // write: the "diff" is the new content (the whole file), bounded.
  if (toolName === 'write') {
    const content =
      typeof input.content === 'string' ? input.content : '';
    if (content.length > MAX_STATE_CHARS) {
      return content.slice(0, MAX_STATE_CHARS) + '\n...[truncated]';
    }
    return content;
  }

  return '';
}

function synthesizeDiff(oldStr: string, newStr: string, file: string): string {
  const combined = oldStr + newStr;
  if (combined.length > MAX_DIFF_INPUT_CHARS) {
    const oldSlice = oldStr.slice(0, Math.floor(MAX_STATE_CHARS / 2));
    const newSlice = newStr.slice(0, Math.floor(MAX_STATE_CHARS / 2));
    return `--- a/${file}\n+++ b/${file}\n${oldSlice}\n${newSlice}\n...[truncated]`;
  }
  return `--- a/${file}\n+++ b/${file}\n${oldStr}\n${newStr}`;
}

// ── THE CORE: judgeWithBands ───────────────────────────────────────────────
// Packs all edit+model rules into ONE judge call, bands each verdict,
// and writes ledger rows. Returns the mutations to apply to the tool result.
export interface JudgeBandResult {
  /** The mutated content blocks (repair text appended for `act`). */
  content: unknown[];
  /** The operator notices (for `flag` bands). */
  notices: string[];
  /** Whether the result was checked vs skipped. */
  checked: boolean;
  /** How many act appends were produced. */
  actAppends: number;
  /** How many flag notices were produced. */
  flagNotices: number;
}

export async function judgeWithBands(
  event: OmpToolResultEvent,
  opts: JudgeOpts,
  ringAccessor: RingAccessor,
): Promise<JudgeBandResult> {
  const originalContent = event.content;

  // ── 1. Excerpt the diff into the this-turn ring ──
  const diff = excerptDiff(event);
  const file =
    typeof event.input.file_path === 'string'
      ? event.input.file_path
      : 'unknown';
  const sessionId = opts.sessionId ?? 'default';
  const turnId = opts.turnId ?? 'turn';

  const ring = ringAccessor(sessionId, turnId);
  const diffTs = new Date().toISOString();
  ring.entries.push({
    ruleId: '__diff__',
    probability: 0,
    band: 'clear',
    ts: diffTs,
    verdict: `diff excerpted: ${diff.length} chars`,
    matchedSpan: null,
    repairText: null,
  });

  // ── 2. Load rubric + select edit+model rules ──
  const allRules = loadRubric(opts.rubricPath);
  const rules = selectEditModelRules(allRules);

  if (rules.length === 0) {
    recordFiring({
      rule: 'kernel-judge',
      buffer: 'tool-result',
      band: 'skip',
      probability: null,
      verdict: 'no edit+model rules found in rubric',
      jev_called: false,
      ms: 0,
      matched_span: null,
      skip_reason: 'no-model-rules',
    });
    return {
      content: originalContent,
      notices: [],
      checked: false,
      actAppends: 0,
      flagNotices: 0,
    };
  }

  // ── 3. The judge call (INJECTABLE) ──
  const started = performance.now();
  const judgeState: JudgeState = {
    diff,
    ...(opts.task ? { task: opts.task } : {}),
    file,
    phase: 'edit',
    sessionId,
    turnId,
  };

  let scores: Record<string, number>;
  let ms = 0;

  try {
    const judgeFn: JudgeFn =
      opts.judge ??
      ((rs, st) => defaultJudge(rs, st, opts.apiKey));
    scores = await judgeFn(rules, judgeState);
    ms = Math.round(performance.now() - started);
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    const isNoKey = err?.code === 'NO_API_KEY' || err?.message === 'no-key';
    const isTimeout =
      err?.name === 'AbortError' ||
      err?.message?.includes('aborted') ||
      (err instanceof Error && err.name === 'TimeoutError');

    if (isNoKey) {
      recordFiring({
        rule: 'kernel-judge',
        buffer: 'tool-result',
        band: 'skip',
        probability: null,
        verdict: 'judge skipped: no API key',
        jev_called: false,
        ms: Math.round(performance.now() - started),
        matched_span: null,
        skip_reason: 'no-key',
      });
      return {
        content: originalContent,
        notices: [],
        checked: false,
        actAppends: 0,
        flagNotices: 0,
      };
    }

    if (isTimeout) {
      recordFiring({
        rule: 'kernel-judge',
        buffer: 'tool-result',
        band: 'skip',
        probability: null,
        verdict: `judge timed out after ${EDIT_CHECK_TIMEOUT_MS}ms`,
        jev_called: false,
        ms: Math.round(performance.now() - started),
        matched_span: null,
        skip_reason: 'timeout',
      });
      return {
        content: originalContent,
        notices: [],
        checked: false,
        actAppends: 0,
        flagNotices: 0,
      };
    }

    // Other error → log it but don't block (THE WRITE IS NEVER BLOCKED).
    recordFiring({
      rule: 'kernel-judge',
      buffer: 'tool-result',
      band: 'skip',
      probability: null,
      verdict: `judge error: ${err instanceof Error ? err.message : String(err)}`,
      jev_called: false,
      ms: Math.round(performance.now() - started),
      matched_span: null,
      skip_reason: 'judge-error',
    });
    return {
      content: originalContent,
      notices: [],
      checked: false,
      actAppends: 0,
      flagNotices: 0,
    };
  }

  // ── 4. Band each verdict + enforce cap + write ledger rows ──
  let content = originalContent;
  const notices: string[] = [];
  let actAppends = 0;
  let flagNotices = 0;

  // The matched span for the ledger is the diff excerpt (bounded).
  const matchedSpan = diff.slice(0, 200);

  for (const rule of rules) {
    const prob = scores[rule.id] ?? 0;
    const band = computeBand(prob);
    const ts = new Date().toISOString();
    const verdict = rule.text.trim().replace(/\s+/g, ' ').slice(0, 220);

    let repairTextVal: string | null = null;

    switch (band) {
      case 'act': {
        // Count act verdicts from PRIOR calls (the current one is not yet in the ring).
        const actsSoFar = countActsInRing(ring, rule.id);
        if (actsSoFar < MAX_ACT_APPENDS_PER_RULE_PER_TURN) {
          repairTextVal = repairText(rule, prob);
          const repairBlock = { type: 'text' as const, text: repairTextVal };
          content = [...content, repairBlock];
          actAppends++;
          recordFiring({
            rule: rule.id,
            buffer: 'tool-result',
            band: 'act',
            probability: prob,
            verdict,
            jev_called: true,
            ms,
            matched_span: matchedSpan,
            skip_reason: null,
          });
        } else {
          // Cap exceeded — downgrade to flag-only.
          const notice = flagNoticeText(rule, prob);
          notices.push(notice);
          flagNotices++;
          recordFiring({
            rule: rule.id,
            buffer: 'tool-result',
            band: 'flag',
            probability: prob,
            verdict: `act downgraded to flag (cap ${MAX_ACT_APPENDS_PER_RULE_PER_TURN} reached): ${verdict}`,
            jev_called: true,
            ms,
            matched_span: matchedSpan,
            skip_reason: `act-cap-exceeded:${actsSoFar}`,
          });
        }
        break;
      }

      case 'flag': {
        const notice = flagNoticeText(rule, prob);
        notices.push(notice);
        flagNotices++;
        recordFiring({
          rule: rule.id,
          buffer: 'tool-result',
          band: 'flag',
          probability: prob,
          verdict,
          jev_called: true,
          ms,
          matched_span: matchedSpan,
          skip_reason: null,
        });
        break;
      }

      case 'clear': {
        // Silent — no mutation to content, no notice.
        recordFiring({
          rule: rule.id,
          buffer: 'tool-result',
          band: 'clear',
          probability: prob,
          verdict,
          jev_called: true,
          ms,
          matched_span: matchedSpan,
          skip_reason: null,
        });
        break;
      }

      case 'skip': {
        recordFiring({
          rule: rule.id,
          buffer: 'tool-result',
          band: 'skip',
          probability: prob,
          verdict,
          jev_called: true,
          ms,
          matched_span: matchedSpan,
          skip_reason: 'unexpected-skip',
        });
        break;
      }
    }

    // Record in the ring AFTER the band decision — the current entry must not
    // be counted by countActsInRing on this same call.
    ring.entries.push({
      ruleId: rule.id,
      probability: prob,
      band,
      ts,
      verdict,
      matchedSpan,
      repairText: repairTextVal,
    });
  }

  // Bound the ring growth per turn.
  if (ring.entries.length > 200) {
    ring.entries.splice(0, ring.entries.length - 100);
  }

  return {
    content,
    notices,
    checked: true,
    actAppends,
    flagNotices,
  };
}

// ── PI-COMPATIBLE REGISTRATION ──────────────────────────────────────────────
// Returns an object with a pi-compatible registration: on the tool-result
// event for a `write` | `edit` call, it runs the judge and returns the
// mutated content. The write is NEVER blocked — the handler returns the
// mutated content; it never throws.
export interface KernelJudgeHandle {
  /** Register the extension handlers on the pi API. */
  register: (pi: {
    on(event: string, handler: (event: unknown, ctx: OmpExtensionContext) => unknown): void;
  }) => void;
  /** Run one judge cycle directly (for testing). */
  judge: (event: OmpToolResultEvent) => Promise<JudgeBandResult>;
  /** Reset the per-turn ring (for testing). */
  reset: (sessionId?: string, turnId?: string) => void;
}

/**
 * The L1 per-edit judge factory.
 *
 * Returns an object with a pi-compatible registration: on the tool-result
 * event for a `write` | `edit` call, it excerpts the diff, packs ALL
 * edit+model rules into ONE judge call, bands each verdict, and returns
 * the mutated content. THE WRITE IS NEVER BLOCKED.
 */
export function kernelJudge(opts: JudgeOpts = {}): KernelJudgeHandle {
  // Per-factory turn ring state — each factory instance has its own ring,
  // so tests can isolate sessions/turns without cross-talk.
  const rings = new Map<string, TurnRing>();

  const ringAccessor: RingAccessor = (sessionId, turnId) => {
    const key = `${sessionId ?? 'default'}::${turnId ?? 'turn'}`;
    let ring = rings.get(key);
    if (!ring) {
      ring = { sessionId: sessionId ?? 'default', turnId: turnId ?? 'default', entries: [] };
      rings.set(key, ring);
    }
    return ring;
  };

  const judge = async (event: OmpToolResultEvent): Promise<JudgeBandResult> => {
    return judgeWithBands(event, opts, ringAccessor);
  };

  const reset = (sessionId?: string, turnId?: string): void => {
    const key = `${sessionId ?? opts.sessionId ?? 'default'}::${turnId ?? opts.turnId ?? 'turn'}`;
    rings.delete(key);
  };

  function register(pi: {
    on(event: string, handler: (event: unknown, ctx: OmpExtensionContext) => unknown): void;
  }): void {
    pi.on('tool_result', async (event: unknown, _ctx: OmpExtensionContext) => {
      // Only fire on `write` | `edit` tool results.
      if (!event || typeof event !== 'object') return undefined;
      const toolName = 'toolName' in event ? String(event.toolName) : '';
      if (toolName !== 'write' && toolName !== 'edit') return undefined;

      // THE WRITE IS NEVER BLOCKED. The handler returns the mutated content;
      // it never throws. Any internal error is caught and logged.
      try {
        const result = await judgeWithBands(
          event as OmpToolResultEvent,
          opts,
          ringAccessor,
        );
        const hasMutation =
          JSON.stringify(result.content) !== JSON.stringify(event) ||
          result.notices.length > 0;
        if (hasMutation) {
          return {
            content: result.content,
            details: 'details' in event ? event.details : undefined,
          };
        }
        return undefined; // no mutation — allow pass-through
      } catch (e: unknown) {
        recordFiring({
          rule: 'kernel-judge',
          buffer: 'tool-result',
          band: 'skip',
          probability: null,
          verdict: `judge handler error: ${e instanceof Error ? e.message : String(e)}`,
          jev_called: false,
          ms: 0,
          matched_span: null,
          skip_reason: 'handler-error',
        });
        return undefined; // pass-through — the write is never blocked
      }
    });
  }

  return { register, judge, reset };
}

// ── EXPORT THE BAND FUNCTION FOR TESTS ────────────────────────────────────
export { computeBand };
