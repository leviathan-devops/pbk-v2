/**
 * skip-classes.test.ts — the pin's "NO SILENT SKIPS" law, swept over all four named classes.
 *
 * The goal pin names exactly four skip conditions: key-less, timeout, cap, provider error. Two were
 * verified elsewhere (`no-key`, `no-answer`). This test covers the other two and asserts the INVARIANT
 * that every branch leaves a ledger row: an unlogged skip is a silent pass.
 *
 * ADVERSARIAL FIRST: the first test is a PROVIDER ERROR (a thrown HTTP failure) — the branch most likely
 * to escape a logger, because exceptions unwind.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kernelJudge, type RubricRule } from "../src/ext/kernel-judge";

function harness(judgeImpl: (rules: RubricRule[]) => Promise<Record<string, number>>) {
  const dir = mkdtempSync(join(tmpdir(), "skipcls-"));
  const rubric = join(dir, "rubric.json");
  const rule: RubricRule = {
    id: "p-rule", text: "x", when: "edit", status: "active",
    check: { type: "model", question: { type: "boolean", instructions: "q" } },
  } as RubricRule;
  writeFileSync(rubric, JSON.stringify({ version: "1", thresholds: { act: 0.8, flag: 0.5 }, rules: [rule] }));
  process.env.ABIDE_DIR = join(dir, ".abide");
  const rows = () => {
    try {
      return readFileSync(join(dir, ".abide", "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
    } catch { return []; }
  };
  const ev = (i: number) => ({
    type: "tool_result", toolName: "write", toolCallId: "s" + i,
    content: [{ type: "text", text: "w" }],
    input: { file_path: "src/x.ts", content: "export const a=1;\n" },
    details: {}, isError: false,
  });
  return { judge: kernelJudge({ rubricPath: rubric, judge: judgeImpl }), rows, ev, cleanup: () => rmSync(dir, { recursive: true, force: true }) };
}

describe("the four skip classes (no silent skips)", () => {
  test("ADVERSARIAL: a PROVIDER ERROR writes a row with skip_reason", async () => {
    const h = harness(async () => { const e = new Error("ECONNRESET"); (e as Error & { code?: string }).code = "HTTP_ERROR"; throw e; });
    try {
      await h.judge.judge(h.ev(1) as never);
      const r = h.rows().at(-1);
      expect(r.band).toBe("skip");
      expect(r.skip_reason).toBe("judge-error");
    } finally { h.cleanup(); }
  });

  test("a TIMEOUT writes a row with skip_reason", async () => {
    const h = harness(() => new Promise((_, rej) => { const e = new Error("aborted"); e.name = "AbortError"; setTimeout(() => rej(e), 50); }));
    try {
      await h.judge.judge(h.ev(2) as never);
      const r = h.rows().at(-1);
      expect(r.band).toBe("skip");
      expect(r.skip_reason).toBe("timeout");
    } finally { h.cleanup(); }
  });

  test("INVARIANT: every branch leaves a row (an unlogged skip is a silent pass)", async () => {
    const h = harness(async () => { throw new Error("boom"); });
    try {
      await h.judge.judge(h.ev(3) as never);
      expect(h.rows().length).toBeGreaterThan(0);
    } finally { h.cleanup(); }
  });
});
