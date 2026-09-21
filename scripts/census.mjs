#!/usr/bin/env node
/**
 * census.mjs — the firing census + span-resolution instrument (paragon-v2 W6).
 *
 * WHY: V1 could not be calibrated because 18 of 22 firings left no recoverable text
 * (contextMode:discard deleted the ablated partial; the ledger stored no span). The
 * upgrade's stop condition is measured here: a firing count BELOW the 27 baseline with
 * span-resolution at 100% for every row that asserts a band.
 *
 * USAGE:  node scripts/census.mjs [--ledger <path>] [--json]
 *   default ledger: .abide/events.jsonl
 * EXIT:   0 always (it is a measurement, not a gate) — the GATE reads its output.
 */
import { readFileSync, existsSync } from "node:fs";

const args = process.argv.slice(2);
const jsonOut = args.includes("--json");
const li = args.indexOf("--ledger");
const LEDGER = li !== -1 ? args[li + 1] : ".abide/events.jsonl";
const BASELINE = 27; // measured on V1: 27 behavioral firings

if (!existsSync(LEDGER)) {
  console.log(`CENSUS: no ledger at ${LEDGER} (0 firings recorded)`);
  console.log(`BASELINE: ${BASELINE} · CURRENT: 0 · BELOW BASELINE: yes · SPAN-RESOLUTION: n/a (no rows)`);
  process.exit(0);
}

const rows = readFileSync(LEDGER, "utf8")
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => { try { return JSON.parse(l); } catch { return null; } })
  .filter(Boolean);

const byBand = {};
const byRule = {};
let needSpan = 0, haveSpan = 0, judgeCalls = 0, skips = 0;
for (const r of rows) {
  byBand[r.band] = (byBand[r.band] ?? 0) + 1;
  byRule[r.rule] = (byRule[r.rule] ?? 0) + 1;
  if (r.jev_called) judgeCalls += 1;
  if (r.band === "skip") skips += 1;
  if (r.band === "act" || r.band === "flag") {
    needSpan += 1;
    if (r.matched_span) haveSpan += 1;
  }
}
const resolution = needSpan === 0 ? 1 : haveSpan / needSpan;
const firings = rows.filter((r) => r.band === "act" || r.band === "flag").length;

if (jsonOut) {
  console.log(JSON.stringify({ ledger: LEDGER, total_rows: rows.length, firings, by_band: byBand, by_rule: byRule, judge_calls: judgeCalls, skips, span_resolution: resolution, baseline: BASELINE, below_baseline: firings < BASELINE }, null, 2));
} else {
  console.log(`CENSUS ${LEDGER}`);
  console.log(`  rows ${rows.length} · firings ${firings} · judge_calls ${judgeCalls} · skips ${skips}`);
  console.log(`  bands ${JSON.stringify(byBand)}`);
  console.log(`  SPAN-RESOLUTION ${(resolution * 100).toFixed(1)}% (${haveSpan}/${needSpan} banded rows carry a matched_span)`);
  console.log(`  BASELINE ${BASELINE} · CURRENT ${firings} · BELOW BASELINE: ${firings < BASELINE ? "yes" : "NO"}`);
}
process.exit(0);
