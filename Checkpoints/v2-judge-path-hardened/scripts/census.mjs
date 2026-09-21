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

let unparseable = 0;
// V-045: a DIRECTORY at the ledger path (EISDIR) or an unreadable file threw a raw node stack out of
// the census. A measurement tool that crashes instead of REPORTING is the same failure class as the
// silent drop (V-038): it fails to measure and says nothing useful. An unreadable ledger is a FINDING
// ("there is no ledger here"), not a crash.
let ledgerText = "";
try {
  ledgerText = readFileSync(LEDGER, "utf8");
} catch (e) {
  const reason = e && e.code ? e.code : String(e && e.message);
  console.log(`CENSUS: cannot read the ledger at ${LEDGER} (${reason}) — reported, not crashed.`);
  console.log(`BASELINE: ${BASELINE} · CURRENT: 0 · BELOW BASELINE: n/a (no readable ledger)`);
  process.exit(0);
}

const rows = ledgerText
  .split("\n")
  .filter((l) => l.trim())
  .map((l) => { try { return JSON.parse(l); } catch { unparseable += 1; return null; } })
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
  console.log(JSON.stringify({ ledger: LEDGER, total_rows: rows.length, unparseable, firings, by_band: byBand, by_rule: byRule, judge_calls: judgeCalls, skips, span_resolution: resolution, baseline: BASELINE, below_baseline: firings < BASELINE }, null, 2));
} else {
  console.log(`CENSUS ${LEDGER}`);
  console.log(`  rows ${rows.length} · firings ${firings} · judge_calls ${judgeCalls} · skips ${skips}`);
  // V-038: an instrument that DROPS unparseable rows reports a clean ledger that is not one.
  if (unparseable > 0) console.log(`  UNPARSEABLE LINES ${unparseable}  <- rows the census could not read (never silently dropped)`);
  console.log(`  bands ${JSON.stringify(byBand)}`);
  console.log(`  SPAN-RESOLUTION ${(resolution * 100).toFixed(1)}% (${haveSpan}/${needSpan} banded rows carry a matched_span)`);
  console.log(`  BASELINE ${BASELINE} · CURRENT ${firings} · BELOW BASELINE: ${firings < BASELINE ? "yes" : "NO"}`);
}
process.exit(0);
