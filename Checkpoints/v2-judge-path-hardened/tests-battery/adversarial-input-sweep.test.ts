/**
 * adversarial-input-sweep.test.ts — the CLASS-LEVEL guard for V-039.
 *
 * V-039 found catastrophic backtracking in ONE regex (`parseClaimAtoms`' status pattern, fixed by
 * bounding the phrase). The right response is not to fix one instance and hope — it is to SWEEP every
 * regex on the agent-text path with pathological input and pin the result.
 *
 * PATHOLOGICAL CLASS (all synchronous, so a stall = a stalled session):
 *   classifyBuffer · parseClaimAtoms · the L0 decide()
 * ADVERSARIAL SHAPES: repeated words · near-misses (the V-039 trigger) · unbalanced fences ·
 * backtick floods · mixed markup · digit floods · path-like strings · CJK+ASCII mixes.
 *
 * ADVERSARIAL FIRST: the first test is the exact V-039 shape and asserts a tight bound.
 */
import { describe, expect, test } from "bun:test";
import { classifyBuffer } from "../src/ledger/events-ledger";
import { parseClaimAtoms } from "../src/ext/claim-bind";
import { decide } from "../src/l0/index";

const SHAPES: Array<[string, string]> = [
  ["repeated words", "word ".repeat(60_000)],
  ["near-miss (V-039)", "the daemon is ".repeat(40_000) + "run"],
  ["long word + claim", "a".repeat(100_000) + " pass"],
  ["unbalanced fences", "```".repeat(20_000)],
  ["backtick flood", "`".repeat(40_000)],
  ["mixed markup", "`code` **bold** ```fence``` ".repeat(8_000)],
  ["digit flood", "0 fail ".repeat(40_000)],
  ["path-like", "src/a/b/c.ts:123 ".repeat(20_000)],
  ["cjk + ascii", "日本語テキスト and ascii ".repeat(20_000)],
];

describe("no regex on the agent-text path degrades (the V-039 class)", () => {
  test("ADVERSARIAL: the V-039 near-miss shape stays under 500ms in the parser", () => {
    const t0 = performance.now();
    parseClaimAtoms("the daemon is ".repeat(40_000) + "run");
    expect(performance.now() - t0).toBeLessThan(500);
  });

  test("the whole sweep: every shape x every path under 1s", () => {
    const paths: Array<[string, (s: string) => unknown]> = [
      ["classifyBuffer", (s) => classifyBuffer(s, "agent")],
      ["parseClaimAtoms", (s) => parseClaimAtoms(s)],
      ["L0 decide", (s) => decide(s, "agent")],
    ];
    let worst = 0;
    let worstAt = "";
    for (const [pname, fn] of paths) {
      for (const [sname, text] of SHAPES) {
        const t0 = performance.now();
        try { fn(text); } catch { /* a throw is acceptable; a stall is not */ }
        const ms = performance.now() - t0;
        if (ms > worst) { worst = ms; worstAt = `${pname}/${sname}`; }
      }
    }
    expect(worst, `slowest: ${worstAt}`).toBeLessThan(1000);
  });
});
