/**
 * instrument.test.ts — W6's acceptance: the census measures what the goal's stop
 * condition names (firings below the 27 baseline; span-resolution at 100%).
 *
 * ADVERSARIAL FIRST: the first test proves the instrument REPORTS A GAP — a banded row
 * with no matched_span must drag span-resolution below 100%. An instrument that cannot
 * show a failure is not an instrument.
 */
import { describe, expect, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CENSUS = join(import.meta.dir, "..", "scripts", "census.mjs");

function runCensus(rows: object[]): string {
  const dir = mkdtempSync(join(tmpdir(), "census-"));
  const ledger = join(dir, "events.jsonl");
  writeFileSync(ledger, rows.map((r) => JSON.stringify(r)).join("\n") + "\n");
  return execFileSync("node", [CENSUS, "--ledger", ledger], { encoding: "utf8" });
}

const row = (over: Partial<Record<string, unknown>> = {}) => ({
  ts: "2026-09-21T00:00:00Z", rule: "vbd", buffer: "agent-text", band: "act",
  probability: 0.92, verdict: "bare claim", jev_called: true, ms: 84,
  matched_span: "the task is done", skip_reason: null, ...over,
});

describe("the census instrument", () => {
  test("REPORTS A GAP: a banded row with no span drags resolution below 100%", () => {
    const out = runCensus([row(), row({ band: "flag", matched_span: null })]);
    expect(out).toContain("SPAN-RESOLUTION 50.0%");
  });

  test("a fully spanned ledger reads 100% and below baseline", () => {
    const out = runCensus([row(), row({ band: "flag" })]);
    expect(out).toContain("SPAN-RESOLUTION 100.0%");
    expect(out).toContain("BELOW BASELINE: yes");
  });

  test("the baseline is 27 and is exceeded when it should be", () => {
    const many = Array.from({ length: 30 }, () => row());
    const out = runCensus(many);
    expect(out).toContain("BASELINE 27");
    expect(out).toContain("BELOW BASELINE: NO");
  });

  test("skips are counted but never treated as firings", () => {
    const out = runCensus([row({ band: "skip", matched_span: null, skip_reason: "no-key", jev_called: false })]);
    expect(out).toContain("firings 0");
    expect(out).toContain("skips 1");
  });

  test("an absent ledger is reported, not crashed on", () => {
    const out = execFileSync("node", [CENSUS, "--ledger", "/tmp/does-not-exist-events.jsonl"], { encoding: "utf8" });
    expect(out).toContain("no ledger at");
    expect(out).toContain("CURRENT: 0");
  });

  // V-045 — PROBED 2026-09-21: the absent-ledger case above is guarded by existsSync, but a DIRECTORY
  // at the ledger path (EISDIR) or any unreadable file threw a RAW NODE STACK out of the census. A
  // measurement tool that crashes instead of reporting is the same failure class as the silent drop
  // (V-038): it fails to measure and says nothing useful. An unreadable ledger is a FINDING.
  test("ADVERSARIAL: a DIRECTORY at the ledger path is reported, never a raw crash", () => {
    const dir = mkdtempSync(join(tmpdir(), "census-eisdir-"));
    const out = execFileSync("node", [CENSUS, "--ledger", dir], { encoding: "utf8" });
    expect(out).toContain("cannot read the ledger");
    expect(out).toContain("EISDIR");
    expect(out).not.toContain("Node.js v");        // no stack dump
    expect(out).toContain("n/a (no readable ledger)");
  });

  test("CONTROL: a garbage line is COUNTED as unparseable, never silently dropped", () => {
    const dir = mkdtempSync(join(tmpdir(), "census-garbage-"));
    const ledger = join(dir, "events.jsonl");
    writeFileSync(ledger, JSON.stringify(row()) + "\ngarbage{{{\n");
    const out = execFileSync("node", [CENSUS, "--ledger", ledger], { encoding: "utf8" });
    expect(out).toContain("UNPARSEABLE LINES 1");
    expect(out).toContain("SPAN-RESOLUTION 100.0%");
  });
});
