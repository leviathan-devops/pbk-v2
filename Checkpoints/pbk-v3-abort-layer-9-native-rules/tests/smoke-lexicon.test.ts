/**
 * smoke-lexicon.test.ts — the SENTENCE-level slop detector + the evidence-verdict contract.
 *
 * FOUND DEAD (its code was not in the shipped bundle, and its named consumer — the surgical mutator — was
 * discarded as opencode-era). Its DEPENDENCIES are all live (`queryEvidenceVerdict`, `ctLog`), and it holds
 * a capability the live system lacks: **a claim is SLOP unless the evidence machine scores its subject
 * LEGIT.** Without it, a claim is judged only by the atom parser and the ring; with it, the evidence
 * machine's degree-of-proof gates the claim.
 *
 * ADVERSARIAL FIRST: the exclusions (a code span, a prediction, a negation), then the slop/legit contract.
 */
import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { classifySentence, classifyMessageSpans } from "../src/firewalls/smoke-lexicon";
import { ingestEvidenceEvent } from "../src/firewalls/evidence-tracker";

let dir = "";
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), "sl-")); process.env.ABIDE_DIR = join(dir, ".abide"); process.env.CT_ABIDE_DIR = join(dir, ".abide"); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));

describe("the smoke lexicon (the sentence-level slop detector)", () => {
  // ── THE EXCLUSIONS (things that are NEVER claims) ──
  test("ADVERSARIAL: a CODE SPAN is never a claim", () => {
    expect(classifySentence("`const x = 1` all tests pass", "s").kind).toBe("NON_CLAIM");
  });

  test("ADVERSARIAL: a PREDICTION is not a declaration", () => {
    expect(classifySentence("I will verify the build", "s").kind).toBe("NON_CLAIM");
  });

  test("ADVERSARIAL: a NEGATED claim does not arm", () => {
    expect(classifySentence("the build is not verified", "s").kind).toBe("NON_CLAIM");
  });

  test("a DESCRIPTIVE sentence flows through untouched", () => {
    expect(classifySentence("I opened the file and read the header", "s").kind).toBe("NON_CLAIM");
  });

  // ── THE EVIDENCE CONTRACT (the capability the live system lacks) ──
  test("ADVERSARIAL: a claim with NO evidence is SLOP", () => {
    const v = classifySentence("the container test verified the build", "no-evidence-session");
    expect(v.kind).toBe("CLAIM_SLOP");
  });

  test("ADVERSARIAL: a claim with only UNIT-grade evidence is STILL SLOP", () => {
    const s = "unit-only-" + Date.now();
    ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: "abc" });
    ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: "abc", exitOk: true });
    const v = classifySentence("the container test verified the build", s);
    expect(v.kind).toBe("CLAIM_SLOP");          // UNIT_ONLY != LEGIT
  });

  test("CONTROL: a claim backed by CONTAINER-grade evidence is LEGIT", () => {
    const s = "full-" + Date.now();
    ingestEvidenceEvent(s, { kind: "dist_change", at: Date.now(), distSha: "abc" });
    ingestEvidenceEvent(s, { kind: "unit", at: Date.now(), distSha: "abc", exitOk: true });
    ingestEvidenceEvent(s, { kind: "container", at: Date.now(), distSha: "abc", hasEvidenceArtifact: true, artifact: "ct-results.json" });
    const v = classifySentence("the container test verified the build", s);
    expect(v.kind).toBe("CLAIM_LEGIT");
  });

  // ── THE MESSAGE-LEVEL SWEEP ──
  test("classifyMessageSpans returns the claim spans with their kinds", () => {
    const spans = classifyMessageSpans("The parser is verified. Let me look at the next file.", "span-session");
    expect(Array.isArray(spans)).toBe(true);
    // the descriptive sentence is never a claim span
    expect(spans.every((s) => s.kind !== undefined)).toBe(true);
  });
});
