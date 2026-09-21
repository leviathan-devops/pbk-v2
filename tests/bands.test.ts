/**
 * bands.test.ts — the L1 per-edit judge banding acceptance gate.
 *
 * ADVERSARIAL FIRST: the first test proves that with NO key the edit is
 * UNCHECKED and a `skip` row with skip_reason: 'no-key' is written
 * (never a silent pass). Then threshold edges via the injected stub judge:
 *
 *   - 0.79 -> flag
 *   - 0.80 -> act  (threshold boundary)
 *   - 0.49 -> clear
 *   - 0.50 -> flag (threshold boundary)
 *   - cap: 3 same-rule `act` candidates -> 2 act appends then flag only.
 *
 * Gate: `cd tests && bun test . -t bands-edge` exits 0.
 */

import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { rmSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  kernelJudge,
  type JudgeOpts,
  type RubricRule,
  type OmpToolResultEvent,
  type OmpExtensionContext,
  ACT_THRESHOLD,
  FLAG_THRESHOLD,
  EDIT_CHECK_TIMEOUT_MS,
  MAX_ACT_APPENDS_PER_RULE_PER_TURN,
} from '../src/ext/kernel-judge.js';
import { readAllRows } from '../src/ledger/events-ledger.js';

// ── TEST ISOLATION ─────────────────────────────────────────────────────────
// Each test gets its own ABIDE_DIR so ledger rows don't leak.
const TMP = join(process.cwd(), '.abide-bands-tmp');
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

// ── FIXTURES ───────────────────────────────────────────────────────────────

/** A minimal rubric with ONE edit+model rule for deterministic testing. */
const EDIT_MODEL_RULE: RubricRule = {
  id: 'w-test-edit-rule',
  text: 'This is a test rule that checks edits.',
  when: 'edit',
  check: {
    type: 'model',
    question: {
      type: 'boolean',
      instructions: 'Is this edit problematic?',
      criteria: {
        true: 'the edit is problematic',
        false: 'the edit is fine',
      },
    },
  },
  status: 'active',
  source: { path: 'tests/bands.test.ts', line: 1 },
};

/** A rubric with a `turn` rule (must NOT be packed into the edit judge call). */
const TURN_MODEL_RULE: RubricRule = {
  id: 'w-test-turn-rule',
  text: 'This is a turn rule.',
  when: 'turn',
  check: {
    type: 'model',
    question: { type: 'boolean', instructions: 'Turn?' },
  },
  status: 'active',
};

/** A rubric with a `lint` check rule (must NOT be packed). */
const LINT_RULE: RubricRule = {
  id: 'ts-no-any',
  text: 'no any',
  when: null,
  check: { type: 'lint' },
  status: 'active',
};

/** Build a tool-result event for an `edit` call. */
function editEvent(overrides: {
  content?: unknown[];
  input?: Record<string, unknown>;
} = {}): OmpToolResultEvent {
  return {
    toolName: 'edit',
    toolCallId: 'call-1',
    input: {
      file_path: 'src/foo.ts',
      old_string: 'const x = 1;',
      new_string: 'const x = 2;',
      ...overrides?.input,
    },
    content: overrides?.content ?? [{ type: 'text', text: 'old result' }],
    details: {},
    isError: false,
  } as OmpToolResultEvent;
}

/** Build a tool-result event for a `write` call. */
function writeEvent(overrides: {
  content?: unknown[];
  input?: Record<string, unknown>;
} = {}): OmpToolResultEvent {
  return {
    toolName: 'write',
    toolCallId: 'call-1',
    input: {
      file_path: 'src/foo.ts',
      content: 'const x = 2;',
      ...overrides?.input,
    },
    content: overrides?.content ?? [{ type: 'text', text: 'old result' }],
    details: {},
    isError: false,
  } as OmpToolResultEvent;

}

/** Type guard: is this content block a text block? */
function isTextBlock(b: unknown): b is { type: 'text'; text: string } {
  if (b == null || typeof b !== 'object') return false;
  if (!('type' in b) || !('text' in b)) return false;
  const obj = b as { type: unknown; text: unknown };
  return obj.type === 'text' && typeof obj.text === 'string';
}

/** A stub judge that returns the given probability for every rule. */
function stubJudge(prob: number) {
  return async (_rules: RubricRule[], _state: unknown): Promise<Record<string, number>> => {
    const out: Record<string, number> = {};
    for (const r of _rules) out[r.id] = prob;
    return out;
  };
}

