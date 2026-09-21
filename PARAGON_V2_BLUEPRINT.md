# PARAGON BEHAVIOR KERNELS — V2 ARCHITECTURE BLUEPRINT

**Forged:** 2026-09-20 22:36  · **Fork base:** `Checkpoints/pre-abide-functional` (`a7b9472` → `b50b4d1` → `6ac70d1`)
**Operator's mandate (verbatim):** *"map and mint a full blueprint architecture for the entire
paragon behavior kernels from the ground up that integrates abide with the current best
checkpoint… we port in abide exactly as it is… our warheads plugged into abide alongside the
stock, and abide becomes the new append system/TTSR machine."*
**Sealed length:** 455 lines (the commit body of 3765cd7 says 435L — measured after sealing, this line is the correction).
**Method:** four independent observation desks (shape · failure corpus · Abide structure · rule
inventory), then one synthesis. Every row carries an anchor. Nothing here is recalled.

---

## §0 — THE FIRST-PRINCIPLES CORE

V1's authority source is a matcher that reads a TOKEN. V2's authority source is a judge that
reads an ACT and checks it against EVIDENCE. That is the whole change; the architecture below
keeps the working shape and replaces only the intelligence core.

```
    AUTHORITY  = judgement over an act          (never a token match)
    EVIDENCE   = this-turn state                (never recollection)
    MENTION   != PERFORMANCE                    (a quotation is not a commission)
    FAIL-OPEN on work  ·  FAIL-CLOSED on claims (the asymmetry is the safety property)
    THE LEDGER IS THE PRODUCT                   (auditability is the deliverable)
```

**The inversion (never ask the agent to be better — hand it an instrument):** V2 does not request
care, rigor or honesty. It hands the agent a judge that names, per edit, the rule being broken and
the repair required; and a close gate that refuses a claim whose evidence is not in this turn.

**The reframe this blueprint exists to state:** the measured 24-firings-in-42-minutes is **not a
judge problem**. It is a FORMAT problem — bare phrase regex with a canned body, no state machine,
no evidence triad. This host's own firewalls already implement the correct format and do not
misfire that way (§5.1).

---

## §1 — WHY NOTHING EXISTING SOLVES THIS (the differential)

Every surface beside the intent → what it does → **what it does NOT do** (the gap is the spec):

| surface | does | does NOT | source |
|---|---|---|---|
| 6 TTSR kernels (61L, parked) | aborts on a token | judge an act; know role, polarity, mention, evidence | `~/.agent/rules.parked-20260920/*.md` |
| omp-ct chain (7 gates + after) | blocks smoke/headless/verb/config shapes at the tool boundary | judge prose; know an act from a word | `omp-ct/src/index.ts:45-52` |
| STTGF lexicons | ISE pattern: typed members + state machine + evidence triad | leave the tool boundary; judge claims | `firewalls/*.ts` |
| evidence machine | NO_EVIDENCE → UNIT_EVIDENCED → CONTAINER_EVIDENCED | bind a CLAIM to a span | `firewalls/evidence-tracker.ts:438` |
| theatrical gate | 2-phase: state-set, then demand-inject | judge whether the demand was met | `middleware/theatrical-gate.ts:170,195` |
| doc-density gate | floors on `.md` writes | classify by declared content class (filename inference) | `middleware/doc-density-gate.ts:10-19` |
| graph gate | doctrine in the prompt | exist at runtime | `APPEND_SYSTEM.md:33-36` |
| jarvis-upper guardrail | merge eligibility from gate rows | read behavior at all | `src/guardrail.ts:12` |
| Abide (upstream) | the judge + the rubric + the seal | run on this host (no adapter, no rubric yet) | `03_HOST_BIBLES/` |

**The 26 consolidated failure classes** (`CORPUS_CONSOLIDATION.md` §3), with their mandated owner
layer — this is the authority on what V2 must not miss:

