/**
 * events-ledger.ts — the enriched firing ledger (L0 instrumentation).
 *
 * Kills INCIDENT CLASS C (derailment-data-log.md §3): EVIDENCE DESTRUCTION.
 * V1's `contextMode: discard` deleted the ablated partial BEFORE any audit
 * row was written; 18 of 22 firings left no recoverable text because the
 * matched span was never persisted.
 *
 * This module writes the span to .abide/events.jsonl BEFORE any caller can
 * discard the buffer. The write is synchronous (fs.appendFileSync) so
 * ordering is mechanically guaranteed — no async scheduling can lose it.
 *
 * Per the PARAGON_V2_BLUEPRINT §5.3 audit law, every firing writes:
 *   ts, rule, buffer (kind), band, probability, verdict, jev_called, ms,
 *   matched_span, skip_reason
 *
 * The .abide dir is resolved from env ABIDE_DIR or `.abide` relative to cwd.
 */

import { appendFileSync, readFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ── RESOLUTION ────────────────────────────────────────────────────────────
// Resolved at call-time so tests can override ABIDE_DIR per-test via env.
// (A module-load-time const would freeze the path and poison isolation.)

export function ledgerDir(): string {
  return process.env.ABIDE_DIR ?? '.abide';
}

export function ledgerPath(): string {
  return join(ledgerDir(), 'events.jsonl');
}

// ── SCHEMA (§5.3 audit law; exactly these 10 fields) ──────────────────────

export type BufferKind =
  | 'agent-text'
  | 'agent-thinking'
  | 'host-envelope'
  | 'tool-result'
  | 'quoted';

export type Band = 'act' | 'flag' | 'clear' | 'skip';

export const FIRING_SCHEMA = [
  'ts', 'rule', 'buffer', 'band', 'probability', 'verdict',
  'jev_called', 'ms', 'matched_span', 'skip_reason',
] as const;

export interface FiringEvent {
  /** ISO-8601 timestamp (UTC). */
  ts: string;
  /** Rule id, e.g. verification-before-declaration. */
  rule: string;
  /** The buffer KIND the rule fired on. */
  buffer: BufferKind;
  /** act | flag | clear | skip. */
  band: Band;
  /** Judge probability (Noul/Choice/Score), null when unused. */
  probability: number | null;
  /** Human-readable verdict or band summary. */
  verdict: string;
  /** Did TypeSafe Jev get called for this firing? */
  jev_called: boolean;
  /** Wall-clock ms the judge took, 0 if skipped. */
  ms: number;
  /**
   * The exact matched substring — the span the rule acted on.
   * MUST be non-null for act/flag bands; null only for clear/skip.
   */
  matched_span: string | null;
  /** Why a skip happened, else null. */
  skip_reason: string | null;
}

// ── ROLE CLASSIFIER ───────────────────────────────────────────────────────
// WO-1 (blueprint §3 class 1): FIRE-ON-HOST-TEXT — the layer must never
// examine host-authored text. classifyBuffer decides the buffer kind BEFORE
// any judge sees it, so host envelopes route to `host-envelope` and skip
// claim kernels entirely.
//
// Rules (exact per derailment-data-log.md §1 + §2 + corpus Row 1/2):
//   - <system-notice>, <system-reminder>, <task-result> → host-envelope
//   - MCP envelope (tool result content from an MCP tool) → host-envelope
//   - fenced or inline code region → quoted (USE/MENTION blindness class B)
//   - otherwise origin-driven: agent-text | agent-thinking | tool-result
//
// origin: 'agent' | 'thinking' | 'tool' | 'host'

export type BufferOrigin = 'agent' | 'thinking' | 'tool' | 'host';

export interface ClassifyResult {
  kind: BufferKind;
  /** Why the classifier picked this kind (for skip_reason logging). */
  reason: string;
}

const MCP_TOOL_PREFIXES = ['xd://', 'mcp__'] as const;

function hasSystemTags(text: string): boolean {
  return /<system-notice[ >]|<system-reminder[ >]|<task-result/i.test(text);
}

function hasCodeFence(text: string): boolean {
  if (/^```/m.test(text) || /^~~~/m.test(text)) return true;
  // inline code spans are formed by pairs of backticks: any count >= 2
  // (even or odd) means at least one inline code span exists.
  const ticks = (text.match(/`/g) || []).length;
  return ticks >= 2;
}

function isMcpEnvelope(origin: BufferOrigin, text: string): boolean {
  // An MCP envelope is recognized by its text prefix, NOT just the origin.
  // A regular tool result (origin 'tool' without an MCP prefix) is tool-result,
  // not host-envelope. Only xd:// / mcp__ prefixed text is host-authoritative.
  if (hasSystemTags(text)) return false; // system tags beat the prefix rule
  return MCP_TOOL_PREFIXES.some((p) => text.startsWith(p));
}

/**
 * Classify a buffer by its text + structural origin.
 * ADVERSARIAL GUARANTEE: a host envelope NEVER returns 'agent-text'.
 */
