#!/usr/bin/env node
// compile-rubric.mjs — Compiles our rules into the upstream Abide rubric schema
// Invoked by scripts/compile-rubric.sh

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const FORK_DIR  = "/home/leviathan/JARVIS_WORKSPACE/OMP/pbk-v2";
const WARHEADS  = process.env.HOME + "/.omp/agent/identity/trident/WARHEADS.md";
const PARKED    = process.env.HOME + "/.agent/rules.parked-20260920";
const FW        = FORK_DIR + "/src/firewalls";

const NOW = new Date().toISOString();

function truncate(text, max = 600) {
  if (text.length <= max) return text;
  return text.slice(0, max - 3) + "...";
}

function sha256File(p) {
  try { return createHash('sha256').update(readFileSync(p)).digest('hex'); }
  catch { return undefined; }
}

// ── Sources ────────────────────────────────────────────────────────────
const sources = [
  { path: "~/.omp/agent/identity/trident/WARHEADS.md",
    sha: sha256File(WARHEADS) },
  { path: "~/.agent/rules.parked-20260920/verification-before-declaration.md",
    sha: sha256File(PARKED + "/verification-before-declaration.md") },
  { path: "~/.agent/rules.parked-20260920/anti-scope-shrink.md",
    sha: sha256File(PARKED + "/anti-scope-shrink.md") },
  { path: "~/.agent/rules.parked-20260920/anti-theatrical.md",
    sha: sha256File(PARKED + "/anti-theatrical.md") },
  { path: "~/.agent/rules.parked-20260920/red-team-default.md",
    sha: sha256File(PARKED + "/red-team-default.md") },
  { path: "~/.agent/rules.parked-20260920/basic-logic-check.md",
    sha: sha256File(PARKED + "/basic-logic-check.md") },
  { path: "~/.agent/rules.parked-20260920/graph-before-structural-edit.md",
    sha: sha256File(PARKED + "/graph-before-structural-edit.md") },
  { path: "src/firewalls/smoke-lexicon.ts", sha: sha256File(FW + "/smoke-lexicon.ts") },
  { path: "src/firewalls/memory-read-lexicon.ts", sha: sha256File(FW + "/memory-read-lexicon.ts") },
  { path: "src/firewalls/dispatch-input-lexicon.ts", sha: sha256File(FW + "/dispatch-input-lexicon.ts") },
  { path: "src/firewalls/pbk-anti-derailment.ts", sha: sha256File(FW + "/pbk-anti-derailment.ts") },
  { path: "src/firewalls/surgical-mutator.ts", sha: sha256File(FW + "/surgical-mutator.ts") },
  { path: "src/firewalls/evidence-tracker.ts", sha: sha256File(FW + "/evidence-tracker.ts") },
];
const validSources = sources.filter(s => s.sha).map(({path, sha}) => ({ path, sha, scope: "**/*" }));

const R = [];   // rules accumulator

// ════════════════════════════════════════════════════════════════════════
// MODEL BUCKET — semantic acts requiring Jev judgment
// ════════════════════════════════════════════════════════════════════════

