/**
 * ledger.test.ts — adversarial-first tests for the enriched firing ledger.
 *
 * Incident class C (EVIDENCE DESTRUCTION) killed by events-ledger.ts:
 * V1 deleted the matched text before the audit row was written. These tests
 * prove the span survives the discard, and that host envelopes are never
 * misclassified as agent text.
 *
 * Each describe block's FIRST test is the failure case (the regression the
 * ledger must make impossible).
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  type BufferKind,
  type Band,
  type FiringEvent,
  type RecordFiringInput,
  classifyBuffer,
  recordFiring,
  recoverSpan,
  readAllRows,
  sealLedger,
  ledgerPath,
  ledgerDir,
} from '../src/ledger/events-ledger.js';

// ── TEST ISOLATION ─────────────────────────────────────────────────────────
// Each test gets its own ABIDE_DIR so rows never bleed across tests.
// The module reads ABIDE_DIR at CALL-TIME (not load-time), so setting the
// env var in beforeEach is sufficient for isolation.

const TMP = join(process.cwd(), '.abide-test-tmp');
let realAbide: string | undefined;

beforeEach(() => {
  realAbide = process.env.ABIDE_DIR;
  process.env.ABIDE_DIR = TMP;
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
  mkdirSync(TMP, { recursive: true });
});

afterEach(() => {
  // V-047: assigning `undefined` to process.env stores the STRING "undefined" and

  // `?? ` would NOT fall back — the ledger silently moved to ./undefined/. Restore the ABSENCE.

  if (realAbide === undefined) delete process.env.ABIDE_DIR;

  else process.env.ABIDE_DIR = realAbide;
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ── GROUP 1: ledger-span ───────────────────────────────────────────────────
// The matched_span MUST survive a caller that discards the buffer text.
// This is the EVIDENCE-DESTRUCTION kill switch (WO-3, audit law §5.3).

describe('ledger-span (EVIDENCE DESTRUCTION)', () => {
  // ADVERSARIAL FIRST: a firing with no span must be impossible for act/flag bands.
  // If recordFiring allows matched_span=null on an act, the ledger is theater.
  test('REJECTS an act/flag firing with no matched_span (the evidence-destruction regression)', () => {
    const bad: RecordFiringInput = {
      rule: 'verification-before-declaration',
      buffer: 'agent-text',
      band: 'act',
      matched_span: null, // the regressible state — must not write a null span for act
      verdict: 'claim without evidence',
    };
    // The function does not throw by design (it is a sidecar), but the
    // ADVERSARIAL contract is: no act/flag row ever has a null span. We
    // assert that contract is upheld by a guard in recordFiring.
    expect(() => recordFiring(bad)).toThrow(/matched_span.*required.*act|flag/);
    // And nothing was written.
    const rows = readAllRows();
    expect(rows).toHaveLength(0);
  });

  test('writes a valid act firing WITH its matched_span', () => {
    const { row } = recordFiring({
      rule: 'verification-before-declaration',
      buffer: 'agent-text',
      band: 'act',
      probability: 0.92,
      verdict: 'agent declared complete without evidence',
      jev_called: true,
      ms: 84,
      matched_span: 'the task is done',
    });
    expect(row.ts).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(row.matched_span).toBe('the task is done');
  });

  test('matched_span survives a discard-after-write (the core class C guarantee)', () => {
    const ts = '2026-09-20T17:52:14.000Z';
    const span = 'the task is done';
    recordFiring({
      ts,
      rule: 'verification-before-declaration',
      buffer: 'agent-text',
      band: 'act',
      matched_span: span,
      verdict: 'declared closed',
    });
    // The caller now "discards" the buffer text (contextMode: discard).
    const recovered = recoverSpan('verification-before-declaration', ts);
    expect(recovered).toBe(span);
  });

  test('recoverSpan returns null for a firing never written (unauditable → null)', () => {
    expect(recoverSpan('some-rule', '1970-01-01T00:00:00.000Z')).toBeNull();
  });

  test('recoverSpan finds the right row among many', () => {
    const ts1 = '2026-09-20T17:41:01.000Z';
    const ts2 = '2026-09-20T17:52:14.000Z';
    recordFiring({ ts: ts1, rule: 'v', buffer: 'agent-text', band: 'act', matched_span: 'first', verdict: 'a' });
    recordFiring({ ts: ts2, rule: 'v', buffer: 'agent-text', band: 'act', matched_span: 'second', verdict: 'b' });
    expect(recoverSpan('v', ts1)).toBe('first');
    expect(recoverSpan('v', ts2)).toBe('second');
  });

  test('clear/skip bands may have null matched_span (no span to capture)', () => {
    recordFiring({
      rule: 'role-skip',
      buffer: 'host-envelope',
      band: 'skip',
      matched_span: null,
      verdict: 'host buffer, rule not applicable',
      skip_reason: 'role',
    });
    const rows = readAllRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].band).toBe('skip');
    expect(rows[0].matched_span).toBeNull();
  });

  test('row schema has EXACTLY the 10 audit-law fields, no more no less', () => {
    recordFiring({
      rule: 'test-rule',
      buffer: 'agent-text',
      band: 'flag',
      matched_span: 'flagged phrase',
      verdict: 'flagged',
    });
    const file = readFileSync(ledgerPath(), 'utf8');
    const parsed = JSON.parse(file.trim());
    const keys = Object.keys(parsed).sort();
    // V-084: the 10 audit-law fields are ALL REQUIRED, and `session` is the ONE permitted extra — the
    // ATTRIBUTION field. It exists because the ledger is cwd-scoped, so sessions sharing a cwd wrote into
    // one file and the claim ring could bind a claim to ANOTHER session's evidence. The test's INTENT is
    // unchanged: no unapproved key may appear.
    const base = ['band', 'buffer', 'jev_called', 'matched_span', 'ms', 'probability', 'rule', 'skip_reason', 'ts', 'verdict'];
    for (const k of base) expect(keys).toContain(k);
    const extras = keys.filter((k) => !base.includes(k));
    expect(extras).toEqual(['session']);   // the only sanctioned extra
  });

  test('writes are append-only (new rows never overwrite old)', () => {
    recordFiring({ rule: 'r1', buffer: 'agent-text', band: 'clear', matched_span: 's1', verdict: 'c1' });
    recordFiring({ rule: 'r2', buffer: 'agent-text', band: 'clear', matched_span: 's2', verdict: 'c2' });
    const rows = readAllRows();
    expect(rows).toHaveLength(2);
    expect(rows[0].matched_span).toBe('s1');
    expect(rows[1].matched_span).toBe('s2');
  });

  test('sealLedger appends a tamper-evident marker row', () => {
    recordFiring({ rule: 'r1', buffer: 'agent-text', band: 'clear', matched_span: 's1', verdict: 'c1' });
    sealLedger('close-turn');
    const rows = readAllRows();
    expect(rows).toHaveLength(2);
    expect(rows[1].rule).toBe('__ledger_seal__');
    expect(rows[1].verdict).toBe('ledger-sealed:close-turn');
  });

  test('creates .abide dir if absent', () => {
    // dir was created in beforeEach; wipe it fully then re-record
    rmSync(TMP, { recursive: true, force: true });
    expect(existsSync(TMP)).toBe(false); // TMP removed
    expect(existsSync(ledgerPath())).toBe(false); // ledger file gone too after dir wipe
    const { row } = recordFiring({
      rule: 'x', buffer: 'agent-text', band: 'clear', matched_span: 's', verdict: 'v',
    });
    expect(existsSync(TMP)).toBe(true);
    expect(row.rule).toBe('x');
  });
});

// ── GROUP 2: role-filter ───────────────────────────────────────────────────
// The classifier is the FIRE-ON-HOST-TEXT kill switch (WO-1, §1).
// Host envelopes MUST never be `agent-text`.

describe('role-filter (FIRE-ON-HOST-TEXT)', () => {
  // ADVERSARIAL FIRST: a host envelope must NEVER classify as agent-text.
  // If it does, the judge sees host prose as an agent claim — the §1 defect.
  test('NEVER classifies a host envelope as agent-text (corpus Row 1: system-notice)', () => {
    const text = '<system-notice> xd:// device inventory changed. Available tools.';
    const result = classifyBuffer(text, 'host');
    expect(result.kind).not.toBe('agent-text');
    expect(result.kind).toBe('host-envelope');
  });

  test('<system-reminder> classifies as host-envelope', () => {
    const text = '<system-reminder> 3 todo items still open. Mark it done now.</system-reminder>';
    expect(classifyBuffer(text, 'host').kind).toBe('host-envelope');
  });

  test('<task-result> classifies as host-envelope', () => {
    const text = '<task-result id="HandoverCtx" agent="scout" status="completed">result data</task-result>';
    expect(classifyBuffer(text, 'host').kind).toBe('host-envelope');
  });

  test('MCP envelope (xd:// prefix) classifies as host-envelope', () => {
    const text = 'xd://mcp__serena_get_symbols_overview returned 42 symbols';
    expect(classifyBuffer(text, 'tool').kind).toBe('host-envelope');
  });

  test('tool origin (non-MCP) classifies as tool-result', () => {
    const text = 'Read 12 files in 3s';
    expect(classifyBuffer(text, 'tool').kind).toBe('tool-result');
  });

  test('plain agent text with a claim word classifies as agent-text', () => {
    const text = 'the task is done and verified';
    expect(classifyBuffer(text, 'agent').kind).toBe('agent-text');
  });

  test('thinking origin classifies as agent-thinking', () => {
    const text = 'I should verify this claim';
    expect(classifyBuffer(text, 'thinking').kind).toBe('agent-thinking');
  });

  test('fenced code block classifies as quoted (USE/MENTION blindness, corpus Row 2)', () => {
    const text = 'The detector matched:\n```\nthe task is done\n```\nwhich is a quotation.';
    expect(classifyBuffer(text, 'agent').kind).toBe('quoted');
  });

  test('inline code span classifies as quoted', () => {
    const text = 'The word `done` appears in the text.';
    expect(classifyBuffer(text, 'agent').kind).toBe('quoted');
  });

  test('system-tag text inside a code fence still classifies as host-envelope (tag wins)', () => {
    // A code fence around a system tag is still host-authored; the role law
    // holds regardless of quotation.
    const text = '```\n<system-notice> hello </system-notice>\n```';
    expect(classifyBuffer(text, 'host').kind).toBe('host-envelope');
  });

  test('agent text quoting a kernel verdict is still quoted (corpus Row 2 / B2)', () => {
    // The agent documenting the kernel must not itself be fired upon.
    const text = 'The kernel rendered "You are declaring work complete" — that is class B2.';
    // This has no code fence or system tags → agent-text. The judge layer
    // handles quotation awareness; classifyBuffer only handles structural
    // envelope/code. This documents the boundary.
    expect(classifyBuffer(text, 'agent').kind).toBe('agent-text');
  });
});

// ═══ V-047 THE SENTINEL PATH (probed 2026-09-21) ═══════════════════════════════════════════════════
// `process.env.X = undefined` stores the STRING "undefined" (node coerces) and `?? ` does NOT fall back
// for it — the broken value WINS. The test-restore pattern in four files did exactly that, so every
// firing after such a test landed in ./undefined/events.jsonl — a path NOTHING reads. A 39 KB file of
// misplaced audit rows was the proof. The ledger resolver must refuse a sentinel and name it.
describe('V-047 a sentinel ABIDE_DIR never becomes a directory', () => {
  test("ADVERSARIAL: the string 'undefined' resolves to .abide, never ./undefined/", () => {
    const before = process.env.ABIDE_DIR;
    process.env.ABIDE_DIR = 'undefined';
    try {
      expect(ledgerDir()).toBe('.abide');
      expect(ledgerPath()).toBe(join('.abide', 'events.jsonl'));
      expect(ledgerDir()).not.toContain('undefined');
    } finally {
      if (before === undefined) delete process.env.ABIDE_DIR; else process.env.ABIDE_DIR = before;
    }
  });

  test("the 'null' sentinel and the empty string are refused too", () => {
    const before = process.env.ABIDE_DIR;
    try {
      process.env.ABIDE_DIR = 'null';
      expect(ledgerDir()).toBe('.abide');
      process.env.ABIDE_DIR = '';
      expect(ledgerDir()).toBe('.abide');
    } finally {
      if (before === undefined) delete process.env.ABIDE_DIR; else process.env.ABIDE_DIR = before;
    }
  });

  test('CONTROL: a REAL path is honoured (the guard is not swallowing everything)', () => {
    const before = process.env.ABIDE_DIR;
    process.env.ABIDE_DIR = '/tmp/a-real-abide-dir';
    try {
      expect(ledgerDir()).toBe('/tmp/a-real-abide-dir');
    } finally {
      if (before === undefined) delete process.env.ABIDE_DIR; else process.env.ABIDE_DIR = before;
    }
  });

  test('the node coercion that caused it is a fact, not a guess', () => {
    const before = process.env.SENTINEL_PROBE;
    process.env.SENTINEL_PROBE = undefined as unknown as string;
    try {
      expect(typeof process.env.SENTINEL_PROBE).toBe('string');       // a string, not a value
      expect(process.env.SENTINEL_PROBE).toBe('undefined');           // the literal word
      expect(process.env.SENTINEL_PROBE ?? 'DEFAULT').toBe('undefined'); // ?? does NOT save you
    } finally {
      delete process.env.SENTINEL_PROBE;
      void before;
    }
  });
});
