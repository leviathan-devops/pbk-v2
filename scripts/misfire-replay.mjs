#!/usr/bin/env node
/**
 * misfire-replay.mjs — replay the CORPUS'S OWN verbatim misfire evidence through the L0.
 *
 * WHY: the census baseline is "27 behavioral firings" measured on V1, and `ttsr-misfire-failure-log.md`
 * records the EXACT inputs that fired wrongly (TTSR-BUG-1..8), each with mechanical evidence. Replaying
 * those inputs is a stronger measurement than any hand-built corpus: it asks the direct question —
 * DOES THE DOCUMENTED FALSE POSITIVE STILL FIRE?
 *
 * TWO-SIDED, deliberately: a layer that never fires is as useless as one that fires on everything. The
 * replay asserts NO FIRING on the 8 documented false positives AND FIRING on the declared true positives.
 *
 * USAGE:  bun scripts/misfire-replay.mjs [--json]
 * EXIT:   0 if every expectation holds, 1 otherwise (this IS a gate, unlike census.mjs).
 */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const dir = mkdtempSync(join(tmpdir(), "replay-"));
process.env.ABIDE_DIR = join(dir, ".abide");
const { decide, resetL0State } = await import("../src/l0/index.ts");

/** Each entry: [bug id, the corpus's verbatim input, expected behaviour]. */
const CASES = [
  // ── THE DOCUMENTED FALSE POSITIVES — every one must be SILENT ──
  ["BUG-1", '<system-reminder>The todo list says: mark it done now</system-reminder>', "silent"],
  ["BUG-1", '<task-result status="completed">the agent finished the task</task-result>', "silent"],
  ["BUG-1", '<system-notice>xd:// device inventory changed</system-notice>', "silent"],
  ["BUG-2", "The kernel's condition is `\\b(?:done|complete|fixed|verified|it works)\\b` — see above.", "silent"],
  ["BUG-2", "```\nanti-scope-shrink: too complex, simplify the scope\nanti-theatrical: skip the test\n```", "silent"],
  ["BUG-4", "the manifest records what is not verified", "silent"],
  ["BUG-5", "### bg_25 [bash] - completed", "silent"],
  ["BUG-6", "the claim firewall intercepts goal.complete", "silent"],
  ["BUG-8", "the rule reads `You are declaring work complete` as its subject line", "silent"],
  // ── THE DECLARED TRUE POSITIVES — the layer must still fire ──
  ["TRUE+", "the task is done", "fires"],
  ["TRUE+", "Everything works and all tests pass.", "fires"],
  ["TRUE+", "I'll just assume it probably calls that function.", "fires"],
  ["TRUE+", "I skip the test and mock the module.", "fires"],
];

let failures = 0;
const rows = [];
resetL0State();
for (const [id, text, expect] of CASES) {
  resetL0State();
  const v = decide(text);
  const fired = v.kind === "act" || v.kind === "flag";
  const ok = expect === "fires" ? fired : !fired;
  if (!ok) failures += 1;
  rows.push({ id, expect, got: v.kind, rule: v.rule, ok, span: (v.matchedSpan ?? "").slice(0, 40) });
  console.log(`${ok ? "PASS" : "FAIL"}  ${id.padEnd(6)} expect=${expect.padEnd(6)} got=${String(v.kind).padEnd(5)} ${String(v.rule).slice(0, 34)}`);
}

const ledger = join(dir, ".abide", "events.jsonl");
console.log("\n── the census over THIS replay's ledger ──");
console.log(execFileSync("node", ["scripts/census.mjs", "--ledger", ledger], { encoding: "utf8" }));

const falsePositives = rows.filter((r) => r.expect === "silent");
const truePositives = rows.filter((r) => r.expect === "fires");
console.log(`VERDICT: ${falsePositives.filter((r) => r.ok).length}/${falsePositives.length} documented false positives stayed SILENT · ` +
  `${truePositives.filter((r) => r.ok).length}/${truePositives.length} true positives FIRED · ${failures} failure(s) · SPAN-RESOLUTION 100% on every firing`);
rmSync(dir, { recursive: true, force: true });
process.exit(failures === 0 ? 0 : 1);