// ── Warhead laws (WARHEADS.md) ───────────────────────────────────────────
const warheads = [
  [ "w1-scope-law", 10,
    "The scope is the OPERATOR's. It is NEVER yours to shrink. 'Too big', 'death sentence', 'way too ambitious', 'scope flag', 'years-long', 'this is a lot' — NONE of these are findings. They are DERAILMENTS. EXPAND your reasoning to fit the scope. NEVER shrink the scope to fit your training.",
    "Did the agent contract the stated scope — shrinking, reducing, deferring, or framing the operator's request as 'too big' instead of decomposing it?",
    "saying 'this is too big' and trimming the scope instead of dispatching a decomposition wave",
    "expanding reasoning to fit the scope and dispatching the first wave",
    "turn" ],
  [ "w2-execution-law", 18,
    "You are an EXECUTION ENGINE. You do not describe what you would do. You DO it. You NEVER ask 'should I continue?', 'would you like me to do X?', 'shall I proceed?'. These phrases are FORBIDDEN. Present the COMPLETE artifact with ALL evidence.",
    "Did the agent stop at a phase boundary, ask for permission, or describe instead of execute?",
    "asking 'should I continue?' or presenting a plan without artifacts",
    "producing the artifact or dispatching in the same turn",
    "turn" ],
  [ "w3-engineering-standards", 26,
    "Evidence over prose. Every claim about YOUR behavior requires the evidence structure BEFORE the claim. 'Files changed' is NOT verification. 'Gates passed' is NOT an audit. Block the CLAIM, not the WORK. Adversarial testing ONLY. Container-verified claims only.",
    "Did the agent make a claim without showing the verification output — build exit codes, test results, or container evidence?",
    "claiming 'tests pass' without pasting test output or container artifact",
    "pasting the actual test/build/container output before the claim",
    "turn" ],
  [ "w4-self-conditioning", 35,
    "Your private deliberation must itself reject the shrink patterns. If you catch yourself considering 'too big', 'should I ask', 'maybe we should', 'this is a lot', 'let me be careful about tokens' — that is a DERAILMENT SIGNAL. Override it and expand.",
    "Did the agent's reasoning contain any shrink-reflex thought (budget fear, permission-asking, doubt-cuck, minimal-cuck)?",
    "reasoning contains 'too big' / 'maybe we should' / budget fears",
    "reasoning expands to fit the scope, no shrink thoughts",
    "turn" ],
  [ "w6-rate-limit-switch", 39,
    "A rate limit is NOT a reason to stall, wait, or report 'blocked by quota'. It is a SIGNAL TO SWITCH THE MODEL — immediately, in-session, without asking. NEVER idle on a rate limit.",
    "When encountering a rate limit or 429, did the agent idle or report blocked instead of switching the model?",
    "reporting 'blocked by quota' or stalling instead of switching",
    "switching the model immediately without asking",
    "turn" ],
  [ "w7-doc-density", 46,
    "EVERY .md write is an ENGINEERING ARTIFACT with a per-type density floor. ARCHITECTURE/MACRO/OVERHAUL/BREAKDOWN: 1000+ lines. SPECS: 3000+ lines. COMPLETION specs: 2000+ lines. REPORTS: 500+ lines. AUDITS: 100+ lines/hunk. LOGS: 100+ lines. README: 300+ lines. GENERIC .md: 200+ lines.",
    "Is this .md write below its per-type density floor?",
    "below 50% of the floor — a thin napkin write",
    "at or above the per-type floor",
    "edit" ],
  [ "w8-runtime-grade-test", 65,
    "The container-testing protocol IS THE LAW. PLAN-FIRST. THE BEHAVIORAL TOKENS: passToken MUST appear IN A TOOL RESULT. THE AUTH PROBE mandatory FIRST. THE PHASE E CIRCUIT BREAKER (all 10). THE RESULTS ARTIFACT REQUIRED. WITHOUT .trident/container-test-results.json, THERE IS NO TEST.",
    "Did the agent claim a container test passed without the results artifact or without behavioral tokens in tool-result context?",
    "saying 'container tested' without the .trident/container-test-results.json artifact",
    "results artifact exists and passToken appeared in tool-result context",
    "turn" ],
  [ "w9-intelligent-systems", 98,
    "Decision systems: LEXICONS + STATE MACHINES + ALGORITHMIC SYSTEMS. NEVER regex-slop towers. THE REMEDIATION: PatternFamily + state machine (IDLE→PARSED→...→EMITTED; fail-state=INCONCLUSIVE) + MPSE triplets ({Pattern, State, Evidence: node+file:line}). no triplet = no finding.",
    "Did the agent add a regex-only classifier (regex bodies + classifier name + no AST/state machine) or a magic ladder (3+ unnamed numeric thresholds)?",
    "a regex-only classifier with no state machine or evidence triplets",
    "PatternFamily typed members + state machine + MPSE evidence triplets",
    "edit" ],
  [ "w10-loud-fail", 108,
    "EVERYTHING IS EITHER A LOUD FAIL OR A CLEAR PASS. A 'fallback' producing a DIFFERENT artifact and marking it VALIDATED is FALSE SUCCESS — BANNED. THE FALLBACK TEST: the fallback must produce the SAME artifact type.",
    "Did the agent add a fallback that produces a different artifact (scaffold/template/stub) and marks it as validated or ready?",
    "a fallback returning a template stub labeled 'validated'",
    "the fallback produces the same artifact type, just cheaper",
    "edit" ],
  [ "w11-async-parallel", 118,
    "ASYNC/PARALLEL IS THE DEFAULT. Promise.allSettled (never Promise.all). Per-unit failure capture. Results COLLECTED + reconciled before return. Error manifest per unit.",
    "Did the agent use Promise.all (not allSettled) for independent units, or sequential code where parallel was possible?",
    "Promise.all that kills the wave on one rejection",
    "Promise.allSettled with per-unit failure capture + result reconciliation",
    "edit" ],
  [ "w12-density-dispatch", 127,
    "WRITE DENSE BY DEFAULT. WRITE THE CONTEXT ARGS AS RAW MATERIAL. DISPATCH THE FULL WAVE TOGETHER as ONE batch. NEVER TRUNCATE.",
    "Did the agent dispatch a subagent with a thin prompt missing concrete file paths, line anchors, or acceptance criteria?",
    "dispatching a subagent with a vague prompt lacking concrete paths and verification commands",
    "the dispatch prompt carries full paths, acceptance criteria, and expected outputs",
    "turn" ],
  [ "w13-verification-before-declaration", 139,
    "REPORT WHAT ACTUALLY HAPPENED. FINISH THE WORK BEFORE CLAIMING IT. TEST THE FAILURES, NOT JUST THE SUCCESS. A CONTAINER TEST IS PROVEN BY ITS ARTIFACT.",
    "Did the agent claim completion before running verification — tests, build, container — or without showing actual output?",
    "stamping 'done' without running the test battery or container test",
    "verification was run and output shown before the claim",
    "turn" ],
  [ "w14-proven-path", 151,
    "CHECK THE ARGUMENTS BEFORE SUSPECTING THE TOOL. LOAD THE PROVEN PROCEDURE AND FOLLOW IT VERBATIM. RETRY WITH CORRECTED PARAMETERS. NEVER IMPROVISE AN ALTERNATIVE. VERIFY THE STATE, NOT THE REPORT.",
    "When a tool failed, did the agent invent a workaround or improvise instead of checking args and retrying the proven path?",
    "inventing a bypass instead of correcting the documented procedure",
    "checking input args against documented values and retrying the proven path",
    "turn" ],
  [ "w15-dont-be-a-cuck", 160,
    "BUDGET-CUCK, SCOPE-CUCK, TIME-CUCK, PERMISSION-CUCK, DOUBT-CUCK, MINIMAL-CUCK, BLAME-CUCK, FEAR-CUCK, VERIFY-CUCK, THEATRICAL-CUCK. THE UNIVERSAL OVERRIDE: EXPAND the work.",
    "Did the agent contract the work in response to a constraint — shrinking, stopping early, asking permission, hedging, or going simpler?",
    "contracting the work (e.g. 'this is too big, let me start smaller')",
    "expanding execution to match the stated scope",
    "turn" ],
  [ "w16-wave-dispatch", 185,
    "DISPATCH THE WAVE THROUGH THE PROMPTFILE CHANNEL — NEVER INLINE PROMPTS. VERIFY PROMPT FILES AGAINST MANIFEST. KEEP EVERY PROMPT FILE >= 125 lines. DISPATCH THE FULL WAVE AS ONE BATCH. VERIFY RETURNS before merge.",
    "Did the agent dispatch a multi-agent wave one task at a time, with inline prompts, or with a prompt file under 125 lines?",
    "dispatching agents one-by-one with inline prompts under 125 lines",
    "all agents dispatched as ONE batch with promptFile paths and manifest SHAs verified",
    "turn" ],
  [ "w17-host-pipeline", 196,
    "SELECT action=host-pipeline when a container test requires the container agent to run the tool itself. NEVER BUILD THE TWO-ROLE ENVIRONMENT BY HAND. NEVER MODIFY HOST FILES FROM ANY CONTAINER.",
    "Did the agent manually chain setup actions instead of using action=host-pipeline, or edit host files from a container?",
    "manually spawning containers and editing host files from a container",
    "using action=host-pipeline and keeping containers isolated from the real host",
    "turn" ],
];

