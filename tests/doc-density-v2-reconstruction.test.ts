/**
 * doc-density-v2-reconstruction.test.ts — V-082, the three spine-level defects, pinned.
 *
 * FOUND by an ocr CRITICAL and verified by reading the code. The module's HEADLINE CLAIM is "the gate judges
 * the file AFTER the write/edit lands, never the single write" — and all three defects made that false:
 *
 *   (a) `isEdit` required `content.length === 0`, but the wrapper passes the patch's newString — so `isEdit`
 *       was false for EVERY real call and the post-state was the SNIPPET;
 *   (b) the post-state never APPLIED the patch, so chunked edits could not accumulate;
 *   (c) `isFinalize` was ALWAYS TRUE, so the DRAFT path was unreachable and the remedy the gate's own
 *       message offers ("write the skeleton as a draft, then chunk-edit…, then finalize") was impossible.
 *
 * ADVERSARIAL FIRST: the chunk-accumulation case the defect broke, then the controls.
 */
import { describe, expect, test } from "bun:test";
import { evaluateDocDensityV2, DOC_COMPLETE_MARKER, DRAFT_MIN_LINES } from "../src/middleware/doc-density-gate-v2";

const body = (n: number) => Array.from({ length: n }, (_, i) => `line ${i} of the document body`).join("\n");

describe("V-082 the post-state reconstruction", () => {
  test("ADVERSARIAL: a chunk EDIT ACCUMULATES onto the existing file (the headline claim)", () => {
    // existing = 150 lines; the edit appends 150 more -> the post-state is 301 lines -> ABOVE the floor
    const lines = Array.from({ length: 150 }, (_, i) => `line ${i} of the document body`);
    const existing = lines.join("\n");
    const lastLine = lines[lines.length - 1];
    // a REAL append edit: oldString = the file's last line, newString = that line + the new chunk
    const chunk = Array.from({ length: 150 }, (_, i) => `appended ${i}`).join("\n");
    const v = evaluateDocDensityV2({ filePath: "BUILD_REPORT.md", content: `${lastLine}\n${chunk}`, existing, oldString: lastLine });
    expect(v.evidence.lines).toBeGreaterThan(250);   // the ACCUMULATED state, never the 150-line snippet
  });

  test("ADVERSARIAL: the DRAFT path is REACHABLE — an edit WITHOUT the marker is not a finalize", () => {
    const v = evaluateDocDensityV2({ filePath: "BUILD_REPORT.md", content: body(60), existing: body(60) });
    expect(v.evidence.isFinalize).toBe(false);       // was ALWAYS true before the fix
  });

  test("ADVERSARIAL: an edit whose patch is APPLIED reflects the replacement", () => {
    const existing = "DRAFT\n" + body(30) + "\nPLACEHOLDER_LINE";
    const v = evaluateDocDensityV2({ filePath: "SPEC_X.md", content: "a real line of content", existing, oldString: "PLACEHOLDER_LINE" });
    expect(v.evidence.lines).toBeGreaterThan(30);    // the file WITH the patch, not the replacement alone
  });

  test("CONTROL: a whole-file WRITE (a create) is a finalize and is judged against the floor", () => {
    const v = evaluateDocDensityV2({ filePath: "SPEC_X.md", content: body(10) });
    expect(v.evidence.isFinalize).toBe(true);
    expect(v.action).toBe("block");                  // 10 lines against the SPEC floor
  });

  test("CONTROL: an edit that ADDS the marker finalizes", () => {
    const existing = body(10);
    const tail = existing.split("\n").at(-1) as string;
    const v = evaluateDocDensityV2({ filePath: "SPEC_X.md", content: `${tail}\n${DOC_COMPLETE_MARKER}`, existing, oldString: tail });
    expect(v.evidence.isFinalize).toBe(true);
  });

  test("CONTROL: a DRAFT-marked document takes the draft path", () => {
    const v = evaluateDocDensityV2({ filePath: "SPEC_X.md", content: `DRAFT — ${body(25)}` });
    expect(v.evidence.isDraft).toBe(true);
    expect(v.evidence.isFinalize).toBe(false);
  });

  test("CONTROL: a draft under the sanity floor is blocked with the chunking remedy", () => {
    const v = evaluateDocDensityV2({ filePath: "SPEC_X.md", content: `DRAFT — ${body(3)}` });
    expect(v.action).toBe("block");
    expect(v.reason).toContain(String(DRAFT_MIN_LINES));
    expect(v.reason).toContain("chunk-edit");        // the remedy is now FOLLOWABLE
  });
});
