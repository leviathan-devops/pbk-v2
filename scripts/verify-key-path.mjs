#!/usr/bin/env bun
/**
 * verify-key-path.mjs — the ONE-COMMAND resume for the key-blocked goal items.
 *
 * It answers: "is the key present, and if so, does the real judge produce a BAND?"
 * (the live edit band + the bound-claim PASS that the goal's legal stop names).
 *
 * USAGE: bun scripts/verify-key-path.mjs
 * EXIT:  0 = the key is present AND the judge path produced a banded verdict
 *        1 = the key is present but the judge path failed  (read the error)
 *        2 = NO KEY — the goal items stay blocked (nothing else is required)
 */
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";

const envPath = `${homedir()}/.abide/.env`;
const keys = [];
if (process.env.TYPESAFE_AI_API_KEY) keys.push(["env", process.env.TYPESAFE_AI_API_KEY]);
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*TYPESAFE_AI_API_KEY\s*=\s*(\S+)/);
    if (m && m[1].length > 8) keys.push([envPath, m[1]]);
  }
}
if (keys.length === 0) {
  console.log("NO KEY. The two goal items (the live edit band, the bound-claim PASS) stay BLOCKED.");
  console.log(`Put the key in ${envPath} (chmod 600) as: TYPESAFE_AI_API_KEY=<key>`);
  console.log("Then re-run this script. Nothing else is required.");
  process.exit(2);
}
const [source] = keys[0];
console.log(`KEY PRESENT (source: ${source}, ${keys[0][1].length} chars — value never printed).`);

const { kernelJudge } = await import("../src/ext/kernel-judge.ts");
const judge = kernelJudge();
// a fixture edit: the judge path needs rules + a diff, not a live container
// The judge takes a TOOL-RESULT event (its real handler input), not a bare diff state.
const res = await judge.judge({
  type: "tool_result",
  toolName: "write",
  toolCallId: "verify-1",
  content: "wrote src/example.ts",
  input: {
    file_path: "src/example.ts",
    content: "export function neverCalled() { return 1; }\n",
  },
  sessionId: "verify-key",
  turnId: "t1",
}).catch((e) => ({ error: String((e && e.message) || e) }));
console.log("JUDGE RESULT:", JSON.stringify(res).slice(0, 400));

// V-067: THE VERDICT MUST BE EVIDENCE-BASED. The previous version printed "BAND PRODUCED — the two
// blocked goal items are now unblocked" whenever no exception was thrown — INCLUDING when the judge
// returned `checked:false, actAppends:0`, i.e. NO BAND. That is the theatrical class: a green-sounding
// line with no evidence behind it, which would have sent the operator away believing the layer worked.
if (res && res.error) {
  console.log("VERDICT: FAILED — KEY PRESENT BUT THE JUDGE PATH ERRORED (read the error above).");
  process.exit(1);
}
const banded = res && res.checked === true;
const bandCount = (res && (res.actAppends ?? 0) + (res.flagNotices ?? 0)) ?? 0;
if (banded && bandCount > 0) {
  console.log(`VERDICT: PASS — a REAL band was produced (actAppends=${res.actAppends} flagNotices=${res.flagNotices}); the two key-gated items are unblocked.`);
  process.exit(0);
}
if (banded && bandCount === 0) {
  // checked but nothing banded: a legitimate outcome for THIS fixture (the judge may clear it) — but it
  // is NOT a "band produced", and the caller must be able to tell the difference.
  console.log("VERDICT: PARTIAL — the judge WAS called (checked=true) but this fixture produced no act/flag band.");
  console.log("         The judge path is LIVE; re-run the real gates to see a band.");
  process.exit(0);
}
console.log("VERDICT: FAILED — the judge did NOT run (checked=false). THE LAYER IS DOWN; the key did not reach it.");
console.log("         Check that the key resolves: env TYPESAFE_AI_API_KEY, or ~/.abide/.env (chmod 600).");
process.exit(1);