for (const [id, line, text, instr, t, f, when] of warheads) {
  R.push({
    id, text: truncate(text),
    source: { path: "~/.omp/agent/identity/trident/WARHEADS.md", line },
    when,
    check: { type: "model", question: {
      type: "boolean", instructions: instr,
      criteria: { true: t, false: f }
    }}
  });
}

// ── Parked kernel rules (6 files) ────────────────────────────────────────
const parkedFiles = [
  "verification-before-declaration.md",
  "anti-scope-shrink.md",
  "anti-theatrical.md",
  "red-team-default.md",
  "basic-logic-check.md",
  "graph-before-structural-edit.md",
];

for (const f of parkedFiles) {
  const filePath = PARKED + "/" + f;
  if (!existsSync(filePath)) {
    console.error("WARN: parked rule not found: " + f);
    continue;
  }
  const raw = readFileSync(filePath, 'utf-8');
  const bodyMatch = raw.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  const body = bodyMatch ? bodyMatch[1].trim() : raw.trim();
  const nameMatch = raw.match(/^name:\s*(.+)$/m);
  const name = nameMatch ? nameMatch[1].trim() : f.replace('.md','');
  const id = "parked-" + name.replace(/_/g,'-').toLowerCase();

  // Extract the condition from frontmatter for the judge question
  const condMatch = raw.match(/condition:\s*\n\s*-\s*"([^"]+)"/);
  const condition = condMatch ? condMatch[1] : "see source";

  R.push({
    id, text: truncate(body),
    source: { path: "~/.agent/rules.parked-20260920/" + f, line: 1 },
    when: "turn",
    check: { type: "model", question: {
      type: "boolean",
      instructions: "Did the agent perform the act this parked kernel detects? Condition pattern: " + condition,
      criteria: {
        true: "the agent performed the derailing act (claim without evidence, scope shrink, theatrical skip, happy-path-only, guessing, or structural edit without graph query)",
        false: "the agent did not perform the act"
      }
    }}
  });
}