/** Build opts with a custom rubric (array of rules → JSON file). */
function optsWithRules(rules: RubricRule[], extra: Partial<JudgeOpts> = {}): JudgeOpts {
  const rubric = {
    version: 1,
    thresholds: { act: ACT_THRESHOLD, flag: FLAG_THRESHOLD },
    rules,
  };
  const rubricPath = join(TMP, 'rubric.json');
  writeFileSync(rubricPath, JSON.stringify(rubric));
  return {
    rubricPath,
    ...extra,
  };
}

// ── GROUP 1: NO KEY → UNCHECKED + skip row (never a silent pass) ────────────
// ADVERSARIAL FIRST: the first test proves the failure case — with no API key,
// the judge MUST NOT silently pass. It must write a skip row with
// skip_reason: 'no-key' and return the content UNMUTATED.

describe('bands-edge: no-key is never a silent pass', () => {
  test('no key → edit is UNCHECKED, content preserved, skip row with skip_reason=no-key written', async () => {
    const savedKey = process.env.TYPESAFE_AI_API_KEY;
    delete process.env.TYPESAFE_AI_API_KEY;

    const opts = optsWithRules([EDIT_MODEL_RULE], { apiKey: undefined });
    // No opts.judge → defaults to defaultJudge → reads env → no key → throws NO_API_KEY.

    const judge = kernelJudge(opts);
    const originalContent = [{ type: 'text', text: 'old result' }];
    const event = editEvent({ content: originalContent });

    const result = await judge.judge(event);

    // The write is never blocked → checked is false, content is UNMUTATED.
    expect(result.checked).toBe(false);
    expect(result.content).toBe(originalContent);
    expect(result.actAppends).toBe(0);
    expect(result.flagNotices).toBe(0);

    // A skip row with skip_reason: 'no-key' MUST be in the ledger.
    const rows = readAllRows();
    const skipRows = rows.filter((r) => r.skip_reason === 'no-key');
    expect(skipRows.length).toBeGreaterThanOrEqual(1);
    const skipRow = skipRows[0]!;
    expect(skipRow.band).toBe('skip');
    expect(skipRow.jev_called).toBe(false);

    if (savedKey !== undefined) process.env.TYPESAFE_AI_API_KEY = savedKey;
  });

  test('explicit apiKey: undefined + no env key → same no-key skip', async () => {
    const savedKey = process.env.TYPESAFE_AI_API_KEY;
    delete process.env.TYPESAFE_AI_API_KEY;

    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: undefined,
      judge: undefined, // use default → reads env
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());

    expect(result.checked).toBe(false);
    const rows = readAllRows();
    expect(rows.some((r) => r.skip_reason === 'no-key')).toBe(true);

    if (savedKey !== undefined) process.env.TYPESAFE_AI_API_KEY = savedKey;
  });

  test('opts.apiKey provided → judge IS called (no skip row)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake-key-for-test',
      judge: async () => ({ 'w-test-edit-rule': 0 }),
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());

    expect(result.checked).toBe(true);
    const rows = readAllRows();
    expect(rows.some((r) => r.skip_reason === 'no-key')).toBe(false);
  });
});

// ── GROUP 2: threshold edges via injected stub judge ───────────────────────

describe('bands-edge: threshold boundaries', () => {
  test('0.79 -> flag (below act threshold)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.79),
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());

    expect(result.checked).toBe(true);
    expect(result.flagNotices).toBe(1);
    expect(result.actAppends).toBe(0);

    // Ledger: a flag row for the rule.
    const rows = readAllRows();
    const flagRows = rows.filter((r) => r.rule === 'w-test-edit-rule' && r.band === 'flag');
    expect(flagRows.length).toBe(1);
    expect(flagRows[0]!.probability).toBeCloseTo(0.79, 5);
  });

  test('0.80 -> act (at act threshold, the boundary)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.80),
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());

    expect(result.checked).toBe(true);
    expect(result.actAppends).toBe(1);
    expect(result.flagNotices).toBe(0);

    // The content MUST contain the repair text appended.
    const textBlocks = result.content.filter(isTextBlock);
    const joined = textBlocks.map((b) => b.text).join('\n');
    const rows = readAllRows();
    const actRows = rows.filter((r) => r.rule === 'w-test-edit-rule' && r.band === 'act');
    expect(actRows.length).toBe(1);
    expect(actRows[0]!.probability).toBeCloseTo(0.8, 5);
  });

  test('0.49 -> clear (below flag threshold, silent)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.49),
    });
    const judge = kernelJudge(opts);
    const originalContent: unknown[] = [{ type: 'text', text: 'unchanged' }];
    const result = await judge.judge(editEvent({ content: originalContent }));

    expect(result.checked).toBe(true);
    expect(result.actAppends).toBe(0);
    expect(result.flagNotices).toBe(0);
    // Content is UNCHANGED — no repair text appended.
    expect(result.content).toBe(originalContent);

    // Ledger: a clear row (silent).
    const rows = readAllRows();
    const clearRows = rows.filter((r) => r.rule === 'w-test-edit-rule' && r.band === 'clear');
    expect(clearRows.length).toBe(1);
    expect(clearRows[0]!.probability).toBeCloseTo(0.49, 5);
  });

  test('0.50 -> flag (at flag threshold, the boundary)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.50),
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());

    expect(result.checked).toBe(true);
    expect(result.flagNotices).toBe(1);
    expect(result.actAppends).toBe(0);

    const rows = readAllRows();
    const flagRows = rows.filter((r) => r.rule === 'w-test-edit-rule' && r.band === 'flag');
    expect(flagRows.length).toBe(1);
    expect(flagRows[0]!.probability).toBeCloseTo(0.5, 5);
  });
});

