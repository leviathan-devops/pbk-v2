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
 * THE KEY IS REQUIRED. If it is ABSENT the layer is DOWN — not "skipping": every edit goes UNJUDGED
 * while the agent keeps writing, and the only honest presentation of that is a LOUD FAILURE. The judge
 * writes an UNAVAILABLE row (band `skip`, skip_reason `judge-unavailable:no-key`, verdict naming the
 * consequence) AND a loud stderr line naming the remedy. **A quiet per-call skip would let the system
 * look like it is enforcing while it is not — the unauthorized-fallback class.**
 *
 * Timeouts: EDIT_CHECK_TIMEOUT_MS (8000ms) per edit call; a timeout is a
 * `skip` row with skip_reason: 'timeout', never a block.
 *
 * Author: this is a self-contained extension module — no dist/ rebuild.
 */

import { join as joinPath } from 'node:path';
import { homedir } from 'node:os';
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
/** V-066: the keyless state is a STARTUP fact — announce it loudly ONCE, not per edit. */
let judgeUnavailableAnnounced = false;
/** V-071: the no-rules state is also a STARTUP fact — announce it once. */
let rubricUnavailableAnnounced = false;

export const ACT_THRESHOLD = 0.8;
export const FLAG_THRESHOLD = 0.5;

// Diff size caps (mirror @coldtea/abide lib/constants.js)
const MAX_STATE_CHARS = 24_000;
const MAX_DIFF_INPUT_CHARS = 1_000_000;

/**
 * V-025: the rubric is a WORKSPACE artifact (`<cwd>/.abide/rubric.json`, abide's own
 * convention — `abide rubric validate` reads it there). The original default resolved
 * relative to the extension's dist dir (`extensions/pbk/../.abide/`), which does not
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
/**
 * V-067: RESOLVE THE KEY FROM THE PATH THE ERROR NAMES.
 * MEASURED: the loud-fail message tells the operator to put the key in `~/.abide/.env`, and
 * `verify-key-path.mjs` reads that file — but `defaultJudge` read ONLY `process.env`. So the remedy the
 * error named did NOT work: the file held a valid 107-char key while the judge reported it absent. **A
 * remedy that does not remedy is worse than no remedy** — it sends the operator in a circle.
 * Resolution order: the explicit override -> the env -> `~/.abide/.env` (the documented path).
 */
export function resolveApiKey(): string | undefined {
  const fromEnv = process.env.TYPESAFE_AI_API_KEY;
  if (fromEnv) return fromEnv;
  try {
    const envPath = joinPath(homedir(), '.abide', '.env');
    if (!existsSync(envPath)) return undefined;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*TYPESAFE_AI_API_KEY\s*=\s*(\S+)/);
      if (m && m[1].length > 8) return m[1];
    }
  } catch { /* an unreadable .env is not a crash — the caller reports the layer DOWN */ }
  return undefined;
}

/**
 * V-068: the rubric's question type -> the API's PRIMITIVE. The upstream schema says `boolean`; the wire
 * says `noul`. `choice`/`score` pass through (they are already the API's names).
 */
export function toApiPrimitive(t: string | undefined): string {
  switch ((t ?? '').toLowerCase()) {
    case 'boolean':
    case 'bool':
    case 'noul':
      return 'noul';
    case 'choice':
      return 'choice';
    case 'score':
      return 'score';
    default:
      return 'noul';
  }
}

/**
 * V-092: the file's KIND, derived from its path — the subject class the scoping clause needs.
 */
export function fileKindOf(file: string): string {
  const f = (file ?? '').toLowerCase();
  if (/\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|rb|java|c|cpp|h)$/.test(f)) return 'source';
  if (/\.(md|markdown|txt|rst)$/.test(f)) return 'document';
  if (/\.(json|ya?ml|toml|ini|env)$/.test(f)) return 'config';
  if (/\.(sql|db|sqlite)$/.test(f)) return 'data';
  if (/\.(html|css|scss|vue|svelte)$/.test(f)) return 'ui';
  return 'other';
}

