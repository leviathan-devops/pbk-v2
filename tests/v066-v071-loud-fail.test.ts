/**
 * v066-v071-loud-fail.test.ts — the operator's law: **LOUD FAIL OR CLEAR PASS. NO STUBS. NO UNAUTHORIZED
 * FALLBACKS.**
 *
 * Six findings produced this file, all measured against the REAL API and a REAL omp session:
 *   V-066 the keyless state was a quiet skip          -> an UNAVAILABLE row + a loud stderr line
 *   V-067 the remedy the error named did not work     -> resolveApiKey() reads ~/.abide/.env
 *   V-068 the API primitive is `noul`, not `boolean`  -> a 400 became a 200
 *   V-069 the answer field is `noul`, not `probability` -> a silent all-unanswered result prevented
 *   V-070 the claim judge had the same silent-null defect -> fixed
 *   V-071 a missing rubric was also a quiet skip      -> named with its remedy
 *
 * ADVERSARIAL FIRST: the failure states (no key, no rules) run before the mapping's happy path.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kernelJudge, toApiPrimitive, ACT_THRESHOLD, FLAG_THRESHOLD, type RubricRule } from "../src/ext/kernel-judge";

let dir = "";
const editEvent = () => ({
  type: "tool_result", toolName: "write", toolCallId: "v1",
  content: [{ type: "text", text: "old" }],
  input: { file_path: "src/x.ts", content: "export const a = 1;\n" },
  sessionId: "v", turnId: "t",
} as never);
const rowsOf = () => readFileSync(join(dir, ".abide", "events.jsonl"), "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
// the REAL rule shape (measured from .abide/rubric.json): check.type is 'model'; the QUESTION's type is
// the primitive's name ('boolean' in the rubric vocabulary).
const rule = (): RubricRule => ({ id: "w-test", text: "t", when: "edit", status: "active",
  check: { type: "model", question: { type: "boolean", instructions: "q" } } } as never);

beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "loud-")); process.env.ABIDE_DIR = join(dir, ".abide"); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("V-066…V-071 · LOUD FAIL OR CLEAR PASS", () => {
  // ── the failure states first ──
  test("V-066: no key -> the row says the LAYER IS DOWN (never a bare 'no-key')", async () => {
    writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: ACT_THRESHOLD, flag: FLAG_THRESHOLD }, rules: [rule()] }));
    const r = await kernelJudge({ rubricPath: join(dir, "rubric.json"), apiKey: "" }).judge(editEvent());
    expect(r.checked).toBe(false);
    const row = rowsOf().find((x) => x.skip_reason?.startsWith("judge-unavailable"));
    expect(row).toBeDefined();
    expect(row.skip_reason).toBe("judge-unavailable:no-key");
    expect(String(row.verdict)).toContain("JUDGE UNAVAILABLE");
    expect(String(row.verdict)).toContain("NOT judged");
  });

  test("V-071: a rubric with no edit+model rules -> the row NAMES the path it looked at", async () => {
    writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: ACT_THRESHOLD, flag: FLAG_THRESHOLD }, rules: [] }));
    const r = await kernelJudge({ rubricPath: join(dir, "rubric.json") }).judge(editEvent());
    expect(r.checked).toBe(false);
    const row = rowsOf().find((x) => x.skip_reason?.startsWith("judge-unavailable"));
    expect(row).toBeDefined();
    expect(row.skip_reason).toBe("judge-unavailable:no-model-rules");
    expect(String(row.verdict)).toContain("rubric.json");   // the path it looked at
    expect(String(row.verdict)).toContain("NOT judged");
  });

  // ── V-068's mapping, both directions ──
  test("V-068: the rubric's vocabulary maps to the API's primitives", () => {
    expect(toApiPrimitive("boolean")).toBe("noul");   // the measured 400 -> 200 fix
    expect(toApiPrimitive("noul")).toBe("noul");
    expect(toApiPrimitive("choice")).toBe("choice");
    expect(toApiPrimitive("score")).toBe("score");
    expect(toApiPrimitive(undefined)).toBe("noul");   // never an invalid type on the wire
  });

  // ── V-069: the answer field ──
  test("V-069: an answer carrying `noul` (the real field) is READ — the fabricated-verdict class", async () => {
    const realFetch = globalThis.fetch;
    writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: ACT_THRESHOLD, flag: FLAG_THRESHOLD }, rules: [rule()] }));
    globalThis.fetch = (async () => ({ ok: true, status: 200, statusText: "OK",
      json: async () => ({ model: "jev-1.13.0", answers: { "w-test": { type: "noul", noul: 0.91 } } }) })) as never;
    try {
      const r = await kernelJudge({ rubricPath: join(dir, "rubric.json"), apiKey: "k-123456789" }).judge(editEvent());
      expect(r.checked).toBe(true);
      expect(r.actAppends).toBe(1);                       // 0.91 >= 0.8 -> act, read from `.noul`
      const row = rowsOf().find((x) => x.rule === "w-test");
      expect(row.probability).toBeCloseTo(0.91, 5);
      expect(row.jev_called).toBe(true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  test("V-069 CONTROL: an answer with NO usable field is a NAMED skip, never a fabricated clear", async () => {
    const realFetch = globalThis.fetch;
    writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: ACT_THRESHOLD, flag: FLAG_THRESHOLD }, rules: [rule()] }));
    globalThis.fetch = (async () => ({ ok: true, status: 200, statusText: "OK",
      json: async () => ({ answers: {} }) })) as never;   // an empty answers map
    try {
      const r = await kernelJudge({ rubricPath: join(dir, "rubric.json"), apiKey: "k-123456789" }).judge(editEvent());
      expect(r.checked).toBe(true);
      expect(r.actAppends).toBe(0);
      const row = rowsOf().find((x) => x.rule === "w-test");
      expect(row.skip_reason).toBe("no-answer");           // NAMED, not a silent clear
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});
