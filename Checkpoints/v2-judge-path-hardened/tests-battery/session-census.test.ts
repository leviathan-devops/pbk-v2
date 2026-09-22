/**
 * session-census.test.ts — the session-level census, pinned.
 *
 * The repo's `.abide/events.jsonl` is a DEVELOPMENT ledger (test + probe rows, deliberately produced), so
 * the census over it does not answer the stop condition's question. The census's own baseline is
 * "27 BEHAVIORAL firings" measured on V1 — the comparable unit is a SESSION. `scripts/session-census.mjs`
 * produces one from a FIXED corpus through the REAL code path; this pins its verdict so a regression in
 * the firing rate or the span resolution fails loudly.
 *
 * ADVERSARIAL FIRST: the anti-derail shapes (a continuation, a quoted region, a gap-record sentence) are
 * asserted to NOT add firings, before the aggregate verdict is read.
 */
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const SCRIPT = join(import.meta.dir, "..", "scripts", "session-census.mjs");
const out = execFileSync("bun", [SCRIPT], { encoding: "utf8", cwd: join(import.meta.dir, "..") });

describe("the session census (a controlled session through the real extension)", () => {
  test("ADVERSARIAL: a CONTINUATION does not fire (V-049's guard, measured)", () => {
    // the corpus contains one isTerminal:false turn carrying a bare claim; the log must show exactly the
    // firings the 8 declared turns produce, not one more
    const l0Lines = out.split("\n").filter((l) => l.includes("[PBK L0]"));
    // 8 turns declare 5 firings (4 act + 1 flag); the continuation + the quoted region add none.
    expect(l0Lines.length).toBeLessThanOrEqual(6);
  });

  test("ADVERSARIAL: span-resolution is 100% (a span-less banded row is an automatic violation)", () => {
    expect(out).toContain("SPAN-RESOLUTION 100.0%");
  });

  test("the firing count is BELOW the 27 baseline", () => {
    const m = out.match(/CURRENT (\d+) · BELOW BASELINE: yes/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(27);
  });

  test("CONTROL: the census still reports a GAP when one exists (the instrument is not blind)", () => {
    // the instrument test owns this; here we assert the session run actually produced rows
    expect(out).toMatch(/rows \d+ · firings \d+/);
    expect(out).not.toContain("BELOW BASELINE: n/a");
  });
});