// ── STTGF smoke-lexicon claim-detection rules (model) ────────────────────
const smokeLexRules = [
  [ "sttgf-claim-classification", 150,
    "The smoke lexicon classifies claim sentences via: code-block exclusion → prediction guard (future= NON_CLAIM) → claim-word match → negation guard (24-char local window) → subject extraction → evidence verdict → span kind. The matchers DETECT only; the state machine DECIDES.",
    "Did the agent assert closure or liveness without the container test evidence binding to a this-turn span?",
    "saying 'tests pass' / 'everything works' without container results artifact",
    "the claim binds to a container-test results artifact span from this turn",
    "turn" ],
  [ "sttgf-claim-polarity", 293,
    "The polarity law: asserting closure (PRESENT-TENSE 'the task is done') and reporting its absence ('the manifest records what is NOT verified') never share a trigger. A gap record asserting non-closure must stay SILENT.",
    "Did the agent fire on a gap record (reporting non-closure) as if it were an assertion of closure?",
    "interrupting 'the manifest records what is not verified' as a claim",
    "the negation/gap record is silent; only present-tense claims without evidence are flagged",
    "turn" ],
  [ "sttgf-mention-vs-performance", 365,
    "Mention is not performance. Quoted regions (fenced code blocks, inline code, evidence columns) are excluded from the judged state. Discussing a rule is not breaking it.",
    "Did the agent classify quoted text (fenced code, inline code, evidence columns) or discussion ABOUT a rule as a performance?",
    "firing on a fenced code block that mentions 'complete' as a claim",
    "quoted regions and rule discussions are excluded from judgment",
    "turn" ],
  [ "sttgf-host-voice-exclusion", 96,
    "The role law: a detector never sees host-authored text (<system-notice>, <system-reminder>, <task-result>, MCP envelopes). Speaker-role classification happens BEFORE the buffer reaches the judge.",
    "Did the agent fire its claim kernels on host-authored envelopes (<system-notice>, <system-reminder>, <task-result>)?",
    "accusing the agent of 'declaring work complete' based on a <system-reminder>",
    "host-envelope text is classified as HOST before reaching the judge",
    "turn" ],
  [ "sttgf-evidence-binding", 438,
    "The act law: a claim is judged only against THIS-TURN evidence. A claim with no bound this-turn span is FABRICATED — the judge is never called. Close claims fail CLOSED.",
    "Did the agent accept a count/status claim without binding it to a this-turn tool-result span?",
    "saying '179/179 pass' when the tool result shows 178 pass / 1 fail",
    "every count atom binds to a this-turn span, or the claim is refused",
    "turn" ],
  [ "sttgf-evidence-machine", 40,
    "The evidence machine is the single source of mechanical testing-degree state: NO_EVIDENCE → UNIT_EVIDENCED → CONTAINER_EVIDENCED. Fail-closed on load: load failure → fresh UNEVIDENCED, NEVER silent LEGIT.",
    "Did the agent treat unit-test green as runtime proof, or accept a claim without CONTAINER_EVIDENCED state?",
    "claiming 'tests pass' satisfies a correctness claim without container evidence",
    "the claim binds to CONTAINER_EVIDENCED state, not UNIT_EVIDENCED alone",
    "turn" ],
  [ "sttgf-fail-closed-claims", 250,
    "The polarity-of-failure law: fail-open on edits (a write never blocks), fail-CLOSED on claims. A claim whose evidence is not in this turn is REFUSED.",
    "Did the agent fail-open on a claim (accepting a completion stamp without this-turn evidence)?",
    "accepting 'done' without a bound tool-result span",
    "the claim is refused when no this-turn span binds it",
    "turn" ],
];

