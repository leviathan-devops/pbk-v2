/**
 * bind.test.ts — adversarial-first tests for the L2 claim binding firewall.
 *
 * ADVERSARIAL FIRST: the failure case (bare claim with empty ring → FABRICATED)
 * is always test #1. Then the positive paths: PASS, WRONG_SPAN, FAIL_CLOSED,
 * REJECT.
 */
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { bindAtoms, parseClaimAtoms } from '../src/ext/claim-bind.js';
import type { BindResult, ClaimAtom, JudgeFn, RingSpan } from '../src/ext/claim-bind.js';
import { readAllRows } from '../src/ledger/events-ledger.js';

// ── Test isolation (mirrors tests/ledger.test.ts) ───────────────────────────
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

// ── Helper: a stub judge that always supports ──────────────────────────────
function makeSupportJudge(): JudgeFn | undefined {
  return (_atom: ClaimAtom, _span: RingSpan) => ({ verdict: 'support' as const, probability: 0.99, ms: 1 });
}

// ── Helper: a stub judge that always rejects ───────────────────────────────
function makeRejectJudge(): JudgeFn | undefined {
  return (_atom: ClaimAtom, _span: RingSpan) => ({ verdict: 'reject' as const, probability: 0.01, ms: 1 });
}

// ═══════════════════════════════════════════════════════════════════════════
// ADVERSARIAL FIRST: failure case — bare claim with empty ring → FABRICATED
// ═══════════════════════════════════════════════════════════════════════════

