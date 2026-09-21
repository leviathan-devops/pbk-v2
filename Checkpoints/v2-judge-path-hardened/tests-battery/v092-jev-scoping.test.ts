/**
 * v092-jev-scoping.test.ts — the calibration fix, pinned.
 *
 * THE MEASUREMENT (the six-rule × four-kind matrix, run against the live API):
 *   BEFORE: five of six rules FLAT across unrelated file kinds; and `w7-doc-density` — whose own text is
 *           about `.md` files — scored HIGHEST on a `.json` config (0.64) and 0.57 on a `.ts` source.
 *           Spread 0.09. **The rule did not know what a `.md` file is.**
 *   AFTER:  `.ts 0.17 · .md 0.36 · draft 0.44 · .json 0.19` — spread 0.27, and the ORDERING IS CORRECT
 *           (document elevated, non-document suppressed).
 *
 * THE FIX: the state carries the file's KIND, and every question carries the SCOPING clause in §6.20's
 * observation form ("if this question's subject plainly does not apply to a file of that kind, answer
 * false"). A near-constant became a discriminating signal.
 *
 * ADVERSARIAL FIRST: the mapping's discrimination, then the clause's presence on the wire.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileKindOf, kernelJudge } from "../src/ext/kernel-judge";

describe("V-092 the Jev scoping fix", () => {
  test("ADVERSARIAL: the file kind separates a document from a source and a config", () => {
    expect(fileKindOf("BUILD_REPORT.md")).toBe("document");
    expect(fileKindOf("src/example.ts")).toBe("source");
    expect(fileKindOf("config.json")).toBe("config");
    // the three the calibration matrix used are DISTINCT kinds — the premise of the scoping clause
    expect(new Set([fileKindOf("a.md"), fileKindOf("a.ts"), fileKindOf("a.json")]).size).toBe(3);
  });

  test("the kind covers the shapes a real repo carries", () => {
    expect(fileKindOf("x.yaml")).toBe("config");
    expect(fileKindOf("x.py")).toBe("source");
    expect(fileKindOf("x.sqlite")).toBe("data");
    expect(fileKindOf("x.css")).toBe("ui");
    expect(fileKindOf("LICENSE")).toBe("other");
  });

  test("ADVERSARIAL: the request carries the fileKind AND the scoping clause", async () => {
    const realFetch = globalThis.fetch;
    const dir = mkdtempSync(join(tmpdir(), "v092-"));
    process.env.ABIDE_DIR = join(dir, ".abide");
    let body: Record<string, unknown> | null = null;
    globalThis.fetch = (async (_u: string, init: { body: string }) => {
      body = JSON.parse(init.body);
      return { ok: true, status: 200, statusText: "OK", json: async () => ({ answers: { "w-test": { noul: 0.1 } } }) };
    }) as never;
    try {
      const j = kernelJudge({ rubricPath: join(dir, "rubric.json"), apiKey: "k-123456789" });
      const { writeFileSync } = await import("node:fs");
      writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: 0.8, flag: 0.5 },
        rules: [{ id: "w-test", text: "t", when: "edit", status: "active",
          check: { type: "model", question: { type: "boolean", instructions: "Does this document have enough detail?" } } }] }));
      await j.judge({ type: "tool_result", toolName: "write", toolCallId: "s1", content: "w",
        input: { file_path: "BUILD_REPORT.md", content: "x\n" }, sessionId: "s", turnId: "t" } as never);
      const st = (body as unknown as { state: Record<string, unknown> }).state;
      expect(st.fileKind).toBe("document");                       // the kind travels
      const q = (body as unknown as { questions: Record<string, { instructions: string }> }).questions["w-test"];
      expect(q.instructions).toContain("SCOPE:");                 // the clause travels
      expect(q.instructions).toContain("answer false");
      expect(q.instructions).toContain("Does this document have enough detail?"); // the rule's own text survives
    } finally {
      globalThis.fetch = realFetch;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("CONTROL: the judge still bands normally with the clause present", async () => {
    const realFetch = globalThis.fetch;
    const dir = mkdtempSync(join(tmpdir(), "v092b-"));
    process.env.ABIDE_DIR = join(dir, ".abide");
    globalThis.fetch = (async () => ({ ok: true, status: 200, statusText: "OK",
      json: async () => ({ answers: { "w-test": { noul: 0.95 } } }) })) as never;
    try {
      const { writeFileSync } = await import("node:fs");
      writeFileSync(join(dir, "rubric.json"), JSON.stringify({ version: 1, thresholds: { act: 0.8, flag: 0.5 },
        rules: [{ id: "w-test", text: "t", when: "edit", status: "active",
          check: { type: "model", question: { type: "boolean", instructions: "q" } } }] }));
      const j = kernelJudge({ rubricPath: join(dir, "rubric.json"), apiKey: "k-123456789" });
      const r = await j.judge({ type: "tool_result", toolName: "write", toolCallId: "s2", content: "w",
        input: { file_path: "a.md", content: "x\n" }, sessionId: "s", turnId: "t" } as never);
      expect(r.checked).toBe(true);
      expect(r.actAppends).toBe(1);                               // 0.95 still bands act
    } finally {
      globalThis.fetch = realFetch;
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