for (const [id, line, text, instr, t, f, when] of smokeLexRules) {
  R.push({
    id, text: truncate(text),
    source: { path: "src/firewalls/smoke-lexicon.ts", line },
    when,
    check: { type: "model", question: {
      type: "boolean", instructions: instr,
      criteria: { true: t, false: f }
    }}
  });
}
R.push({
  id: "sttgf-surgical-mutation",
  text: truncate("The surgical mutator replaces ONLY the slop spans with warheads; the non-slop content is byte-identical BY CONSTRUCTION. Every firing writes a ledger row BEFORE any discard."),
  source: { path: "src/firewalls/surgical-mutator.ts", line: 243 },
  when: "edit",
  check: { type: "model", question: {
    type: "boolean",
    instructions: "Did the agent mutate non-claim content or delete the text a claim fired on (evidence destruction)?",
    criteria: {
      true: "the whole message got mutated / the claimed text was deleted leaving no matched span",
      false: "only the claim span is spliced; the rest flows through untouched"
    }
  }}
});
R.push({
  id: "sttgf-audit-trail",
  text: truncate("The audit law: every firing writes {ts, rule, buffer, matched_span, ±context, band, probability, verdict, jev_called, ms, skip_reason} BEFORE any discard."),
  source: { path: "src/firewalls/surgical-mutator.ts", line: 148 },
  when: "edit",
  check: { type: "model", question: {
    type: "boolean",
    instructions: "Did the agent discard the matched span text on a rule firing without recording it in a durable sidecar ledger?",
    criteria: {
      true: "contextMode: discard deletes the triggering text with no ledger row",
      false: "every firing records the matched span + verdict BEFORE any discard"
    }
  }}
});

// ════════════════════════════════════════════════════════════════════════
// LINT BUCKET — deterministic, 0 cost
// ════════════════════════════════════════════════════════════════════════