export async function defaultJudge(
  rules: RubricRule[],
  state: JudgeState,
  apiKey?: string,
): Promise<Record<string, number>> {
  const key = apiKey ?? resolveApiKey();
  if (!key) {
    // LOUD, and it names the remedy. The caller must present this as the layer being DOWN.
    const err = new Error(
      'no-key: TYPESAFE_AI_API_KEY is absent, so NO edit can be judged. ' +
        'Fix: put the key in ~/.abide/.env (chmod 600) as TYPESAFE_AI_API_KEY=<key>, then restart.',
    ) as Error & { code?: string };
    err.code = 'NO_API_KEY';
    throw err;
  }

  // Pack ALL rules into ONE judge call — ONE questions object.
  const questions: Record<string, unknown> = {};
  for (const rule of rules) {
    const q = rule.check?.question;
    if (!q) continue;
    // V-068: THE API'S PRIMITIVES ARE noul / choice / score — `boolean` IS NOT ONE. MEASURED against the
    // real API: `type: "boolean"` -> 400 {"error_type":"api_usage_error","message":"Invalid request."},
    // while `type: "noul"` -> 200 with the answer. The rubric's own vocabulary says `boolean` (it is the
    // upstream schema's word); the WIRE needs the primitive. This is the mapping, and it exists because the
    // stub could never have found it: a stub answers whatever shape you ask it.
    // V-092 THE SCOPING CLAUSE. The measured defect: the judge answered every rule's question on every
    // file kind, because the question never said WHICH SUBJECTS it applies to. The clause is the §6.20
    // observation form — a checkable condition, not a vibe:
    //   "the state names the file and its kind; if this question's subject plainly does not apply to a
    //    file of that kind, answer false."
    // A `.md`-density question on a `.json` therefore answers FALSE — which is the honest answer, and it
    // is what turns a flat near-constant into a discriminating signal.
    const SCOPING =
      ' SCOPE: the state names the file and its kind. If this question\u2019s subject plainly does not ' +
      'apply to a file of that kind (for example a document-DENSITY question asked about a source or ' +
      'config file), answer false — the rule does not apply to this subject.';
    questions[rule.id] = {
      type: toApiPrimitive(q.type),
      ...(q.instructions ? { instructions: q.instructions + SCOPING } : {}),
      ...(q.criteria ? { criteria: q.criteria } : {}),
    };
  }

  const body = JSON.stringify({
    state: {
      file: state.file,
      // V-092 THE CALIBRATION FIX: THE FILE'S KIND. MEASURED (the six-rule × four-kind matrix): with the
      // path alone, five of the six edit rules scored FLAT across unrelated file kinds — and
      // `w7-doc-density`, whose own text is about `.md` files, scored HIGHEST on a `.json` config (0.64)
      // and 0.57 on a TypeScript source. Spread 0.09: **the rule did not know what a `.md` file is.** A
      // near-constant is not a judgment, and it costs a question on every edit. The kind travels in the
      // state so the question can SCOPE ITSELF (see the scoping clause below).
      fileKind: fileKindOf(state.file),
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
      answers?: Record<string, { probability?: number; noul?: number }>;
    };
    const scores: Record<string, number> = {};
    for (const rule of rules) {
      const answer = result.answers?.[rule.id];
      // V-046: `typeof NaN === 'number'`, and Math.min(1, Math.max(0, NaN)) === NaN — so a non-finite
      // score entered `scores` and passed the decision guard below, where BOTH threshold comparisons
      // are false and computeBand returned 'clear'. A judge that produced no usable number was
      // reported as a CLEAN rule: the V-036 defect class, one type-check deeper.
      // V-069: THE ANSWER FIELD IS `noul` (0-1), NOT `probability`. MEASURED: the real API returns
      // {"answers":{"<id>":{"type":"noul","noul":0.95}}}. Reading only `.probability` found NOTHING and
      // would have produced a silent all-rules-unanswered result — the fabricated-verdict class (V-036)
      // arriving through a field name. The primitive's own field is read first; `probability` stays as the
      // documented alternative the API's other primitives may use.
      const score = typeof answer?.noul === 'number' ? answer.noul : answer?.probability;
      if (typeof score === 'number' && Number.isFinite(score)) {
        scores[rule.id] = Math.min(1, Math.max(0, score));
      }
      // V-036: an UNANSWERED rule gets NO score. The previous `else { scores[rule.id] = 0 }`
      // FABRICATED a probability: a partial/truncated API response made every unjudged rule read
      // as band `clear` — "no violation found" — for a rule the judge never saw. Measured: a 200
      // with no `answers` returned `{"verify-rule":0}`. A missing answer is a SKIP, not a verdict.
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
  // V-040: prefer the EVENT's identifiers (a host that supplies them gets true per-turn rings),
  // then the constructor opts, then let the accessor's counter default apply.
  const sessionId = opts.sessionId ?? (event as { sessionId?: string }).sessionId ?? 'default';
  const turnId = opts.turnId ?? (event as { turnId?: string }).turnId;

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
    // V-071: A MISSING RUBRIC IS THE LAYER BEING DOWN, NOT A BENIGN SKIP.
    // MEASURED LIVE (a real omp session writing a file in a project with no `.abide/rubric.json`):
    // `rule=kernel-judge band=skip ms=0 jev_called=false skip_reason='no-model-rules'` — EVERY edit in
    // that project was UNJUDGED, QUIETLY. That is the same unauthorized-fallback class as an absent key:
    // the system looked like it was enforcing while it was not. The row now names the consequence and a
    // loud stderr line (once per process) names the remedy.
    const looked = opts.rubricPath ?? joinPath(process.cwd(), '.abide', 'rubric.json');
    recordFiring({
      rule: 'kernel-judge',
      buffer: 'tool-result',
      band: 'skip',
      probability: null,
      verdict:
        `JUDGE UNAVAILABLE — the rubric at ${looked} has NO edit+model rules; this edit was NOT judged ` +
        '(the L1 layer has no rules to apply here)',
      jev_called: false,
      ms: 0,
      matched_span: null,
      skip_reason: 'judge-unavailable:no-model-rules',
    });
    if (!rubricUnavailableAnnounced) {
      rubricUnavailableAnnounced = true;
      try {
        process.stderr.write(
          `\n[pbk] *** THE L1 JUDGE HAS NO RULES HERE *** the rubric resolved at ${looked} ` +
            'contains no active edit+model rules, so every edit in this workspace is UNJUDGED.\n' +
            '         Fix: compile the rubric into <workspace>/.abide/rubric.json ' +
            '(bun scripts/compile-rubric.mjs), then restart omp.\n\n',
        );
      } catch { /* never throw from a logger */ }
    }
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
      // THE LAYER IS DOWN. Not "skipped" — UNJUDGED. The row names the consequence; the stderr line is
      // loud and names the remedy; and it is written ONCE PER PROCESS (the condition is a startup fact,
      // not a per-edit event) so the operator cannot miss it and the log cannot drown in it.
      recordFiring({
        rule: 'kernel-judge',
        buffer: 'tool-result',
        band: 'skip',
        probability: null,
        verdict: 'JUDGE UNAVAILABLE — no TYPESAFE_AI_API_KEY; this edit was NOT judged (the L1 layer is DOWN)',
        jev_called: false,
        ms: Math.round(performance.now() - started),
        matched_span: null,
        skip_reason: 'judge-unavailable:no-key',
      });
      if (!judgeUnavailableAnnounced) {
        judgeUnavailableAnnounced = true;
        try {
          process.stderr.write(
            '\n[pbk] *** THE L1 JUDGE IS DOWN *** TYPESAFE_AI_API_KEY is absent, so EVERY edit is ' +
              'UNJUDGED. This is a LOUD FAILURE, not a degraded mode.\n' +
              '         Fix: ~/.abide/.env (chmod 600) with TYPESAFE_AI_API_KEY=<key>, then restart omp.\n\n',
          );
        } catch { /* stderr itself can fail; never throw from a logger */ }
      }
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
    // V-036: an absent score is NOT a zero. `?? 0` silently produced band `clear` for a rule the
    // judge never answered — a fail-open fabrication on the judge path. Absent => a LOGGED skip.
    const scoreForRule = scores[rule.id];
    // V-046: a FINITE number is required. `typeof NaN === 'number'` and `Infinity` is a number too, so
    // the old guard let both through: NaN fell through BOTH threshold comparisons into band 'clear'
    // (a non-answer reported as clean), and Infinity cleared the act threshold (a non-answer FIRING the
    // gate). Neither is an answer. Both are skips.
    if (typeof scoreForRule !== 'number' || !Number.isFinite(scoreForRule)) {
      recordFiring({
        rule: rule.id,
        buffer: 'tool-result',
        band: 'skip',
        probability: null,
        verdict:
          typeof scoreForRule !== 'number'
            ? `judge returned no answer for rule "${rule.id}"`
            : `judge returned a non-finite score (${String(scoreForRule)}) for rule "${rule.id}"`,
        jev_called: true,
        ms: Math.round(performance.now() - started),
        matched_span: null,
        skip_reason: 'no-answer',
      });
      continue;
    }
    const prob = scoreForRule;
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
  /** Advance the turn counter — the host calls this at each turn boundary (agent_end). */
  setTurn: (turn: number) => void;
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

  // V-040: the ring must be PER TURN, but the omp tool_result payload carries NO session/turn ids
  // (measured: {type, toolName, toolCallId, input}). The previous code keyed the ring on the
  // CONSTRUCTOR opts, which are unset in production — so the key was constant for the process and
  // MAX_ACT_APPENDS_PER_RULE_PER_TURN degenerated into a PERMANENT cap: after 2 act appends a rule
  // was flag-only FOREVER, and the repair channel (this layer's whole point) fell silent.
  // `currentTurn` is advanced by the host at the turn boundary (agent_end) via `setTurn()`.
  let currentTurn = 0;
  const ringAccessor: RingAccessor = (sessionId, turnId) => {
    const key = `${sessionId ?? 'default'}::${turnId ?? 'T' + currentTurn}`;
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

  return { register, judge, reset, setTurn: (turn: number) => { currentTurn = turn; } };
}

// ── EXPORT THE BAND FUNCTION FOR TESTS ────────────────────────────────────
export { computeBand };
