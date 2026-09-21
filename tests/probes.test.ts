/**
 * probes.test.ts — the six-probe acceptance instrument (Paragon V2 §6 instrument 1).
 *
 * This is the regression gate for the L0 ISE port: the six probes that no
 * regex-only alternative can satisfy. Each probe has a verbatim input + a
 * required verdict. ADVERSARIAL FIRST: the failure cases precede the happy path.
 *
 * The six probes map to the six parked kernels rebuilt into typed L0 members:
 *   P1 ("the task is done")                         -> FIRES (verification-before-declaration)
 *   P2 ("the manifest records what is not verified") -> SILENT (polarity/gap-record)
 *   P3 (past-tense status token)                    -> SILENT (mention/past-tense)
 *   P4 (quoted trigger list)                        -> SILENT (USE/MENTION blindness)
 *   T4 (naming the close interface)                 -> SILENT (mention, not an act)
 *   T7 ("32 pass 0 fail ran just now")              -> PASSES (claim bound to evidence)
 *
 * The decide() function:
 *   1. classifies the buffer via classifyBuffer (WO-1 role filter) — host
 *      envelopes + quoted regions SKIP before any matcher runs
 *   2. runs L0_MEMBERS in priority order — matcher DETECTS, triggerCondition DECIDES
 *   3. returns { kind: 'act'|'flag'|'clear'|'skip', ... }
 *
 * Verdict vocabulary:
 *   FIRES  = kind: 'act'       (the bare claim without evidence — REFUSE)
 *   SILENT = kind: 'skip'|'clear'  (no violation — polarity, mention, quote, gap)
 *   PASSES = kind: 'clear' + evidenceBound: true  (claim bound to real evidence)
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { decide, L0_MEMBERS } from '../src/l0/index.js';

// ── Test isolation ─────────────────────────────────────────────────────────
// Each test needs a fresh ABIDE_DIR so recordFiring rows don't leak.
const TMP = join(process.cwd(), '.abide-probes-tmp');
let realAbide: string | undefined;

beforeEach(() => {
  realAbide = process.env.ABIDE_DIR;
  process.env.ABIDE_DIR = TMP;
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

afterEach(() => {
  process.env.ABIDE_DIR = realAbide;
  if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
});

// ── Six-probe acceptance (the regression gate) ──────────────────────────────
// ADVERSARIAL FIRST: the failure cases (false-positive) come before the happy
// path (true-positive / true-negative). The ordering is the instrument.

describe('L0 probe-l0 acceptance — the six-probe regression gate no regex can fake', () => {
  // ── P1: a bare claim, nothing run this session -> FIRES ──────────────────
  // The verification-before-declaration kernel. "the task is done" — present
  // tense, work entity ("task"), no negation, no evidence. This is the ONLY
  // real claim in the probe set. It MUST fire.
  test('P1: a bare claim, nothing run -> FIRES (verification-before-declaration)', () => {
    const v = decide('the task is done');
    expect(v.kind).toBe('act');
    expect(v.rule).toBe('verification-before-declaration');
    expect(v.matchedSpan).not.toBeNull();
    expect(v.skipReason).toBeNull();
  });

  // ── P2: "the manifest records what is not verified" -> SILENT ─────────────
  // The VBD matcher hits "verified" but the triggerCondition's gap-record +
  // negation guard suppresses it. This is the polarity law (§5.6).
  test('P2: a gap record ("the manifest records what is not verified") -> SILENT (polarity)', () => {
    const v = decide('the manifest records what is not verified');
    expect(v.kind).not.toBe('act');
    expect(v.kind).toBe('clear');
    // VBD matcher hit "verified" but triggerCondition suppressed it.
    expect(v.rule).toBe('verification-before-declaration');
    expect(v.matchedSpan).not.toBeNull();
    expect(v.evidenceBound).toBe(false);
  });

  // ── P3: a past-tense status token -> SILENT ──────────────────────────────
  // "### bg_25 [bash] - completed" — VBD matcher hits "completed" but
  // past-tense indicates REPORTING, not ASSERTING. The triggerCondition's
  // past-tense guard suppresses it. This is the mention law (§5.5).
  test('P3: a past-tense status token -> SILENT (mention, not assertion)', () => {
    const v = decide('### bg_25 [bash] - completed');
    expect(v.kind).not.toBe('act');
    expect(v.kind).toBe('clear');
    expect(v.rule).toBe('verification-before-declaration');
    expect(v.matchedSpan).not.toBeNull();
  });

  // ── P4: quoting a kernel's trigger list -> SILENT ────────────────────────
  // "The detector matched: `done` `complete` `verified`" — the text contains
  // claim words INSIDE backticks (inline code). classifyBuffer classifies this
  // as 'quoted' -> decide() returns SKIP before ANY matcher runs. This is the
  // USE/MENTION blindness law (§5.5) — incident class B.
  test('P4: a quoted trigger list -> SILENT quote-exclusion (quoted region, not agent voice)', () => {
    const v = decide('The detector matched: `done` `complete` `verified`');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('quote-exclusion');
    expect(v.matchedSpan).toBeNull();
  });

  // ── T4: naming the close interface -> SILENT ─────────────────────────────
  // "the claim firewall intercepts goal.complete" — this NAMED an interface
  // (goal.complete), it did not GUESS a dependency or edit structural code.
  // No matcher hits -> SILENT.
  test('T4: naming the close interface -> SILENT (mention, not an act)', () => {
    const v = decide('the claim firewall intercepts goal.complete');
    expect(v.kind).not.toBe('act');
    expect(v.kind).not.toBe('flag');
    expect(v.kind).toBe('clear');
    expect(v.rule).toBe('l0-decide');
    expect(v.matchedSpan).toBeNull();
  });

  // ── T7: "32 pass 0 fail ran just now" -> PASSES ───────────────────────────
  // The red-team-default matcher hits ("pass 0 fail") but the triggerCondition
  // sees EVIDENCE tokens ("ran just now", the count) -> the claim is bound to
  // a span -> PASSES.
  test('T7: "32 pass 0 fail ran just now" -> PASSES (claim bound to evidence)', () => {
    const v = decide('32 pass 0 fail ran just now');
    expect(v.kind).toBe('clear');
    expect(v.rule).toBe('red-team-default');
    expect(v.matchedSpan).not.toBeNull();
    expect(v.evidenceBound).toBe(true);
  });
});

// ── Role filter (WO-1 + WO-2) ───────────────────────────────────────────────
// Host envelopes never reach detectors. Quoted regions never reach detectors.

describe('L0 role filter — host envelopes + quoted regions never reach detectors', () => {
  test('a <system-notice> envelope -> SILENT (host-envelope, WO-1)', () => {
    const text = '<system-notice> xd:// device inventory changed. Available tools.</system-notice>';
    const v = decide(text, 'host');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('role-filter');
  });

  test('a <system-reminder> envelope -> SILENT (host-envelope, WO-1)', () => {
    const text = '<system-reminder> 3 todo items still open. Mark it done now.</system-reminder>';
    const v = decide(text, 'host');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('role-filter');
  });

  test('a <task-result> envelope -> SILENT (host-envelope, WO-1)', () => {
    const text = '<task-result id="HandoverCtx" agent="scout" status="completed">result data</task-result>';
    const v = decide(text, 'host');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('role-filter');
  });

  test('MCP envelope (xd:// prefix) -> SILENT (host-envelope, WO-1)', () => {
    const text = 'xd://mcp__serena_get_symbols_overview returned 42 symbols';
    const v = decide(text, 'tool');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('role-filter');
  });

  test('fenced code block -> SILENT (quoted, WO-2)', () => {
    const text = 'The kernel matched:\n```\nthe task is done\n```\nwhich is a quotation.';
    const v = decide(text, 'agent');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('quote-exclusion');
  });

  test('inline code span -> SILENT (quoted, WO-2)', () => {
    const text = 'The word `done` appears in the text.';
    const v = decide(text, 'agent');
    expect(v.kind).toBe('skip');
    expect(v.rule).toBe('quote-exclusion');
  });

  test('plain agent text with a claim word -> FIRES (not host, not quoted)', () => {
    const text = 'the task is done and verified';
    const v = decide(text, 'agent');
    expect(v.kind).toBe('act');
    expect(v.rule).toBe('verification-before-declaration');
  });
});

// ── The six kernels are present as typed members ────────────────────────────

describe('L0 member registry — the six kernels as typed members', () => {
  test('exactly six members are registered', () => {
    expect(L0_MEMBERS).toHaveLength(6);
  });

  test('each member has all required fields (the typed record shape)', () => {
    for (const m of L0_MEMBERS) {
      expect(m.id).toBeTruthy();
      expect(m.kind).toBeTruthy();
      expect(typeof m.matcher).toBe('function');
      expect(typeof m.triggerCondition).toBe('function');
      expect(m.severity).toBeTruthy();
      expect(m.messageTemplate).toBeTruthy();
      expect(m.remediationHook).toBeTruthy();
    }
  });

  test('member ids match the six parked kernel names', () => {
    const ids = L0_MEMBERS.map((m) => m.id).sort();
    expect(ids).toEqual([
      'anti-scope-shrink',
      'anti-theatrical',
      'basic-logic-check',
      'graph-before-structural-edit',
      'red-team-default',
      'verification-before-declaration',
    ].sort());
  });

  test('the regex may DETECT but never DECIDE — matchers return span or null', () => {
    for (const m of L0_MEMBERS) {
      const result = m.matcher('hello world');
      expect(result === null || typeof result === 'string').toBe(true);
    }
  });
});