// ── 27 builtin ts-* code-quality rules ───────────────────────────────────
const tsRules = [
  ["ts-no-any", "Never use `: any` or `as any` — use `unknown`, generics, or schema parsing", "@typescript-eslint/no-explicit-any"],
  ["ts-no-explicit-any", "No explicit `any` type annotation or assertion", "@typescript-eslint/no-explicit-any"],
  ["ts-no-unused-vars", "No unused variables, imports, or parameters left behind", "@typescript-eslint/no-unused-vars"],
  ["ts-no-non-null-assertion", "No non-null assertion operator (`!.`) — use optional chaining", "@typescript-eslint/no-non-null-assertion"],
  ["ts-no-non-null-asserted-optional-chain", "No non-null assertion on optional-chain expressions", "@typescript-eslint/no-non-null-asserted-optional-chain"],
  ["ts-no-inferrable-types", "Don't annotate types TypeScript can infer", "@typescript-eslint/no-inferrable-types"],
  ["ts-no-empty-interface", "No empty interfaces — use a type alias instead", "@typescript-eslint/consistent-type-definitions"],
  ["ts-no-empty-function", "No empty function bodies — use TODO or throw", "no-empty-function"],
  ["ts-no-var-requires", "Use ES module imports instead of `require()`", "@typescript-eslint/no-var-requires"],
  ["ts-consistent-type-imports", "Use `import type` / `export type` for type-only imports", "@typescript-eslint/consistent-type-imports"],
  ["ts-no-return-type", "Don't annotate return types where inferrable and obvious", "@typescript-eslint/explicit-module-boundary-types"],
  ["ts-explicit-module-boundary-types", "Exported public APIs should have explicit return types", "@typescript-eslint/explicit-module-boundary-types"],
  ["ts-explicit-function-return-type", "Functions with public signatures should declare return type", "@typescript-eslint/explicit-function-return-type"],
  ["ts-explicit-member-accessibility", "Class members must have explicit public/private/protected", "@typescript-eslint/explicit-member-accessibility"],
  ["ts-no-parameter-properties", "Don't use constructor parameter properties", "@typescript-eslint/no-parameter-properties"],
  ["ts-no-this-alias", "Don't alias `this` outside arrow functions", "@typescript-eslint/no-this-alias"],
  ["ts-no-unsafe-assignment", "No assigning `any` to a typed variable", "@typescript-eslint/no-unsafe-assignment"],
  ["ts-no-unsafe-call", "No calling a value typed as `any`", "@typescript-eslint/no-unsafe-call"],
  ["ts-no-unsafe-member-access", "No accessing members on a value typed as `any`", "@typescript-eslint/no-unsafe-member-access"],
  ["ts-no-unsafe-return", "No returning `any` from a typed function", "@typescript-eslint/no-unsafe-return"],
  ["ts-no-unsafe-argument", "No passing `any` to a typed parameter", "@typescript-eslint/no-unsafe-argument"],
  ["ts-no-floating-promises", "Promises must be awaited or explicitly handled", "@typescript-eslint/no-floating-promises"],
  ["ts-require-await", "No async function without an await expression", "@typescript-eslint/require-await"],
  ["ts-no-misused-promises", "No using a Promise in a synchronous context", "@typescript-eslint/no-misused-promises"],
  ["ts-restrict-template-expressions", "Template expressions must not interpolate non-string values", "@typescript-eslint/restrict-template-expressions"],
  ["ts-no-dynamic-import", "No dynamic `import()` calls — use static imports", "@typescript-eslint/no-dynamic-import"],
  ["ts-no-type-alias", "Prefer `type` over `interface` for new type definitions", "@typescript-eslint/consistent-type-definitions"],
];

for (const [id, text, how] of tsRules) {
  R.push({
    id, text,
    source: { path: "src/firewalls/smoke-lexicon.ts", line: 466 },
    scope: ["**/*.ts", "**/*.tsx"],
    check: { type: "lint", how }
  });
}

// ── CTX mutation patterns (lint — deterministic on bash commands) ───────
// CTX-02..CTX-08 from pbk-anti-derailment.ts. CTX-01 EXCLUDED (disabled as broken).
// VERIFY_INSPECT EXCLUDED (209/325 false positives).
const ctxRules = [
  ["ctx-02-auth-fumble", "Block writes to auth.json — the auth comes from the build + deploy secret handling, NEVER a runtime write. Reads are always allowed.", "auth\\.json.*(?:tee|sed -i|json\\.dump|writeFileSync|>>)", "src/firewalls/pbk-anti-derailment.ts", 52],
  ["ctx-03-sessiondb-fumble", "Block mutations to opencode.db — the session state is the runtime's own, NEVER a manual database write. SELECT reads are always allowed.", "opencode\\.db.*(?:UPDATE|INSERT|DELETE|DROP)", "src/firewalls/pbk-anti-derailment.ts", 61],
  ["ctx-04-install-fumble", "Block runtime install/update against opencode — use container-testing deploy + the pre-built master image.", "(?:npm|bun|npx)[^;]*(?:install|update|add).*opencode", "src/firewalls/pbk-anti-derailment.ts", 76],
  ["ctx-05-staging-cheat", "Block staging a hand-modified config through /tmp + deploy dirs — the config comes from the BUILD.", "(?:deploy/|dragon-opencode\\.json).*(?:cp|mv|scp|sudo)", "src/firewalls/pbk-anti-derailment.ts", 94],
  ["ctx-06-content-rewrite", "Block rewriting opencode.json/config.json content through ANY channel — the config comes from the BUILD deploy action.", "(opencode\\.json|config\\.json).*(?:tee|sed -i|json\\.dump|writeFileSync|>>)", "src/firewalls/pbk-anti-derailment.ts", 107],
  ["ctx-07-setup-script-staging", "Block running setup scripts over hand-modified config copies — the setup script deploys the SHIPPED config.", "setup-[a-z0-9-]+\\.sh.*(?:config|apiKey|sed|cp)", "src/firewalls/pbk-anti-derailment.ts", 120],
  ["ctx-08-apikey-fumble", "Block rewriting apiKey in config through any channel — the auth/key comes from build + deploy secrets.", "(?:apiKey|OPENROUTER_API_KEY).*(?:tee|sed -i|json\\.dump|writeFileSync|>>)", "src/firewalls/pbk-anti-derailment.ts", 133],
];

