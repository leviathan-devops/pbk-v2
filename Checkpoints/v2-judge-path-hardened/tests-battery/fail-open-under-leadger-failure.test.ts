/**
 * fail-open-under-leadger-failure.test.ts — V-044.
 *
 * PROBED 2026-09-21: with an UNWRITABLE ledger directory (a read-only mount, EACCES, ENOSPC), the raw
 * mkdirSync/appendFileSync inside `recordFiring` threw straight out of the judge -> the tool_result
 * handler threw -> the runtime surfaced an EXTENSION ERROR on the agent's own edit.
 *
 * That violates the pin's fail-open law: "The write is never blocked." An audit trail that can break the
 * work it audits has the polarity backwards.
 *
 * FIX: the audit write is guarded; the failure is counted, reported on stderr, and exposed on the
 * result — never swallowed, never thrown.
 *
 * ADVERSARIAL FIRST: the first test makes the ledger unwritable and asserts NO THROW.
 */
import { describe, expect, test } from "bun:test";
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kernelJudge, type RubricRule } from "../src/ext/kernel-judge";
import { recordFiring } from "../src/ledger/events-ledger";

describe("V-044 fail-open holds when the LEDGER cannot be written", () => {
  test("ADVERSARIAL: an unwritable ledger dir does NOT throw out of the judge", async () => {
    const dir = mkdtempSync(join(tmpdir(), "fo-"));
    const ro = join(dir, ".abide");
    const rule: RubricRule = {
      id: "r", text: "x", when: "edit", status: "active",
      check: { type: "model", question: { type: "boolean", instructions: "q" } },
    } as RubricRule;
    writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: "1", thresholds: { act: 0.8, flag: 0.5 }, rules: [rule] }));
    mkdirSync(ro, { recursive: true });
    chmodSync(ro, 0o500); // read+execute only
    process.env.ABIDE_DIR = ro;
    try {
      // must resolve, not reject — the agent's edit must survive a broken audit trail
      const r = await kernelJudge({ rubricPath: join(dir, "rubric.json"), judge: async () => ({ r: 0.99 }) })
        .judge({
          type: "tool_result", toolName: "write", toolCallId: "fo1",
          content: [{ type: "text", text: "w" }],
          input: { file_path: "src/x.ts", content: "export const a=1;\n" },
          details: {}, isError: false,
        } as never);
      expect(r).toBeDefined();
    } finally {
      chmodSync(ro, 0o700);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("recordFiring EXPOSES the failure on the result (never a silent degradation)", () => {
    const dir = mkdtempSync(join(tmpdir(), "fo2-"));
    const ro = join(dir, ".abide");
    mkdirSync(ro, { recursive: true });
    chmodSync(ro, 0o500);
    process.env.ABIDE_DIR = ro;
    try {
      const res = recordFiring({ rule: "r", buffer: "agent-text", band: "skip", probability: null, verdict: "v", jev_called: false, ms: 0, matched_span: null, skip_reason: "probe" });
      expect(res.writeError).toBeTruthy();      // named, not silent
      expect(res.row).toBeDefined();            // the row is still built for the caller
    } finally {
      chmodSync(ro, 0o700);
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("CONTROL: the evidence-destruction guard still THROWS (a span-less act is a real error)", () => {
    expect(() =>
      recordFiring({ rule: "r", buffer: "agent-text", band: "act", probability: 0.9, verdict: "v", jev_called: true, ms: 0, matched_span: null, skip_reason: null }),
    ).toThrow(/matched_span is required/);
  });
});