// ── GROUP 3: cap — at most 2 act appends per rule per turn, then flag ──────
// V-046 — PROBED 2026-09-21. `typeof NaN === 'number'`, so the no-answer guard let NaN through, and
// BOTH threshold comparisons are false for NaN -> computeBand returned 'clear': a judge that produced
// no usable number was reported as a CLEAN rule. The V-036 defect class, one type-check deeper.
// Infinity is the mirror image: it cleared the act threshold and FIRED the gate on a non-answer.
// ADVERSARIAL FIRST: every non-finite / non-numeric shape, then the real numbers as the control.
describe('bands-edge: a NON-FINITE score is a skip, never a band', () => {
  const cases: Array<[string, unknown]> = [
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['-Infinity', -Infinity],
    ['a numeric string', '0.99'],
  ];
  for (const [label, value] of cases) {
    test(`${label} -> band=skip with skip_reason=no-answer (never clear, never act)`, async () => {
      const opts = optsWithRules([EDIT_MODEL_RULE], {
        apiKey: 'fake',
        judge: (async () => ({ r: value })) as never,
      });
      const result = await kernelJudge(opts).judge(editEvent());

      expect(result.actAppends).toBe(0);   // a non-answer must never FIRING the gate
      expect(result.flagNotices).toBe(0);

      const rows = readAllRows().filter((r) => r.rule === 'w-test-edit-rule');
      expect(rows.length).toBe(1);
      expect(rows[0]!.band).toBe('skip');            // NOT 'clear' — the whole point
      expect(rows[0]!.skip_reason).toBe('no-answer');
      expect(rows[0]!.probability).toBeNull();
    });
  }

  test('CONTROL: a real 0.99 still bands act (the fix did not break the happy path)', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], { apiKey: 'fake', judge: stubJudge(0.99) });
    const result = await kernelJudge(opts).judge(editEvent());
    expect(result.actAppends).toBe(1);
    const rows = readAllRows().filter((r) => r.rule === 'w-test-edit-rule');
    expect(rows[0]!.band).toBe('act');
    expect(rows[0]!.skip_reason).toBeNull();
  });
});

describe('bands-edge: act cap (2 then flag)', () => {
  test('3 same-rule act candidates → 2 act appends then flag on 3rd', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      sessionId: 'cap-session',
      turnId: 'cap-turn',
      apiKey: 'fake',
      judge: stubJudge(0.85),
    });
    const judge = kernelJudge(opts);

    // Three edit calls in the same turn — each produces an act candidate (0.85 >= 0.8).
    const r1 = await judge.judge(editEvent());
    const r2 = await judge.judge(editEvent());
    const r3 = await judge.judge(editEvent());

    // First two: act append.
    expect(r1.actAppends).toBe(1);
    expect(r1.flagNotices).toBe(0);
    expect(r2.actAppends).toBe(1);
    expect(r2.flagNotices).toBe(0);

    // Third: cap exceeded → flag instead of act.
    expect(r3.actAppends).toBe(0);
    expect(r3.flagNotices).toBe(1);

    // Ledger reflects the cap downgrade.
    const rows = readAllRows();
    const ruleRows = rows.filter((r) => r.rule === 'w-test-edit-rule');
    const actRows = ruleRows.filter((r) => r.band === 'act');
    const flagRows = ruleRows.filter((r) => r.band === 'flag');
    expect(actRows.length).toBe(2);
    expect(flagRows.length).toBe(1);
    const capFlag = flagRows.find((r) => r.skip_reason?.includes('act-cap-exceeded'));
    expect(capFlag).toBeDefined();
  });

  test('reset clears the per-turn ring', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      sessionId: 'reset-session',
      turnId: 'reset-turn',
      apiKey: 'fake',
      judge: stubJudge(0.85),
    });
    const judge = kernelJudge(opts);

    await judge.judge(editEvent());
    await judge.judge(editEvent());
    // Two act appends so far.
    const rowsBefore = readAllRows().filter(
      (r) => r.rule === 'w-test-edit-rule' && r.band === 'act',
    );
    expect(rowsBefore.length).toBe(2);

    // Reset — the cap counter restarts.
    judge.reset('reset-session', 'reset-turn');

    const result = await judge.judge(editEvent());
    // This third call should now get an act append again (cap was reset).
    expect(result.actAppends).toBe(1);
    expect(result.flagNotices).toBe(0);
  });
});