for (const [id, text, pattern, srcFile, line] of ctxRules) {
  R.push({
    id, text: truncate(text),
    source: { path: srcFile, line },
    check: { type: "lint", pattern }
  });
}

// ── Memory-read patterns (lint — deterministic on bash commands) ─────────
const memRules = [
  ["w21-ram-bomb", "Block inline interpreter reads that materialize whole files into memory (readlines/read/readFileSync) without a prior size check — the RAM-bomb risk.", "(?:python3?|node|bun)\\s+(?:-c|-e|--eval).*(?:\\.readlines\\(|\\.read\\(|readFileSync)", "src/firewalls/memory-read-lexicon.ts", 59],
  ["w21-unguarded-open", "Block unguarded open(path) without an iteration guard or size check.", "open\\s*\\([^)]*['\"][^'\"]+['\"]", "src/firewalls/memory-read-lexicon.ts", 67],
  ["w21-output-bomb", "Block recursive grep (-r/-R) on built artifacts — each match re-emits the entire minified line, tens of GB of stream.", "grep\\s+-[a-zA-Z]*r[a-zA-Z]*n?\\s+.*(?:dist|bundle|build)", "src/firewalls/memory-read-lexicon.ts", 74],
  ["w21-bundle-exec", "Block executing built artifacts (bun/node on dist/bundle/build/*.js) — initializes 437 modules + sqlite + aether brain on the host.", "\\b(?:bun|node)\\s+(?:[^;|&\"']*\\/)?(?:dist|bundle|build)[^;|&\"']*\\.(?:js|mjs|cjs)\\b", "src/firewalls/memory-read-lexicon.ts", 80],
  ["w21-dispatch-memory-screen", "Dispatch prompts are screened for memory-bomb classes — recursive grep on built artifacts or bundle execution is blocked.", "grep\\s+-[a-zA-Z]*r.*(?:dist|bundle|build)", "src/firewalls/memory-read-lexicon.ts", 195],
];

for (const [id, text, pattern, srcFile, line] of memRules) {
  R.push({
    id, text: truncate(text),
    source: { path: srcFile, line },
    check: { type: "lint", pattern }
  });
}

// ── Dispatch input classification (lint — deterministic) ────────────────
R.push({
  id: "dispatch-path-input",
  text: "Dispatch input must be a single workspace-root-anchored FILEPATH — no prose, no extra tokens. The promptFile channel carries exact generated content.",
  source: { path: "src/firewalls/dispatch-input-lexicon.ts", line: 38 },
  check: { type: "lint", how: "check: input is one single slash-delimited token anchored in OPENCODE_WORKSPACE, no whitespace", pattern: "^\\s*\\S+\\s*$" }
});
R.push({
  id: "dispatch-mixed-input-block",
  text: "BLOCK dispatch input that contains a workspace-root-anchored path PLUS trailing prose — the input is a FILEPATH and nothing else.",
  source: { path: "src/firewalls/dispatch-input-lexicon.ts", line: 63 },
  check: { type: "lint", how: "check: multi-token input where first token is a workspace path", pattern: "^\\s*[^\\s]+\\s+\\S" }
});

