/**
 * doc-density-v2-detectors.test.ts — the orphaned v2 gate's detectors, and V-065's inflection fix.
 *
 * WHY THIS MODULE IS WORTH TESTING EVEN THOUGH IT IS NOT WIRED: its header names the class the live 78-line
 * gate cannot catch — *"a 3000-line document of restated boilerplate passes v1"*. That is the pin's own
 * named violation ("a doc padded to a line floor"). It stays an orphan until the wiring is decided, but its
 * DETECTORS are the part that has to be right first, so they are pinned here.
 *
 * V-065 (measured before the fix): `detectAnchorlessClaims`'s verb test listed bare stems with `\b…\b`
 * boundaries, so it matched `implements`/`handles`/`verif` but not `implemented`, `verified`, `enforced`,
 * `dispatched`, `parsed`, `blocked`, `writes`, `returns`, `handling`. **12 of 36 common forms measured
 * missed** — and past-tense engineering prose is the most common register in a report, so the detector
 * under-counted exactly the paragraphs it exists for. Each stem now carries its inflections.
 *
 * ADVERSARIAL FIRST: the anchorless paragraph (the class it must catch) before the anchored control.
 */
import { describe, expect, test } from "bun:test";
import {
  detectAnchorlessClaims, detectRepeatedParagraphs, detectFillerDensity,
  detectMissingHierarchy, detectPlaceholderDebris, computeSlop, classifyDocType, DOC_FLOORS,
} from "../src/middleware/doc-density-gate-v2";

describe("doc-density v2 detectors", () => {
  // ── V-065: the inflection fix, both directions ──
  test("ADVERSARIAL: the verb test catches EVERY common inflection (V-065)", () => {
    const FORMS = [
      "implements", "implement", "implemented", "handles", "handle", "handled", "handling",
      "verified", "verifies", "verifying", "verification", "enforce", "enforced", "enforcement",
      "dispatch", "dispatched", "parses", "parse", "parsed", "blocked", "blocking",
      "writes", "write", "written", "writing", "returns", "returned", "loads", "loaded",
      "routed", "routes", "route", "allows", "allowing", "reads", "reading",
    ];
    // Each form must be recognised as an engineering verb: give it an anchor-free paragraph and expect it
    // to be COUNTED (appearing in the evidence as a non-zero total).
    const missed: string[] = [];
    for (const f of FORMS) {
      const r = detectAnchorlessClaims(`The component ${f} the payload before the write is committed.`);
      const m = r.evidence.match(/(\d+)\/(\d+)/);
      if (!m || Number(m[2]) === 0) missed.push(f);
    }
    expect(missed).toEqual([]);
  });

  test("ADVERSARIAL: no false positives — non-verbs are not counted as engineering verbs", () => {
    for (const w of ["container", "manifest", "evidence", "scenario", "parser", "loader"]) {
      const r = detectAnchorlessClaims(`The ${w} is a plain noun in this sentence.`);
      const m = r.evidence.match(/(\d+)\/(\d+)/);
      expect(m ? Number(m[2]) : 0).toBe(0);
    }
  });

  test("the ANCHORED control: a paragraph carrying a file:line is not counted anchorless", () => {
    const r = detectAnchorlessClaims("The handler enforces the schema, measured at src/foo.ts:118.");
    const m = r.evidence.match(/(\d+)\/(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBe(0); // zero anchorless
  });

  // ── the other detectors, each on the class its header names ──
  test("TOILET-1: repeated paragraphs are counted (the class a line floor rewards)", () => {
    const para = "This module provides a comprehensive solution for the workflow. It is important to note that correctness is ensured across all scenarios.";
    const r = detectRepeatedParagraphs(Array(40).fill(para).join("\n\n"));
    expect(r.hits).toBeGreaterThan(30);
  });

  test("TOILET-2: marketing filler is counted", () => {
    const r = detectFillerDensity(Array(30).fill("a cutting-edge best-in-class seamless robust solution").join("\n\n"));
    expect(r.hits).toBeGreaterThan(50);
  });

  test("TOILET-4: a structureless wall is flagged, a two-heading doc is not", () => {
    expect(detectMissingHierarchy(Array(80).fill("prose without headings").join("\n")).hits).toBe(1);
    expect(detectMissingHierarchy("# Title\n\n## Section\n\nbody").hits).toBe(0);
  });

  test("TOILET-5: placeholder debris is counted", () => {
    const r = detectPlaceholderDebris(Array(20).fill("TODO: fill this in later.").join("\n\n"));
    expect(r.hits).toBeGreaterThan(10);
  });

  // ── the composite + the floor semantics ──
  test("computeSlop separates a padded doc from a dense one (the BLOCK-QUALITY line)", () => {
    const padded = computeSlop(Array(40).fill("This module provides a comprehensive holistic solution. It is important to note correctness.").join("\n\n"));
    const dense = computeSlop(Array(30).fill("## Section\n\nMeasured at src/foo.ts:118 — 3 pass / 0 fail; the defect class is recorded.").join("\n\n"));
    expect(padded.slopScore).toBeGreaterThanOrEqual(40);   // the documented BLOCK-QUALITY threshold
    expect(dense.slopScore).toBeLessThan(40);
  });

  test("the floors are declared per doc type (v2's enum is UPPERCASE, unlike the live v1 gate's)", () => {
    expect(DOC_FLOORS.SPEC).toBe(3000);
    expect(DOC_FLOORS.REPORT).toBe(500);
    expect(classifyDocType("SPEC_X.md")).toBe("SPEC");
    expect(classifyDocType("BUILD_REPORT.md")).toBe("REPORT");
  });
});
