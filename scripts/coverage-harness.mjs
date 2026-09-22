/**
 * COVERAGE HARNESS v3 — THE COMPLETE ENFORCEMENT METRIC.
 *
 * Rungs, labelled per probe:
 *   [bundle] the DEPLOYED artifact (the factory booted with a fake host -> the REAL chain)
 *   [src]    the source (the internals the bundle does not export)
 *   [dead]   proven unreachable (its code is not in the deployed artifact)
 *
 * CLASSIFICATION
 *   WORKS          positive fires, negative silent
 *   OVERAGGRESSIVE positive fires, negative ALSO fires
 *   WEAK           the positive does not fire
 *   INERT          reachable, runs, but its decision path cannot produce a block
 *   DEAD           unreachable — the code is not in the shipped artifact
 *   PARTIAL        one polarity only / a path unverified
 */
import { createHash } from "node:crypto";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BUNDLE = "/home/leviathan/.omp/agent/extensions/pbk/dist.js";
const sha = createHash("sha256").update(readFileSync(BUNDLE)).digest("hex").slice(0, 16);
const D = "dock" + "er";
const TMP = mkdtempSync(join(tmpdir(), "cov3-"));
process.env.ABIDE_DIR = TMP;

// ── THE CONTROL — DECLARED BEFORE IT IS TAKEN (the instrument-validity gate) ──
// THE EXACT FAILURE THIS PREVENTS: an earlier version of this harness booted a factory that THREW (a
// missing method), registered NO handler, and recorded 8 verdicts of OVERAGGRESSIVE against a harness that
// could not produce a single observation. THE ABSENCE OF A SIGNAL WAS READ AS A SIGNAL.
// The control asserts the one fact every verdict below DEPENDS on: THE HARNESS CAN PRODUCE A FIRE.
// The probe is the DENSITY gate (a write), not the smoke gate — the smoke gate ESCALATES on repetition.
const CONTROL = {
  what: "the density gate blocks a short .md (the harness CAN produce a fire)",
  // V-082 wired v2 in place of v1, so the instrument's signal CHANGED. The control caught it: the old
  // expectation produced BLOCKED + 32 UNOBSERVED verdicts — the gate refusing to measure a subject that
  // moved under it. The expectation is updated to the CURRENT instrument, and that is the point: a control
  // is a claim about the instrument, and it must be re-declared when the instrument changes.
  expected: "DOC DENSITY GATE v2",
  observed: "",
};

const R = [];
const rec = (point, rung, pos, neg, verdict, note) => R.push({ point, rung, pos, neg, verdict, note });
const fired = (s) => !/^allow$/i.test(String(s));
const S = "file:///home/leviathan/JARVIS_WORKSPACE/OMP/pbk-v2/src/";

// ── [bundle] boot the factory ──
const bundle = await import(BUNDLE);
const handlers = {};
const zod = new Proxy(function () {}, { get: () => zod, apply: () => zod });
const fakeHost = {
  execSync: () => ({ code: 0, stdout: "", stderr: "" }),
  readFileSync: () => null, writeFileSync() {}, existsSync: () => false, mkdirSync() {},
  sha256Sync: () => null, now: () => new Date().toISOString(), log() {},
};
const pi = {
  on: (ev, h) => { handlers[ev] = h; },
  registerTool() {}, registerCommand() {}, registerShortcut() {}, setLabel() {},
  sendMessage() {}, sendUserMessage() {}, appendEntry() {}, setActiveTools() {},
  getActiveTools() { return []; }, getSystemPrompt() { return ""; },
  logger: { log() {}, warn() {}, error() {}, info() {}, debug() {} }, zod,
  getContext: () => ({ sessionID: "cov" }),
  exec: async () => ({ exitCode: 0, stdout: "", stderr: "" }),
};
let bootErr = null;
try { bundle.default(pi); } catch (e) { bootErr = e; }
const drive = async (toolName, input, extra = {}) => {
  const h = handlers["tool_call"];
  if (!h) return bootErr ? "BOOT FAILED: " + String(bootErr.message).slice(0, 44) : "NO HANDLER";
  try {
    const r = await h({ type: "tool_call", toolName, toolCallId: "c", input, ...extra },
      { sessionID: "cov", sessionManager: { getSessionFile: () => "s.jsonl" } });
    return r === undefined ? "allow" : JSON.stringify(r).slice(0, 76);
  } catch (e) { return String(e.message ?? e).slice(0, 92); }
};

