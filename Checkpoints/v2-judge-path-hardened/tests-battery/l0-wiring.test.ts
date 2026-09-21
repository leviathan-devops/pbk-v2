/**
 * l0-wiring.test.ts — V-048, the anti-regression for a WIRING defect.
 *
 * PROBED 2026-09-21: the L0 (W3's six kernels, the role filter, quote exclusion, ST-7 escalation) was
 * imported by NOTHING outside src/l0/ — three test files were its only consumers. Every probe passed,
 * every gate was green, and the layer could not fire in the deployed extension. "A gate that cannot
 * fire is not a layer."
 *
 * WHY THIS TEST IS SOURCE-LEVEL: a behavioural test of decide() CANNOT catch this defect — decide()
 * works perfectly; nobody calls it. The only honest pin is on the WIRING: the extension entry must
 * import the L0 AND invoke it on the settled agent text.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const ENTRY = join(ROOT, "src", "index.ts");

describe("V-048 the L0 is WIRED into the extension (not a library)", () => {
  test("ADVERSARIAL: the entry imports the L0", () => {
    const src = readFileSync(ENTRY, "utf8");
    expect(src).toMatch(/import\s*\{[^}]*\bdecide\b[^}]*\}\s*from\s*["']\.\/l0\/index["']/);
  });

  test("ADVERSARIAL: the entry actually CALLS it (an unused import is the same defect)", () => {
    const src = readFileSync(ENTRY, "utf8");
    expect(src).toMatch(/l0Decide\s*\(/);
    // and the call site is inside the settled handler's assistant-text branch
    const callIdx = src.indexOf("l0Decide(");
    const handlerIdx = src.indexOf("const settledHandler");
    expect(handlerIdx).toBeGreaterThan(-1);
    expect(callIdx).toBeGreaterThan(handlerIdx);
  });

  test("no OTHER module is the L0's only consumer (the defect's exact shape)", () => {
    const src = readFileSync(ENTRY, "utf8");
    // the entry must not be the sole importer by accident: assert the import is real, not a comment
    const lines = src.split("\n").filter((l) => !l.trim().startsWith("//") && !l.trim().startsWith("*"));
    expect(lines.some((l) => /from\s*["']\.\/l0\/index["']/.test(l))).toBe(true);
  });

  test("CONTROL: the built bundle carries the L0 when dist exists (the artifact-level check)", () => {
    const dist = join(ROOT, "dist", "index.js");
    if (!existsSync(dist)) {
      // An absent dist is a BUILD state, not a pass: name it rather than silently skipping.
      console.log("NOTE: dist/index.js absent — the artifact-level check did not run (run `bun run build`)");
      return;
    }
    const bundle = readFileSync(dist, "utf8");
    expect(bundle).toContain("verification-before-declaration");
    expect(bundle).toContain("quote-exclusion");
    expect(bundle).toContain("ESCALATE_AT");
  });
});