describe('claim-bind firewall — adversarial first', () => {
  test('FAIL CASE #1: bare claim with empty ring must be FABRICATED', () => {
    const atoms = parseClaimAtoms('the daemon is running and all tests pass');
    expect(atoms.length).toBeGreaterThan(0); // atoms were extracted

    const result = bindAtoms(atoms, [], {
      currentTurn: '2026-09-21T12:00:00Z',
    });

    // Must refuse — no evidence at all.
    expect(result.verdict).toBe('FABRICATED');
    expect(result.jev_called).toBe(false);
    expect(result.boundSpan).toBeNull();
    expect(result.missingAtoms.length).toBe(atoms.length);
    expect(result.reason).toContain('no ring evidence');

    // The ledger must have recorded the firing.
    const rows = readAllRows();
    expect(rows.length).toBe(1);
    expect(rows[0].verdict).toBe('FABRICATED');
    expect(rows[0].skip_reason).toContain('ring is empty');
  });

  test('FAIL CASE #2: claim with no extractable atoms → REJECT', () => {
    // Close-shaped text that the parser cannot turn into structured atoms.
    const text = 'I did the thing. Hope it helps.';
    const atoms = parseClaimAtoms(text);
    expect(atoms.length).toBe(0); // no claim-shaped atoms

    const ring: RingSpan[] = [
      { text: 'container-testing run output: 0 fail', ts: '2026-09-21T12:00:00Z' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
    });

    expect(result.verdict).toBe('REJECT');
    expect(result.jev_called).toBe(false);
    expect(result.boundSpan).toBeNull();
    expect(result.missingAtoms).toEqual([]);

    const rows = readAllRows();
    expect(rows.length).toBe(1);
    expect(rows[0].verdict).toBe('REJECT');
  });

  test('FAIL CASE #3: no judge supplied on a bound atom → FAIL_CLOSED (never pass)', () => {
    const atoms = parseClaimAtoms('32 pass 0 fail ran just now');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      { text: 'container-testing: 32 pass 0 fail', ts: '2026-09-21T12:00:00Z', source: 'container-testing' },
    ];

    // No opts.judge — must fail-closed, NOT pass.
    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
    });

    expect(result.verdict).toBe('FAIL_CLOSED');
    expect(result.jev_called).toBe(false);
    expect(result.reason).toContain('fail-closed');

    const rows = readAllRows();
    expect(rows[0].verdict).toBe('FAIL_CLOSED');
    expect(rows[0].jev_called).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PASS: claim bound to same-turn span, judge supports
// ═══════════════════════════════════════════════════════════════════════════

describe('claim-bind firewall — positive binds', () => {
  test('PASS: claim bound to same-turn span with supporting judge', () => {
    const atoms = parseClaimAtoms('32 pass 0 fail ran just now');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      { text: 'container-testing suite: 32 pass 0 fail 455 tests', ts: '2026-09-21T12:00:00Z', source: 'container-testing' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeSupportJudge(),
    });

    expect(result.verdict).toBe('PASS');
    expect(result.jev_called).toBe(true);
    expect(result.boundSpan).toBeTruthy();
    expect(result.missingAtoms).toEqual([]);
    expect(result.reason).toContain('all');
    expect(result.reason).toContain('atom(s) bound');

    const rows = readAllRows();
    expect(rows.length).toBe(1);
    expect(rows[0].verdict).toBe('PASS');
    expect(rows[0].jev_called).toBe(true);
    expect(rows[0].band).toBe('clear');
    expect(rows[0].matched_span).toBeTruthy();
  });

  test('PASS: status claim bound to same-turn span', () => {
    const atoms = parseClaimAtoms('the daemon is running');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      { text: 'daemon started, is now running', ts: '2026-09-21T12:00:00Z', source: 'process' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeSupportJudge(),
    });

    expect(result.verdict).toBe('PASS');
    expect(result.jev_called).toBe(true);
    expect(result.boundSpan).toBeTruthy();
  });

  test('PASS: file claim bound to same-turn span', () => {
    const atoms = parseClaimAtoms('verified src/ledger/events-ledger.ts');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      { text: 'read events-ledger.ts — 295 lines', ts: '2026-09-21T12:00:00Z' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeSupportJudge(),
    });

    // The file atom text should match the span content.
    expect(result.verdict).toBe('PASS');
    expect(result.jev_called).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WRONG_SPAN: previous-turn span must NOT bind
// ═══════════════════════════════════════════════════════════════════════════

describe('claim-bind firewall — wrong span rejection', () => {
  test('WRONG_SPAN: only previous-turn span matches', () => {
    const atoms = parseClaimAtoms('32 pass 0 fail ran just now');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      // Previous turn — must NOT bind.
      { text: 'container-testing: 32 pass 0 fail', ts: '2026-09-20T11:00:00Z', source: 'container-testing' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeSupportJudge(),
    });

    expect(result.verdict).toBe('WRONG_SPAN');
    expect(result.jev_called).toBe(false);
    expect(result.boundSpan).toBeNull();
    expect(result.reason).toContain('previous-turn');

    const rows = readAllRows();
    expect(rows[0].verdict).toBe('WRONG_SPAN');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// FAIL_CLOSED: ring exists but atom has no supporting span
// ═══════════════════════════════════════════════════════════════════════════

describe('claim-bind firewall — fail-closed unbound', () => {
  test('FAIL_CLOSED: ring has spans but none support the atom', () => {
    const atoms = parseClaimAtoms('32 pass 0 fail on the daemon build');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      // Same turn, but content does not mention the atom text.
      { text: 'unrelated: 15 errors found in parser', ts: '2026-09-21T12:00:00Z' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeSupportJudge(),
    });

    expect(result.verdict).toBe('FAIL_CLOSED');
    expect(result.missingAtoms.length).toBeGreaterThan(0);
    expect(result.boundSpan).toBeNull();
    expect(result.reason).toContain('unbound');

    const rows = readAllRows();
    expect(rows[0].verdict).toBe('FAIL_CLOSED');
    expect(rows[0].skip_reason).toContain('no same-turn supporting span');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// REJECT via judge
// ═══════════════════════════════════════════════════════════════════════════

describe('claim-bind firewall — judge rejection', () => {
  test('REJECT: judge returns reject verdict on a bound atom', () => {
    const atoms = parseClaimAtoms('32 pass 0 fail ran just now');
    expect(atoms.length).toBeGreaterThan(0);

    const ring: RingSpan[] = [
      { text: 'container-testing: 32 pass 0 fail', ts: '2026-09-21T12:00:00Z' },
    ];

    const result = bindAtoms(atoms, ring, {
      currentTurn: '2026-09-21T12:00:00Z',
      judge: makeRejectJudge(),
    });

    expect(result.verdict).toBe('REJECT');
    expect(result.jev_called).toBe(true);
    expect(result.boundSpan).toBeNull();

    const rows = readAllRows();
    expect(rows[0].verdict).toBe('REJECT');
    expect(rows[0].jev_called).toBe(true);
    expect(rows[0].band).toBe('flag');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// parseClaimAtoms — extraction correctness
// ═══════════════════════════════════════════════════════════════════════════

describe('parseClaimAtoms — extraction', () => {
  test('extracts count atoms from test summaries', () => {
    const text = '32 pass 0 fail 455 tests ran just now';
    const atoms = parseClaimAtoms(text);
    // Must contain at least one count atom with "pass" or "fail".
    const countAtoms = atoms.filter(a => a.kind === 'count');
    expect(countAtoms.length).toBeGreaterThan(0);
    expect(countAtoms.some(a => a.text.includes('pass'))).toBe(true);
    expect(countAtoms.some(a => a.text.includes('fail'))).toBe(true);
  });

  test('extracts status atoms', () => {
    const text = 'the daemon is running and it works';
    const atoms = parseClaimAtoms(text);
    const statusAtoms = atoms.filter(a => a.kind === 'status');
    expect(statusAtoms.length).toBeGreaterThan(0);
  });

  test('returns empty array for empty input', () => {
    expect(parseClaimAtoms('')).toEqual([]);
    expect(parseClaimAtoms('   ')).toEqual([]);
  });

  test('returns empty array for non-claim text', () => {
    const atoms = parseClaimAtoms('the weather is nice today');
    expect(atoms).toEqual([]);
  });
});