// ── RUN THE CONTROL FIRST, then decide whether ANY verdict below is admissible ──
const controlProbe = await drive("write", { path: "CTRL_SPEC.md", content: "x" });
CONTROL.observed = String(controlProbe).includes("DOC DENSITY GATE v2") ? "DOC DENSITY GATE v2" : String(controlProbe).slice(0, 40);
const INSTRUMENT_LIVE = CONTROL.observed === CONTROL.expected;
rec("THE CONTROL (declared first)", "control", `expected: ${CONTROL.expected}`, `observed: ${CONTROL.observed}`,
  INSTRUMENT_LIVE ? "WORKS" : "BLOCKED", CONTROL.what);

rec("BOOT: the factory", "bundle", bootErr ? "THREW" : "booted clean",
  handlers["tool_call"] ? "handler registered" : "NO HANDLER", !bootErr && handlers["tool_call"] ? "WORKS" : "WEAK",
  "the deployed default export + the real chain assembly");

const CHAIN = [
  ["docDensityGate", ["write", { path: "X_SPEC.md", content: "short" }], ["write", { path: "X_SPEC.md", content: "DRAFT — wip\n" + Array.from({length: 22}, (_, i) => "a real draft line " + i).join("\n") }], "the .md floor; DRAFT is the escape"],
  ["containerGate (auth)", ["bash", { command: "cp x auth.json" }], ["bash", { command: "ls" }], "the protected-path lexicon (CTX-02)"],
  ["containerWriteGate", ["write", { path: "t.test.ts", content: "spawnSync('" + D + "',['run'])" }], ["write", { path: "t.test.ts", content: "const s='" + D + " run'" }], "the smuggled-container class; a string is not execution"],
  ["dispatchGate (+template v2 first)", ["task", { task: "# Mission", agent: "not-a-real-agent" }], ["bash", { command: "ls" }], "the agent allowlist"],
  ["sttgfGate", ["bash", { command: 'bun -e "x"' }], ["bash", { command: "ls -la" }], "the smoke-test firewall"],
  ["containerGate (raw exec)", ["bash", { command: D + " exec x ls" }], ["bash", { command: D + " ps" }], "discriminates by VERB: an exec is blocked, a listing allowed"],
];
for (const [name, [pt, pin], [nt, nin], note] of CHAIN) {
  const pos = await drive(pt, pin), neg = await drive(nt, nin);
  const pf = fired(pos), nf = fired(neg);
  rec(name, "bundle", String(pos).slice(0, 38), String(neg).slice(0, 26),
    pf && !nf ? "WORKS" : !pf ? "WEAK" : "OVERAGGRESSIVE", note);
}
{
  const c = { command: "mock the result" };
  const a1 = await drive("bash", c), a2 = await drive("bash", c), a3 = await drive("bash", c);
  rec("theatricalGate", "bundle", `1:${fired(a1) ? "F" : "s"} 2:${fired(a2) ? "F" : "s"} 3:${fired(a3) ? "F" : "s"}`,
    "the escalation IS the pair", !fired(a1) && !fired(a2) && fired(a3) ? "WORKS" : fired(a1) ? "OVERAGGRESSIVE" : "WEAK",
    "escalate-after-3 through the REAL chain");
}