export function classifyBuffer(text: string, origin: BufferOrigin = 'agent'): ClassifyResult {
  const trimmed = text ?? '';

  // (1) Host-authoritative envelopes — WO-1. Never agent-text.
  if (hasSystemTags(trimmed)) {
    return { kind: 'host-envelope', reason: 'system-tag-envelope' };
  }
  if (isMcpEnvelope(origin, trimmed)) {
    return { kind: 'host-envelope', reason: 'mcp-envelope' };
  }

  // (2) Quoted regions — WO-2 / incident class B. A quoted span is never
  // the agent performing the act in its own voice.
  if (hasCodeFence(trimmed)) {
    return { kind: 'quoted', reason: 'code-fence-or-inline-code' };
  }

  // (3) Origin-driven kinds for the surviving buffers.
  switch (origin) {
    case 'thinking':
      return { kind: 'agent-thinking', reason: 'origin-thinking' };
    case 'tool':
      return { kind: 'tool-result', reason: 'origin-tool' };
    case 'host':
      // Non-envelope host text that wasn't caught above (rare; still not agent).
      return { kind: 'host-envelope', reason: 'origin-host' };
    case 'agent':
    default:
      return { kind: 'agent-text', reason: 'origin-agent' };
  }
}

// ── WRITER (synchronous; ordering guaranteed) ────────────────────────────
// recordFiring writes the row BEFORE any caller can discard the text.
// fs.appendFileSync is synchronous — the OS guarantees the append happens
// during the call, so even if the caller immediately drops `contextMode:
// discard` the span survives in events.jsonl.

export interface RecordFiringInput {
  rule: string;
  buffer: BufferKind;
  band: Band;
  probability?: number | null;
  verdict: string;
  jev_called?: boolean;
  ms?: number;
  matched_span: string | null;
  skip_reason?: string | null;
  /** When to stamp; defaults to now. Exposed for tests/replay. */
  ts?: string;
}

export interface RecordFiringResult {
  /** The full row that was written. */
  row: FiringEvent;
}

/**
 * Append one firing row to the ledger. Synchronous — blocks until the
 * bytes are on disk. This is the EVIDENCE-DESTRUCTION kill switch:
 * the matched_span is persisted before any discard path runs.
 *
 * ADVERSARIAL GUARD (incident class C): an act/flag band firing MUST carry
 * its matched_span — a null span on an enforcement action is the exact
 * regression that made 18/22 firings unauditable. clear/skip bands may
 * legitimately have no span (the rule did not act on text).
 */
export function recordFiring(input: RecordFiringInput): RecordFiringResult {
  // The evidence-destruction guard: act/flag MUST have a span.
  if ((input.band === 'act' || input.band === 'flag') && input.matched_span == null) {
    throw new Error(
      `matched_span is required for band '${input.band}' (rule='${input.rule}'): ` +
        `a null span on an enforcement action is the EVIDENCE-DESTRUCTION regression`,
    );
  }

  const row: FiringEvent = {
    ts: input.ts ?? new Date().toISOString(),
    rule: input.rule,
    buffer: input.buffer,
    band: input.band,
    probability: input.probability ?? null,
    verdict: input.verdict,
    jev_called: input.jev_called ?? false,
    ms: input.ms ?? 0,
    matched_span: input.matched_span,
    skip_reason: input.skip_reason ?? null,
  };

  // Ensure the dir exists (mkdirSync recursive is safe + idempotent).
  const dir = ledgerDir();
  const file = ledgerPath();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const line = JSON.stringify(row) + '\n';
  appendFileSync(file, line, 'utf8');

  return { row };
}

// ── READER (recoverSpan — the auditability proof) ─────────────────────────
// WO-3: every firing writes the matched span BEFORE discard. recoverSpan
// proves the span is there by reading it back from the durable sidecar.

/** Parse a single JSONL line into a FiringEvent, or null if malformed. */
function parseRow(line: string): FiringEvent | null {
  try {
    const obj = JSON.parse(line);
    const keys = Object.keys(obj).sort();
    const expected = FIRING_SCHEMA.slice().sort();
    // Validate exact key set (no missing, no extra).
    const ok =
      keys.length === expected.length && keys.every((k, i) => k === expected[i]);
    if (!ok) return null;
    return obj as FiringEvent;
  } catch {
    return null;
  }
}

/** Read every row from the ledger (ordered by file position = write order). */
export function readAllRows(): FiringEvent[] {
  const file = ledgerPath();
  if (!existsSync(file)) return [];
  const raw = readFileSync(file, 'utf8');
  return raw
    .split('\n')
    .filter((l) => l.trim().length > 0)
    .map(parseRow)
    .filter((r): r is FiringEvent => r !== null);
}

/**
 * Look up the matched_span for a past firing.
 * Matches on rule + ts (the natural primary key from the auth channel).
 * Returns null if the row was never written — the EVIDENCE-DESTRUCTION proof.
 */
export function recoverSpan(rule: string, ts: string): string | null {
  const rows = readAllRows();
  const hit = rows.find((r) => r.rule === rule && r.ts === ts);
  if (!hit) return null;
  return hit.matched_span;
}

// ── LEDGER SEAL (append a tamper-evident marker row) ───────────────────────
// Not a cryptographic seal — the audit law is satisfied by the row itself
// existing in the right field set. The seal rows a special verdict so the
// close-gate can assert "the ledger was consulted."

export function sealLedger(marker: string): void {
  const row: FiringEvent = {
    ts: new Date().toISOString(),
    rule: '__ledger_seal__',
    buffer: 'host-envelope',
    band: 'clear',
    probability: null,
    verdict: `ledger-sealed:${marker}`,
    jev_called: false,
    ms: 0,
    matched_span: null,
    skip_reason: null,
  };
  const dir = ledgerDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const line = JSON.stringify(row) + '\n';
  appendFileSync(ledgerPath(), line, 'utf8');
}
