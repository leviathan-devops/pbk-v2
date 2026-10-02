/**
 * misfire-replay.test.ts — the CORPUS'S OWN evidence, replayed as a gate.
 *
 * `ttsr-misfire-failure-log.md` (the design of record) records 8 numbered bugs, each with VERBATIM
 * mechanical evidence — the exact inputs that fired wrongly in V1. `scripts/misfire-replay.mjs` feeds
 * those inputs through the L0 and asserts the two-sided property:
 *
 *   NO FIRING on the documented false positives  ·  FIRING on the declared true positives
 *
 * A layer that never fires is as useless as one that fires on everything, so both sides are gated. This
 * is the strongest available answer to the goal's census condition, because the fixture is not invented
 * here — it is the incident corpus.
 *
 * ADVERSARIAL FIRST: the false positives (the failures that actually happened) are asserted before the
 * true positives.
 */
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const out = execFileSync("bun", ["scripts/misfire-replay.mjs"], { encoding: "utf8", cwd: ROOT });

describe("the misfire replay (the corpus's verbatim evidence, two-sided)", () => {
  test("ADVERSARIAL: every documented false positive stays SILENT", () => {
    // the replay prints PASS/FAIL per case; a single FAIL is a regression in the misfire defences
    expect(out).not.toContain("FAIL ");
    const m = out.match(/VERDICT: (\d+)\/(\d+) documented false positives stayed SILENT/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(m![2]);              // all of them
    expect(Number(m![1])).toBeGreaterThanOrEqual(9);
  });

  test("the true positives still FIRE (a detector that cannot fire is not a layer)", () => {
    const m = out.match(/(\d+)\/(\d+) true positives FIRED/);
    expect(m).not.toBeNull();
    expect(m![1]).toBe(m![2]);
    expect(Number(m![1])).toBeGreaterThanOrEqual(4);
  });

  test("span-resolution is 100% on the replay's own firings", () => {
    expect(out).toContain("SPAN-RESOLUTION 100.0%");
  });

  test("the replay's firing count is BELOW the 27 baseline", () => {
    const m = out.match(/BASELINE 27 · CURRENT (\d+) · BELOW BASELINE: yes/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(27);
  });

  test("the role filter and the quote exclusion are the mechanisms that catch them", () => {
    // the two fired-silently mechanisms must appear in the per-case output, not just the totals
    expect(out).toContain("role-filter");
    expect(out).toContain("quote-exclusion");
  });
});