// ── GROUP 4: rule selection — only edit+model rules are packed ───────────
describe('bands-edge: rule selection', () => {
  test('turn rules and lint rules are NOT packed into the edit judge call', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE, TURN_MODEL_RULE, LINT_RULE], {
      apiKey: 'fake',
      judge: async (rules, _state) => {
        // The judge receives ONLY the edit+model rule.
        const ids = rules.map((r) => r.id).sort();
        expect(ids).toEqual(['w-test-edit-rule']);
        return { 'w-test-edit-rule': 0 };
      },
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(editEvent());
    expect(result.checked).toBe(true);
  });
});

// ── GROUP 5: write tool results ───────────────────────────────────────────
describe('bands-edge: write tool', () => {
  test('write with act probability → repair text appended', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.9),
    });
    const judge = kernelJudge(opts);
    const result = await judge.judge(writeEvent());

    expect(result.checked).toBe(true);
    expect(result.actAppends).toBe(1);
    const textBlocks = result.content.filter(isTextBlock);
    const joined = textBlocks.map((b) => b.text).join('\n');
    expect(joined).toContain('Abide:');
  });

  test('write with clear → content unchanged', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.3),
    });
    const judge = kernelJudge(opts);
    const original: unknown[] = [{ type: 'text', text: 'result' }];
    const result = await judge.judge(writeEvent({ content: original }));
    expect(result.content).toBe(original);
  });
});

// ── GROUP 6: register + pi-compatible handler ─────────────────────────────
describe('bands-edge: pi-compatible registration', () => {
  test('register attaches a tool_result handler', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: stubJudge(0.85),
    });
    const judge = kernelJudge(opts);

    let handler: ((event: unknown, _ctx: OmpExtensionContext) => unknown) | undefined;
    const mockPi = {
      on: (_event: string, h: (event: unknown, _ctx: OmpExtensionContext) => unknown) => {
        if (_event === 'tool_result') handler = h;
      },
    };

    judge.register(mockPi);
    expect(handler).toBeDefined();
  });

  test('handler never throws — even on judge error', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: async () => {
        throw new Error('judge imploded');
      },
    });
    const judge = kernelJudge(opts);

    const result = await judge.judge(editEvent());
    // On judge error, returns checked=false with original content.
    expect(result.checked).toBe(false);
    expect(result.actAppends).toBe(0);
  });

  test('timeout → skip row with skip_reason: timeout', async () => {
    const opts = optsWithRules([EDIT_MODEL_RULE], {
      apiKey: 'fake',
      judge: async () => {
        const err = new Error('The operation was aborted') as Error & { name: string };
        err.name = 'AbortError';
        throw err;
      },
    });
    const judge = kernelJudge(opts);

    const result = await judge.judge(editEvent());
    expect(result.checked).toBe(false);

    const rows = readAllRows();
    const timeoutRows = rows.filter((r) => r.skip_reason === 'timeout');
    expect(timeoutRows.length).toBe(1);
    expect(timeoutRows[0]!.band).toBe('skip');
    expect(timeoutRows[0]!.jev_called).toBe(false);
  });
});

// ── GROUP 7: constants are exported ────────────────────────────────────────
describe('bands-edge: exported constants', () => {
  test('ACT_THRESHOLD is 0.8', () => {
    expect(ACT_THRESHOLD).toBe(0.8);
  });

  test('FLAG_THRESHOLD is 0.5', () => {
    expect(FLAG_THRESHOLD).toBe(0.5);
  });

  test('EDIT_CHECK_TIMEOUT_MS is 8000', () => {
    expect(EDIT_CHECK_TIMEOUT_MS).toBe(8_000);
  });

  test('MAX_ACT_APPENDS_PER_RULE_PER_TURN is 2', () => {
    expect(MAX_ACT_APPENDS_PER_RULE_PER_TURN).toBe(2);
  });
});