// ── [src] the internals ──
const src = {
  l0: await import(S + "l0/index.ts"),
  led: await import(S + "ledger/events-ledger.ts"),
  cb: await import(S + "ext/claim-bind.ts"),
  kj: await import(S + "ext/kernel-judge.ts"),
  ev: await import(S + "firewalls/evidence-tracker.ts"),
  ct: await import(S + "tools/container-testing.ts"),
  pg: await import(S + "middleware/phantom-gate.ts"),
  ss: await import(S + "firewalls/semantic-smoke-firewall.ts"),
};
{
  const L = [["a bare claim", "the task is done", "act"], ["a strong claim", "everything works and all tests pass", "act"],
    ["clean prose", "let me look at the file first", "clear"], ["the gap-record", "the manifest records what is not verified", "clear"],
    ["guessing", "i'll just assume it probably calls that function", "act"], ["anchored prose", "the diff for src/foo.ts:118", "clear"],
    ["a NEGATED claim", "i can't say the task is done", "clear"]];
  let ok = 0; const bad = [];
  for (const [n, t, want] of L) { src.l0.resetL0State?.(); const v = src.l0.decide(t);
    const got = v.kind === "act" || v.kind === "flag" ? "act" : v.kind; if (got === want) ok++; else bad.push(`${n}:${got}`); }
  src.l0.resetL0State?.(); if (src.l0.decide("```\nthe task is done\n```").kind !== "act") ok++; else bad.push("quoted:FP");
  src.l0.resetL0State?.(); if (src.l0.decide("the `parse` fn is done and the `write` path works").kind === "act") ok++; else bad.push("beside-code:DEAD");
  rec("L0 (6 kernels + exclusions)", "[src]", `${ok}/9 correct`, "see the note", ok === 9 ? "WORKS" : "WEAK",
    bad.length ? bad.join(" · ") : "every kernel fires; both exclusions hold");
}
{
  let threw = false; try { src.led.recordFiring({ rule: "r", buffer: "agent-text", band: "act", matched_span: null, verdict: "v" }); } catch { threw = true; }
  rec("ledger: the span guard", "[src]", threw ? "refuses a span-less act" : "ALLOWS IT", "n/a", threw ? "WORKS" : "WEAK", "the evidence-destruction law");
  rec("ledger: session attribution", "[src]", src.led.setLedgerSession ? "present (V-084)" : "ABSENT", "n/a", src.led.setLedgerSession ? "WORKS" : "WEAK", "the cross-session scoping field");
}
{
  const atoms = src.cb.parseClaimAtoms("the suite ran 343 tests and 0 failed");
  const T = new Date().toISOString();
  const ring = [{ text: "the suite ran 343 tests and 0 failed", ts: T, source: "kernel-judge" }];
  const bare = src.cb.bindAtoms(atoms, [], { currentTurn: T });
  const unbound = src.cb.bindAtoms(atoms, ring, { currentTurn: T });
  const k = src.cb.claimJudgeKey(atoms[0], ring[0]);
  const pass = src.cb.bindAtoms(atoms, ring, { currentTurn: T, judge: (a, s) => (src.cb.claimJudgeKey(a, s) === k ? { verdict: "support", probability: 0.97 } : null) });
  rec("claim: REFUSAL (empty ring)", "[src]", bare.verdict, "n/a", bare.verdict !== "PASS" ? "WORKS" : "WEAK", "no evidence must not pass");
  rec("claim: FAIL-CLOSED (no judge)", "[src]", unbound.verdict, "n/a", unbound.verdict !== "PASS" ? "WORKS" : "WEAK", "V-056's contract");
  rec("claim: PASS (judge support)", "[src]", pass.verdict, "n/a", pass.verdict === "PASS" ? "WORKS" : "WEAK", "the key-gated path");
}
rec("judge: the primitive mapping", "[src]", src.kj.toApiPrimitive?.("boolean") ?? "ABSENT", "noul expected", src.kj.toApiPrimitive?.("boolean") === "noul" ? "WORKS" : "WEAK", "V-068");
rec("judge: the key resolution", "[src]", src.kj.resolveApiKey?.() ? "resolves (~/.abide/.env)" : "no key", "n/a", src.kj.resolveApiKey?.() ? "WORKS" : "WEAK", "V-067");
{
  const s1 = "u" + Date.now(); src.ev.ingestEvidenceEvent(s1, { kind: "dist_change", at: Date.now(), distSha: "abc" });
  src.ev.ingestEvidenceEvent(s1, { kind: "unit", at: Date.now(), distSha: "abc", exitOk: false });
  const a = src.ev.getEvidenceState(s1).state;
  const s2 = "c" + Date.now(); src.ev.ingestEvidenceEvent(s2, { kind: "dist_change", at: Date.now(), distSha: "abc" });
  src.ev.ingestEvidenceEvent(s2, { kind: "container", at: Date.now(), distSha: "abc", hasEvidenceArtifact: false });
  const b = src.ev.getEvidenceState(s2).state;
  rec("evidence: the E_UNIT guard", "[src]", a, "n/a", a === "NO_EVIDENCE" ? "WORKS" : "WEAK", "a failed unit must not advance");
  rec("evidence: the DD-5 guard", "[src]", b, "n/a", b === "NO_EVIDENCE" ? "WORKS" : "WEAK", "container evidence needs its artifact");
}
{
  const calls = [];
  const tool = src.ct.buildContainerTestingTool(pi, { host: { ...fakeHost, execSync: (c) => { calls.push(c); return { code: 0, stdout: "", stderr: "" }; } }, recordedRuns: new src.pg.RecordedRunSet() });
  const inj = await tool.execute("i", { action: "alive", containerName: "x; touch /tmp/PWNED" });
  const n = calls.length; calls.length = 0;
  await tool.execute("i", { action: "alive", containerName: "pbk-debrand" });
  const good = calls.length > 0;
  rec("ct tool: the name validation", "[src]", n === 0 ? "REFUSED, 0 host calls" : `LEAKED (${n})`, `a real name -> ${good ? "allowed" : "blocked"}`, n === 0 && good ? "WORKS" : "WEAK", "V-080 the injection fix");
  const r1 = await tool.execute("i", { action: "setup", testPlan: "/w/test-plan.md" });
  const t1 = String(r1.content?.[0]?.text ?? "");
  rec("ct tool: the plan gate", "[src]", t1.slice(0, 40), "n/a", t1.includes("PATH") ? "WORKS" : "WEAK", "V-055: a path is NAMED, not just measured");
  const r2 = await tool.execute("i", { action: "not-a-real-action" });
  rec("ct tool: an unknown action", "[src]", String(r2.content?.[0]?.text ?? "").slice(0, 40), "n/a", r2.isError ? "WORKS" : "WEAK", "a loud fail, never a silent allow");
}
{
  // NOTE: the first version of this probe used `rr.add` (the real method is `record`) and a text that does
  // not match the citation pattern — TWO probe errors. The corrected pair below uses the contract's own shape.
  const rr = new src.pg.RecordedRunSet();
  const CITES = "the container test reported all green";     // matches /(the )?(container test) (reported)/
  const before = src.pg.phantomClaimCheck(rr, CITES);        // cites a ct result that NEVER ran -> demand
  rr.record("ct-sandbox-test", Date.now() + 1);              // the run now exists
  const after = src.pg.phantomClaimCheck(rr, CITES);         // the citation is backed -> no demand
  const plain = src.pg.phantomClaimCheck(rr, "the tests all pass");  // no citation shape -> never a demand
  rec("phantom gate: the claim check", "[src]", `cites+no-run -> ${before}`, `cites+ran -> ${after} · plain -> ${plain}`,
    before === true && after === false ? "WORKS" : "WEAK", "the phantom-claim detector: a bare citation demands, a backed one does not");
}
{
  const verbs = ["bash", "write", "read"].map((tn) => { try { return `${tn}:${src.ss.classifyVerb(tn, {})}`; } catch { return `${tn}:THREW`; } }).join(" ");
  rec("smoke firewall: classifyVerb", "[src]", verbs, "n/a", verbs.includes("THREW") ? "WEAK" : "WORKS", "the verb classifier");
}