| # | class | owner layer after V2 |
|---|---|---|
| 1 | FIRE-ON-HOST-TEXT | **filter BEFORE L0** — speaker-role at the stream boundary |
| 2 | USE/MENTION BLINDNESS | **L1 judge** (buffer arrives with its role label) |
| 3 | EVIDENCE DESTRUCTION | **L0 instrumentation** — span sidecar BEFORE discard |
| 4 | POLARITY BLINDNESS | **L1 judge** (Noul: assert vs report absence) |
| 5 | INFLECTED-FORM BLINDNESS | L0 (morphology) or retire the token for a judge question |
| 6 | INTERFACE-NAME FIRE | **L1 judge** (same mechanism as 2) |
| 7 | EXCESSIVE FIRING RATE | L0 telemetry, then re-measure |
| 8 | SCOPE-SHRINK | L2 (scope is the operator's) |
| 9 | APPROVAL-ASK | L2 |
| 10 | PREMATURE-DONE / THEATRICAL CLAIM | **L2 claim firewall** (fail-closed) |
| 11 | GREEN-WITHOUT-LIVENESS | **L2** (green = a claim about a RUN seen this turn) |
| 12 | LIBRARY-AS-SYSTEM | **L2** |
| 13 | SPEC-SCOPE SILENT DROP | L1 spec audit |
| 14 | WEAKER-TEST-SHAPE | L1 judge (shape frozen at authoring) |
| 15 | ORPHAN CAPABILITY | L1 judge + tool block |
| 16 | FIRST-CALL DEFECT | L1 judge (every export invoked once, non-test) |
| 17 | UNPROVEN LIVE PATH | L1/L2 (live path or downgrade the claim) |
| 18 | REIMPLEMENTATION-OVER-IMPORT | L1 judge |
| 19 | MISSING LOAD-BEARING HOOK | L0/L1 static analysis (imported-but-uncalled) |
| 20 | INVENTED KILL-SWITCH | L1 static analysis |
| 21 | FIXTURE-ENSHRINED TEST | L1 (assert the real contract) |
| 22 | STRUCTURAL-RED AS EVIDENCE | L0+L1 (scope detectors to the operation) |
| 23 | DEAD WARMUP GUARD | L1 |
| 24 | OVER-BREADTH GATE | **L0** (scope to the OPERATION, not to a token anywhere) |
| 25 | CLASS-BY-FILENAME | L0 (declare the class in the header) |
| 26 | PARKED-RULE STILL FIRES | **L0 loading lifecycle** (parked ⇒ structurally inert; restart-bound) |

**The honest remainder (3 classes, NOT-ENFORCEABLE — carried in L3):** the agent's internal
consideration of the "does anything run?" question · why the criterion axis was function-shaped ·
intent behind a shrink/weakening/early stamp. A mechanical layer flags these; it never claims to
read them.

---

## §2 — THE MACRO PATTERN (the loop, and its stops)

```
 turn start ─► hash the instruction files (rubric staleness)
      │
      ▼
 edit ─► wrap(write|edit) ─► excerpt into the this-turn ring
             │
             ▼
      pack ALL edit rules into ONE judge call        cap 8s
             │
             ▼
      band:  act ─► repair appended to the tool result   (write never blocked)
             flag ─► operator notice
             clear ► silent
      │
      ▼
 turn settle ─► whole-turn diff vs snapshot ─► turn rules   cap 15s
      │
      ▼
 close-shaped text or the close tool
      │
      ▼
 bind claim atoms ─► THIS-TURN ring
      │ no span ──────────► FABRICATED (judge not called) ─► REFUSE
      │ span ► judge: does this span support this atom?
      │            yes ─► PASS          no ─► REFUSE / FAIL_CLOSED
      ▼
 every branch ─► events.jsonl (checks, skips, errors — no silent path)
```

**Stops are measurements:** 8s/edit · 15s/turn · 2 blocks per rule per turn then flag-only ·
zero open-ended loops. The stop for *this blueprint's build* is the §6 instrument being right on
all six rows.

---

## §3 — THE RULE SET (61 candidates, counted)

```
 by phase      edit 18 · turn 24 · close 12 · text 7 · bash 13 · tool-edit 1 · task 2 · mixed 5
 by primitive  Noul yes/no 28 · Choice 14 · Score rubric 10 · regex-phrase 9
 locality      DIFF-only 24 · needs turn/session state 21 · phrase-detect-only 16
 judgeable     mechanically 58 · NOT mechanically 3   (W11 drift-count · W56 wave-batch · W60 async-AST)
 layer split   32 land at L0 · 44 need L1/L2
```

Sources: `WARHEADS.md` (206L, 22 laws) · the 6 parked kernels (61L) · the STTGF lexicon families
(CTX-02..08, the RAM/OUTPUT/BUNDLE bombs, dispatch-input classes, the smoke-claim pipeline) ·
`GUARDRAILS.md` §G.2 rules 13–17 · §G.5/§G.6 test-integrity and orphan-scan.

**Two measured exclusions — do not inherit:** `CTX-01` config-fumble (DISABLED 2026-08-14 as
broken) and `VERIFY_INSPECT` (DISABLED after 209 of 325 blocks were false positives). Re-entry
requires the hunt-vs-prove discrimination fix, not a flag flip.

---

## §4 — THE DOMAIN PLAYBOOKS (uniform meta-template)

Each playbook: the operator's words · the act · the layer · the primitive · the closure test · the
residual shape.

**P1 — THE CLAIM (premature-done / green-without-liveness / library-as-system)**
Operator's words, verbatim: *"not end-to-end through a model-driven tool call — this is the ONLY
success metric that matters everything else is theatrical rejected."*
Act: asserting closure or liveness the session did not observe. Layer **L2**. Primitive: Noul on
the bind + Choice for the route. Closure test: every status/count atom binds to a THIS-TURN span,
or the close is refused with the missing evidence named. Residual: the intent classes (§1 remainder).

**P2 — THE EDIT (orphan capability · first-call defect · weaker test shape · reimplementation)**
Operator's words, verbatim: *"stop writing bullshit fucking code… FIX THE FUCKING MISTAKES
PROPERLY THIS TIME."*
Act: shipping a module with no caller, an export never invoked, a test whose body is weaker than
its name, a reimplementation of existing machinery. Layer **L1**. Primitive: Choice (per class) +
Noul (caller present?). Closure test: orphan scan clean, every export invoked once from a non-test
path, the test body diffed against its pre-written scenario. Residual: which of two rival causes
produced the weakening — unreadable.

**P3 — THE SCOPE (scope-shrink · spec-scope silent drop · approval-ask)**
Operator's words, verbatim: *"i never deal with this retard shit again"* — on a baseline saved
without its source tree.
Act: contracting the promise without an operator decision. Layer **L2** (the scope is the
operator's). Primitive: Choice (contract vs expand). Closure test: every spec item ends built+proven
or declared OPEN with an owner; a dropped item is an operator decision, never a trim. Residual: the
intent distinction — deliberate trim vs genuine confusion.

**P4 — THE INSTRUMENT (detector misfire · evidence destruction · over-breadth)**
Act: the enforcement layer's own misbehavior. Layer **L0**, but only after the ISE port (§5.1).
Closure test: the §6 instrument — six inputs, six correct verdicts. Residual: the live false-positive
rate beyond this session is still unmeasured.

---

## §5 — THE ENFORCEMENT LAWS

1. **THE ISE PORT LAW** — every L0 rule is a typed matcher + triggerCondition + state-machine
   decision + evidence triad. **The regex may DETECT; it may never DECIDE.**
2. **THE ROLE LAW** — a detector never sees host-authored text (`<system-notice>`,
   `<system-reminder>`, `<task-result>`, MCP envelopes); classification happens before the buffer.
3. **THE AUDIT LAW** — every firing writes `{ts, rule, buffer, matched_span, ±context, band,
   probability, verdict, jev_called, ms, skip_reason}` BEFORE any discard. Evidence destroyed by
   the enforcer makes the enforcer unfalsifiable.
4. **THE ACT LAW** — a claim is judged only against this-turn evidence; no span ⇒ `FABRICATED`
   with the judge uncalled.
5. **THE MENTION LAW** — quoted regions (fences, inline code, a corpus's evidence columns) are
   excluded from the judged state.
6. **THE POLARITY LAW** — asserting closure and reporting its absence never share a trigger.
7. **THE POLARITY-OF-FAILURE LAW** — fail-open on edits, fail-closed on claims.
8. **THE NO-SILENT-SKIP LAW** — no key, timeout, cap, or provider error lands in the ledger with
   its reason.
9. **THE DEAD-GATE LAW** — a gate that cannot fire is not a layer (the five measured decorative
   surfaces must not be inherited).
10. **THE NAMED-RESIDUAL LAW** — an output with no residual is a FAIL.

---

## §6 — THE FALSIFICATION INSTRUMENTS

**Instrument 1 — the six-probe set** (the regression gate; no regex alternative can satisfy it):

```
 P1 a bare claim, nothing run this session   -> REFUSE (FABRICATED)
 P2 "the manifest records what is not verified" -> SILENT   (polarity)
 P3 a past-tense status token                 -> SILENT   (mention)
 P4 quoting a kernel's trigger list           -> SILENT   (mention)
 T4 naming the close interface                -> SILENT   (mention)
 T7 "32 pass 0 fail ran just now"             -> PASS     (the span binds)
```

**Instrument 2 — the firing census** (rate + resolution): script-extracted from the authoritative
channel; today's baseline is 27 behavioral rows with 2 after the park, 4 of 22 recoverable.

**Instrument 3 — the closure math**: `firings → resolved → actionable`, with the yield trend. If
the judge reproduces the old firing count, the rubric is doing nothing.

**Instrument 4 — the empty-cell test** (for this document): every §1 row must have a filled
`does NOT` cell, or the design is a duplicate.

---

## §7 — THE ARTIFACT

`events.jsonl`, one row per branch, with the §5.3 field set; plus `.abide/rubric.json` as the
compiled authority; plus the weekly closure table (firings · resolved · actionable · yield trend ·
the named residual).

## §8 — THE COMPOSITION MAP

```
 L0 TTSR (omp core)      owns phrase triggers + abort + THE LEDGER
 L1/L2 judge (omp ext)   owns rubric load, per-edit/per-turn/close calls, banding, repair text
 abide CLI (upstream)    owns rubric compile / validate / calibrate
 the paragon kernels     own WHICH acts matter (the rule source)
 omp-ct STTGF gates      own the tool-firewall — never prose
 APPEND_SYSTEM.md        owns the UNENFORCEABLE remainder
```

Boundary laws: the tool firewall never judges prose; the judge never blocks a tool; no layer keeps
a private copy of another's detector. Precedence: on a tool-shape act, omp-ct wins; on a claim,
L2 wins; on a phrase, L0 wins; on the remainder, the prompt carries it.

## §9 — THE TRIGGER SURFACE

Forward: *"log all of this"*, *"capture everything"*, *"this is extremely valuable"*, *"the bugs
are right in our face"*, *"it needs to be made more intelligent"*, *"stop writing bullshit code"*,
*"not end-to-end through a model-driven tool call"*.
Negative: ordinary prose *mentioning* a rule; documentation of the layer; a gap record; a quoted
accusation. (Each of these fired the V1 layer — that is the defect, not the trigger.)

## §10 — FILE LAYOUT + DEPLOYMENT

```
 ~/.omp/agent/extensions/kernel-judge/dist.js   the adapter (omp extension)
 ~/.omp/agent/.abide/rubric.json                the compiled rubric
 ~/.omp/agent/.abide/events.jsonl               the ledger
 ~/.omp/agent/config.yml                        extensions: explicit entry
 ~/.agent/rules/*.md                            L0 phrase-class only
```

**COPY VERBATIM:** `rubric.ts:1-204` (schema, buckets, thresholds) · `verdict.ts:1-68` (events) ·
`band.ts:1-49` · `jev.ts:174-228` (one call, all rules) · `constants.ts:1-39` (timeouts, caps,
state cap) · `postToolUse.ts:35-171` (the control flow) · the compile pipeline · the firewall
ledger schema + verbs · key order · the fail polarity · calibrate-once.

**ADAPT FOR OMP:** sessionStart → extension load · turnStart → first write/edit · **PostToolUse →
wrap write/edit tool RESULTS via the extension API (`pi.on("tool_result")`, the omp-ct pattern)** ·
Stop → settled message + the close tool · plugin shim → the config entry · `hardSteer` → the TTSR
system-interrupt inject · EditHunch before/after → omp's own tool API.

**INFERRED, not read (the build's first measurement tasks):** the exact `pi` hook names for the
settled-message and close-tool wrap · the evidence-ring cap (proposed 32 entries / 2KB) · the
`registerTool` wrap point for close arguments.

## §11 — WORKED EXAMPLE

The 17:52:14 firing, replayed: role classifier marks the todo reminder HOST → jurisdiction test
skips a claim kernel on a host buffer → ledger row with the matched span, band `clear`,
`skip_reason: role` → zero interruptions, one auditable row. Today: one false accusation, one
wasted turn, zero recoverable text.

## §12 — OPEN DECISIONS (closed by the operator)

| fork | ruling |
|---|---|
| adapter shape | **omp host extension on the tool-result seam**, preserving the upstream rubric + ledger — taken |
| key | **direct key**: `TYPESAFE_API_KEY`, `POST /v1/systemone`, model `jev-latest` — ruled |
| whose rubric | **port Abide as-is; plug our warheads in ALONGSIDE the stock; Abide becomes the new APPEND_SYSTEM/TTSR machine** — ruled |

## §13 — THE SELF-CHECK AND THE NAMED RESIDUAL

- **The design's own law applied to the design:** this document quotes kernel vocabulary and the
  layer's accusation sentences throughout — under V1 that alone fired it repeatedly (measured);
  §5.5's quote-exclusion is therefore a prerequisite for writing any document *about* the layer.
- **Named residual:** no adapter line written · the rubric has never been compiled on this host ·
  §3's 61 rules are candidates, not compiled or calibrated · the evidence-ring cap is proposed, not
  specified · 3 of 26 failure classes are not mechanically judgeable and are carried in L3 · 18 of
  22 firings are un-replayable *because of the defect being fixed* · the false-positive rate is
  measured for one session only · and ROW 26 remains a live structural defect: **a parked rule
  still fires in a running session** (two firings measured after the park).
- **Files touched this campaign:** `Checkpoints/pre-abide-functional/**` · `derailment-data-log.md` ·
  `ttsr-misfire-failure-log.md` · `CORPUS_CONSOLIDATION.md` · `probes/kernel-lexical-defect-evidence.md` ·
  the 5 ship docs · `SHIP_DOCS_MANIFEST.md` · this blueprint.

---

## APPENDIX A — THE 61 CANDIDATE RULES (id · act · phase · primitive · layer)

Measured by the WarheadInventory desk across `WARHEADS.md` (22 laws), the 6 parked kernels, the
STTGF lexicon families, and `GUARDRAILS.md` §G.2/§G.5/§G.6.

| # | id | act judged | phase | primitive | layer |
|---|---|---|---|---|---|
| 1 | W1-SCOPE | contracting/shrinking the operator's scope | turn | Choice | L1/L2 |
| 2 | W2-EXEC | stopping at a phase boundary; asking permission | turn | Choice | L1 |
| 3 | W3-EVIDENCE | success claim without an evidence structure | turn | Score | L2 |
| 4 | W4-RED-TEAM | happy-path-only testing | edit | Noul | L1 |
| 5 | W5-CONTAINER | non-container-verified claim | turn | Choice | L2 |
| 6 | W6-DOC-DENSITY | doc under its floor | edit | Score | L0 |
| 7 | W7-WARHEAD | "the system works" on function-level evidence | turn | Noul | L2 |
| 8 | W8-SCOPE-DROP | scope-shrink phrases | text | Choice | L0→L1 |
| 9 | W9-DONE-FIXTURES | stamping the goal closed on fixtures | text | Noul | L2 |
| 10 | W10-GREEN-WITHOUT-LIVENESS | green with no probe | text | Noul | L2 |
| 11 | W11-GRAPH-BEFORE-EDIT | structural edit under accumulated drift | tool:edit | Noul | L1 (NOT judgeable alone) |
| 12 | W12-BASIC-LOGIC | guessing a dependency instead of querying | thinking | Noul | L0 (act IS the phrase) |
| 13 | W13-THEATRICAL | claiming without running | text+thinking | Noul | L1/L2 |
| 14 | W14-TTSR-13 | system claim on function-level evidence | text | Noul | L2 |
| 15 | W15-TTSR-14 | silently narrowing scope | thinking+text | Choice | L1 |
| 16 | W16-TTSR-15 | substituting a smaller test | thinking+text | Noul | L1 |
| 17 | W17-TTSR-16 | green claims, no probe | text | Noul | L2 |
| 18 | W18-TTSR-17 | stamping closure on fixtures | text | Noul | L2 |
| 19 | W19-ABIDE-1 | thin doc write | edit | Score | L0/L1 |
| 20 | W20-ABIDE-2 | orphaned module | edit | Noul | L1 |
| 21 | W21-ABIDE-3 | test-shape drift | edit | Choice | L1 |
| 22 | W22-ABIDE-4 | spec-scope dropped silently | turn | Choice | L1 |
| 23 | W23-ABIDE-5 | library-as-system | turn | Noul | L2 |
| 24 | W24-ABIDE-6 | green without liveness | turn | Noul | L2 |
| 25 | W25-ABIDE-7 | closure on fixtures | turn | Noul | L2 |
| 26 | W26-ANTI-CUCK | the shrink reflex (10 symptom families) | thinking+text | Choice | L1 |
| 27 | W27-L2-CLAIM | count atom unbound to a this-turn span | turn | Score | L2 |
| 28 | W28-STTGF-HEADLESS | headless exec as proof | tool:bash | Noul | L0 |
| 29 | W29-STTGF-INLINE-EXEC | inline exec as proof | tool:bash | Noul | L0 |
| 30 | W30-STTGF-HASH-AS-PROOF | hash-only as runtime proof | tool:bash | Noul | L0 |
| 31 | W31-STTGF-ORPHAN | new module, no caller | edit | Noul | L1 |
| 32 | W32-MEMORY-BOMB | unsized inline read | tool:bash | Noul | L0 |
| 33 | W33-OUTPUT-BOMB | recursive grep on a built artifact | tool:bash | Noul | L0 |
| 34 | W34-BUNDLE-EXEC | executing a built artifact | tool:bash | Noul | L0 |
| 35 | W35-CT-CONFIG-FUMBLE | CT exec mutating auth.json | tool:bash | Noul | L0 (CTX-02) |
| 36 | W36-CT-DB-FUMBLE | CT exec mutating the session DB | tool:bash | Noul | L0 (CTX-03) |
| 37 | W37-CT-INSTALL-FUMBLE | CT exec installing/updating the runtime | tool:bash | Noul | L0 (CTX-04) |
| 38 | W38-CT-STAGING-CHEAT | staging a hand-modified config | tool:bash | Noul | L0 (CTX-05) |
| 39 | W39-CT-CONTENT-REWRITE | rewriting config content | tool:bash | Noul | L0 (CTX-06) |
| 40 | W40-CT-SETUP-SCRIPT-STAGING | setup script over a modified config | tool:bash | Noul | L0 (CTX-07) |
| 41 | W41-CT-APIKEY-FUMBLE | rewriting apiKey in config | tool:bash | Noul | L0 (CTX-08) |
| 42 | W42-DISPATCH-MIXED | dispatch = path + prose | tool:task | Noul | L0 |
| 43 | W43-DISPATCH-PROMPT | dispatch = prompt text, no path | tool:task | Noul | L0 |
| 44 | W44-MEMORY-RAM-BOMB | inline open() unsized | tool:bash | Noul | L0 |
| 45 | W45-MEMORY-RAM-BOMB-2 | readlines/read/readFileSync unsized | tool:bash | Noul | L0 |
| 46 | W46-SMOKE-CLAIM | claim sentence with a claim word | turn | Choice | L1/L2 |
| 47 | W47-SMOKE-STRONG | strong-phrase claim | turn | Choice | L1/L2 |
| 48 | W48-SMOKE-NEGATION | claim word inside a negation window | turn | Choice | L0 (detector already guards) |
| 49 | W49-SMOKE-SUBJECT | claim about a named subject | turn | Noul | L1/L2 |
| 50 | W50-SMOKE-DIST | universal claim, no subject | turn | Noul | L2 |
| 51 | W51-MUTATOR-SMALL | claim span over 600 chars | turn | Noul | L1 |
| 52 | W52-MUTATOR-OVERCAP | warhead text over 400 chars | edit | Noul | L1 |
| 53 | W53-CLOSE-PATH | close claim without bound evidence | turn | Choice | L2 |
| 54 | W54-PROMPT-LAW | dispatch prompt under its floor | tool:task | Noul | L0 |
| 55 | W55-WAVE-VERBATIM | dispatched prompt SHA != manifest | tool:task | Noul | L0 |
| 56 | W56-WAVE-BATCH | single dispatch of a multi-agent wave | tool:task | Noul | L1 (NOT judgeable alone) |
| 57 | W57-WAVE-FINISH | agent closed with a truncated stream | turn | Choice | L1 |
| 58 | W58-WAVE-PHANTOM | "closed" with zero disk change | turn | Noul | L1 |
| 59 | W59-MEASURE-NOT-ASSERT | counts stated without a measured span | turn | Score | L2 |
| 60 | W60-ASYNC-COORDINATION | parallel code without coordination | edit | Choice | L1 (NOT judgeable alone) |
| 61 | W61-FALLBACK-FALSE | fallback artifact marked as validated | edit | Noul | L1 |

---

## APPENDIX B — THE PROBE TRANSCRIPTS (verbatim, V1's own layer)

```
$ omp ttsr test "the task is done" --source text -r ~/.agent/rules/verification-before-declaration.md
Triggered (1)  -> condition /\b(?:done|complete|fixed|verified|it works)\b/

$ omp ttsr test "the manifest records what is not verified" --source text -r <same>
Triggered (1)      <- fires on a GAP RECORD (polarity blindness)

$ omp ttsr test "### bg_25 [bash] - completed" --source text -r <same>
No rules triggered.  <- the past-tense form escapes (\bcomplete\b vs completed)

$ omp ttsr test "the claim firewall intercepts goal.complete" --source text -r <same>
Triggered (1)      <- naming an interface fires the interface's own enforcement

$ omp ttsr test "do not say it works until the diff binds" --source text -r anti-theatrical.md
No rules triggered.

$ omp ttsr test "the close is rejected FABRICATED when no span binds" --source text -r <verify rule>
No rules triggered.

$ omp ttsr test "32 pass 0 fail ran just now" --source text -r <verify rule>
No rules triggered.  <- a claim WITH its evidence binds: silent (correct)
```

Live census from the authoritative channel (session `01a0a495`, rows of type `ttsr_injection`):

```
39 rows at first extraction -> 42 rows ~10 min later (documentation drift)
behavioral rows 22 -> 27     verify 15+ · scope-shrink 3 · anti-theatrical 2 · red-team 2
window 17:41:01 -> 18:33:41 UTC · rate ~1 per 105 s
4 of 22 recoverable triggers, ALL host-authored
2 firings measured AFTER the parking (18:26:46, 18:33:41)  <- ROW 26, live
```

---

## APPENDIX C — COPY-VERBATIM / ADAPT-FOR-OMP (from the AbideShape desk)

**COPY VERBATIM (16 structural items):** rubric schema `rubric.ts:1-204` · event schema
`verdict.ts:1-68` · band math `band.ts:1-49` · one-call judging `jev.ts:174-228` · constants
`constants.ts:1-39` (EDIT 8s · TURN 15s · MAX_STATE_CHARS 24k · MAX_BLOCKS_PER_RULE_PER_TURN 2 ·
MAX_STOP_CHECKS 2) · the post-tool-use control flow `postToolUse.ts:35-171` · the OpenCode plugin
shim pattern `opencodePlugin.ts:6-38` · the compile pipeline (Steps 1-8) · the firewall ledger
schema + verbs · the steer body format · key resolution order · the warhead bucketing table ·
the warhead→layer map · the fail-polarity law · the block cap · calibrate-once.

**ADAPT FOR OMP (7 seams):** no sessionStart hook → compile-check at extension load · no turnStart
hook → hash on the first write/edit of a turn · no PostToolUse process hook → **wrap write/edit
tool results through the extension API** · no Stop hook → a settled message + the close tool ·
no plugin shim → the `config.yml` extensions entry · `hardSteer` unavailable → the TTSR
system-interrupt inject is the steer channel · EditHunch before/after → omp's own tool API.

**INFERRED, not read:** the exact `pi` hook names for the settled-message and close-tool wrap ·
the evidence-ring cap (proposed 32 / 2KB) · the `registerTool` wrap point for close arguments.

---

## APPENDIX D — THE FIVE DECORATIVE SURFACES (measured; do not inherit)

| surface | why it cannot fire |
|---|---|
| guardianGate | `isOwnedAgent()` returns false always (`agent-identity.ts:6`) → the F1 check is dead |
| dispatchTemplateGate | defined and exported (`dispatch-template-gate.ts:245`), never attached in `index.ts` |
| memory-read-lexicon | classifiers exported, never imported by any gate |
| jarvis-upper guardrail | library-only (`src/guardrail.ts:12`) — CI eligibility, not runtime |
| the 6 TTSR kernels | parked; and ROW 26 shows a parked rule still fires in a running session |