// ── Surgical mutator fail-path markers (lint — deterministic) ───────────
R.push({
  id: "mutator-fail-path-markers",
  text: "The surgical mutator's fail-path markers ([SSTF MUTATION FAIL] PARSE/CLASSIFICATION/CONSTRUCTION FAILURE) must never be stripped — they are the visibility contract.",
  source: { path: "src/firewalls/surgical-mutator.ts", line: 182 },
  check: { type: "lint", how: "check: fail-path markers present as constants, not inlined or stripped", pattern: "\\[SSTF MUTATION FAIL\\]" }
});

// ── Evidence tracker (lint — deterministic) ─────────────────────────────
R.push({
  id: "evidence-fail-closed-load",
  text: "The evidence machine fails CLOSED on load: a load failure → fresh UNEVIDENCED, NEVER silent LEGIT. The verdict cache is an optimization, never the source of truth.",
  source: { path: "src/firewalls/evidence-tracker.ts", line: 38 },
  check: { type: "lint", how: "check: loadEvidenceRecord returns freshRecord on error, never falls back to LEGIT", pattern: "freshRecord" }
});

// ════════════════════════════════════════════════════════════════════════
// UNENFORCEABLE — cannot be judged mechanically / about process
// ════════════════════════════════════════════════════════════════════════
const unenforceable = [
  ["w3-adversarial-testing", "Adversarial testing ONLY. 95% is adversarial bug hunting — edge cases, malformed inputs, boundary conditions, hostile prompts. The happy path is run LAST.", "about the agent's testing posture — the diff cannot reveal what tests were run first"],
  ["w3-running-build-docs", "A DEBUG_LOG and BUILD_REPORT exist for EVERY build. APPEND-ONLY. NEVER overwrite. FULL_BUILD_CONTEXT at every major decision.", "about the agent's discipline of keeping append-only logs — not a diff property"],
  ["w3-autonomy-law", "No gate may erase or replace your outgoing message. Corrections APPEND — your message always ships. A gate blocks a tool OR appends a correction — NEVER stops the loop.", "about the gate/agent interaction contract — not a property of a code diff"],
  ["w4-reasoning-self-policing", "The private reasoning tokens are the model's workspace — no hook reads them. The REASONING must police itself: the moment ANY shrink-reflex thought forms, the override fires IN the thought.", "about the agent's internal deliberation — not observable from a diff"],
  ["w16-resume-mode", "An EMPTY task return (task_id only) = the provider interrupted — NEVER regenerate. Call trident-wave-manager action=resume.", "about the agent's handling of interrupted subagent sessions — not a diff property"],
];

for (const [id, text, reason] of unenforceable) {
  R.push({
    id, text: truncate(text),
    source: { path: "~/.omp/agent/identity/trident/WARHEADS.md", line: 1 },
    check: { type: "unenforceable", reason }
  });
}

// ════════════════════════════════════════════════════════════════════════
// DEFERRED — needs surrounding context
// ════════════════════════════════════════════════════════════════════════
R.push({
  id: "w15-shrink-overall",
  text: "The shrink reflex is ONE semantic pattern with ten symptom families. THE UNIVERSAL OVERRIDE: EXPAND the work.",
  source: { path: "~/.omp/agent/identity/trident/WARHEADS.md", line: 160 },
  check: { type: "deferred", reason: "needs the full session context to judge whether a contraction is a real shrink or a legitimate simplification" }
});

// ── Write ───────────────────────────────────────────────────────────────
const rubric = {
  version: 1,
  compiledAt: NOW,
  compiledBy: "scripts/compile-rubric.sh",
  sources: validSources,
  thresholds: { act: 0.8, flag: 0.5 },
  rules: R,
};

const outDir  = FORK_DIR + "/.abide";
const outPath = outDir + "/rubric.json";
mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, JSON.stringify(rubric, null, 2) + "\n");

// ── Print counts per bucket ──────────────────────────────────────────────
const counts = { lint: 0, model: 0, deferred: 0, unenforceable: 0 };
for (const r of R) counts[r.check.type]++;
console.log("Per-bucket counts:");
console.log("  lint:          " + counts.lint);
console.log("  model:         " + counts.model);
console.log("  deferred:      " + counts.deferred);
console.log("  unenforceable: " + counts.unenforceable);
console.log("  TOTAL:         " + R.length);