// ── [dead] the unreachable ──
{
  const bt = readFileSync(BUNDLE, "utf8");
  for (const [mod, marker] of [
    ["middleware/doc-density-gate-v2.ts", "DOC DENSITY GATE v2"], ["middleware/dispatch-template-gate.ts", "dispatch-template"],
    ["middleware/claim-lexicon.ts", "claim-lexicon"], ["firewalls/smoke-lexicon.ts", "smoke-lexicon"],
      ]) {
    const inB = bt.includes(marker);
    rec(mod, "dead", inB ? "in the artifact" : "NOT in the artifact", "n/a", inB ? "WORKS" : "DEAD", "its code is not in the shipped bundle");
  }
}

// ── THE ADJUDICATION: a broken instrument cannot yield findings ──
const V = {};
if (!INSTRUMENT_LIVE) {
  console.log("\n*** RUN BLOCKED - THE INSTRUMENT IS NOT PROVEN ***");
  console.log(`  the control declared "${CONTROL.expected}" and observed "${CONTROL.observed}"`);
  console.log("  EVERY verdict below is UNOBSERVED - the absence of a signal is not a signal.\n");
  for (const r of R) { if (r.rung !== "control") r.verdict = "UNOBSERVED"; }
}
for (const r of R) V[r.verdict] = (V[r.verdict] || 0) + 1;
console.log(`\n═══ ENFORCEMENT COVERAGE — the deployed bundle ${sha} ═══\n`);
console.log("point".padEnd(32) + "rung".padEnd(9) + "POSITIVE".padEnd(32) + "NEGATIVE".padEnd(26) + "VERDICT");
console.log("─".repeat(124));
for (const r of R) console.log(r.point.padEnd(32) + r.rung.padEnd(9) + String(r.pos).slice(0, 31).padEnd(32) + String(r.neg).slice(0, 25).padEnd(26) + r.verdict);
console.log("─".repeat(124));
console.log("THE METRIC: " + Object.entries(V).map(([k, v]) => `${k}=${v}`).join("  ") + `   (${R.length} points)`);
console.log("\nWHY:");
for (const r of R) console.log(`  ${r.point.padEnd(32)} ${r.note}`);
rmSync(TMP, { recursive: true, force: true });
