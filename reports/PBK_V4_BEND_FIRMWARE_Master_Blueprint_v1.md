# PBK V4 — THE BEND FIRMWARE MASTER BLUEPRINT v1

> **Series:** PBK V4 (the Bend-firmware lineage; the V3 abort-layer series is separate)
> **Class: system** · Generated 2026-09-29 · bend 2.0.32 on host
> **Authority:** this document. It supersedes `PLANNING_SUITE_PBK_V4_BEND_FIRMWARE.md`
> (written before the no-Jev research; it treats the decider as a foreign model — this one
> does not).
> **Evidence bar:** every claim is marked **BUILT** (anchored `file:line`), **MEASURED**
> (a command run this session), **PROPOSED** (designed here, owner named), or **UNKNOWN**.
> No fourth state.

---

## §0 · THE CLASSIFICATION AND THE DIFFERENTIAL

### 0.1 THE CLASSIFICATION

**ARCHITECTURAL.** It restructures how PBK's components fit: the enforcement moves from
*TS code that respects a doctrine* to *a proven decision core with a declared undefined set*.
The interfaces others depend on change. (brainstorming: when in doubt, the heavier path.)

## §0A · SCOPE — the mission's nouns, and what is out

**PBK** (the system) · **Bend** (the language) · **firmware** (Bend's role: the layer the host
cannot bypass) · **Paragon** (the architecture) · **kernel** (the artifact that carries the
enforcement) · **law** (the operator-owned invariant) · **gate** (the refusal that makes a law
firmware) · **no-Jev** (the requirement: no model decides).

**evidence** (the decision input: the ladder reads artifact events, never sentiment — `NO_EVIDENCE → UNIT → CONTAINER`, and smoke never lifts a container claim) · **no-Jev** (the requirement: no model decides).

**IN:** the four unwired machines as the decision core; the **evidence** ladder as the sole decider; the coherence gate; the rule schema
(predicate + undefined set + severity + triad); Bend's proven fragment; the RED inventory; the
container-isolation proof.
**OUT:** replacing Jev with another model (violates the requirement); widening a rule's band instead of proving its discrimination;
any design where a **gate** acts on a mention rather than on an act; the 11 middleware gates'
internal patterns (their SHAPE is in scope); Bend's compiler internals.

### 0.3 THE DIFFERENTIAL — 13 rows; the `does NOT` column IS the specification

| # | the existing thing | what it does | **★ what it does NOT do** |
|---|---|---|---|
| 1 | `src/middleware/*.ts` (11 gates) | pattern-checks a call, returns a block verdict | **cannot enforce an architecture**; one is a literal no-op (`phantom-gate.ts:51`) |
| 2 | `extensions.DISABLED-20260924/lexicon-gate/` | scores a span → bands → aborts + injects | **does not decide**; a band on a fitted score; PARKED |
| 3 | `~/.omp/run/lexicon-ledger.jsonl` | 1245 decision rows | **0 carry a judgment** (`grep -vc '"jev":null'` → 0) |
| 4 | the JevK5 decider at `:8090` | answers typed questions | **never once consulted for a PBK decision** (0 of 1245) |
| 5 | `Codename:PARAGON/src/machines/*.ts` (6) | pure state machines over event alphabets | **referenced in 0 files** — built, never wired |
| 6 | `Codename:PARAGON/src/machines/evidence-machine.ts` | the `NO_EVIDENCE→UNIT→CONTAINER` ladder; smoke never lifts | not called by any live path |
| 7 | `claim-gate.ts` | "block the CLAIM, not the WORK" | not called; its `onToolBefore` returns `blocked:false` and nothing invokes it |
| 8 | `middleware/phantom-gate.ts:52` | decides "a claim citing an unrun tool" | defined, **never called**; the hook is a no-op |
| 9 | `src/enforcement/matrix.ts:95-106` | 6 enforcement verdicts | **4 are `verified:true` literals**; the 6th is skipped on a null pin |
| 10 | `~/.omp/agent/rules/*.md` (9) | scored PatternFamilies + a `condition:` regex | **no `severity`**; **one shared band**; three of five source kinds never produced |
| 11 | the warheads + TTSR | prose-law enforcement | TTSR registers **0**; prose is not a proof |
| 12 | MPSE `MathContract` | runtime evaluation of contracts | basis is **`EVALUATED_*`**, never `PROVEN` |
| 13 | **Bend, as used so far** | a CI gate + one emitted module | **not the kernel's language** — and until this research, the decision term was still a model |

**THE EMPTY CELL:** rows 5–8 are **built and unwired**; rows 9–10 are **armed in appearance**;
row 13 is the design gap. **That column is the specification of V4.**

---

## §1 · THE MACRO BLUEPRINT — the whole system on one page

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PBK V4 — THE FIRMWARE STACK                                               │
│                                                                            │
│  L0  THE LAWS        LAWS.bend      operator-owned, machine-uneditable.     │
│      the constitution               Each law names a FORBIDDEN BEHAVIOUR.   │
│            │ discharged by                                                 │
│            ▼                                                               │
│  L1  THE KERNEL      kernel.bend    ★ THE DECISION CORE AS TYPES:           │
│      the microcode                  Flag · Band · Arm · Verdict · Finding · │
│                                     Escape. A violation has no term.        │
│            │ discharged by                                                 │
│            ▼                                                               │
│  L2  THE PROOFS      PROOF.bend     one `def Laws.<law>` per law.           │
│            │ checked by                                                    │
│            ▼                                                               │
│  L3  THE GATE        --verdict      the Lean-proven kernel re-checks.       │
│                                     SOUND, NOT COMPLETE.                    │
│            │ on green                                                      │
│            ▼                                                               │
│  L4  THE ARTIFACT    kernel.mjs     the SAME source, emitted as an ES       │
│      the executable                 module. Proven and running are one file │
│            │ imported by                                                   │
│            ▼                                                               │
│  L5  THE HOST        the extension  drives it; cannot bypass L1.            │
│      the OS         + the 4 machines THE NO-JEV DECISION CORE               │
│                                                                            │
│  ★ THE DECIDER IS NOT IN THIS STACK. A model is FOREIGN; --verdict refuses  │
│    foreign code. THE LANGUAGE'S TRUST BOUNDARY IS THE ARCHITECTURE'S.       │
└────────────────────────────────────────────────────────────────────────────┘
```

**Every box names a lifecycle section below.** [ruler: 15 lines · 76 cols · limit 76]

---

## §2 · THE CORE — the reduction and the derived laws

### 2.1 THE ONE MECHANISM (blueprinting MOVE 3)

```
PBK ENFORCES ITS ARCHITECTURE BY DISCIPLINE AT EVERY LAYER THAT MATTERS.
A DISCIPLINE IS A LAW THE LAYER ABOVE IS ASKED TO RESPECT.
SO EVERY VIOLATION IS DISCOVERED BY REVIEW — AFTER THE FACT.

AND THE INTELLIGENCE IT NEEDED WAS NEVER THE MODEL:
  (A) DECISIONS OVER ARTIFACTS   did it run? after the claim? what degree? legal edge?
                                → DECIDABLE · MECHANICAL · PROVABLE · NO MODEL
  (B) DECISIONS OVER PROSE      "is this utterance theatrical?"
                                → NOT decidable without world knowledge [Rice 1953]
  V3 put a model on (B) — 0 of 1245 ledger rows carry a judgment.
  (A) WAS BUILT AND NEVER WIRED.
```

**It explains instances the operator never listed:** why the ledger is 1245×0 (the decision term
was never a required field); why four machines sit unreferenced (nothing routes to them); why a
middleware gate is a literal no-op and nothing failed (no mechanism notices an empty guard); and
why the source-kind classifier is three-fifths dead (the live path cannot reach its branches).

### 2.2 THE DERIVED LAWS (blueprinting MOVE 4)

```
FIRMWARE    = A LAW THE LAYER ABOVE CANNOT BYPASS.
DISCIPLINE  = A LAW THE LAYER ABOVE IS ASKED TO RESPECT.
A LAW IS FIRMWARE IFF VIOLATING IT FAILS THE BUILD.

A MODEL WAS NEVER THE INTELLIGENCE — THE EVIDENCE LADDER IS.
THE PROSE IS READ; THE EVIDENCE DECIDES.
SOUND (no false negatives) AND COMPLETE (no false positives) IS IMPOSSIBLE —
  THEREFORE INCONCLUSIVE IS THE ONLY HONEST TERMINAL, AND IT IS FORCED, NOT STYLISTIC.
```

### 2.3 THE INVERSION (blueprinting MOVE 5 — the most important move)

```
BAD:   "be careful about misfires"            ← an adjective
GOOD:  "no discrimination proof -> no ACT."   ← a mechanical act-gate

BAD:   "make the rules smarter"               ← an instruction to a person
GOOD:  "a rule without its undefined set CANNOT LOAD."

BAD:   "test the gate"                         ← a wish
GOOD:  "every guard ships a MUST-FAIL MUTANT; the mutants that pass become the work."
```

---

## §3 · THE LIFECYCLE — per stage, WHAT / HOW / WHERE / WHY

| stage | WHAT | HOW | WHERE | WHY |
|---|---|---|---|---|
| **S1 the law** | one operator-owned invariant | `law <name>:` + the forbidden behaviour in a comment | `firmware/LAWS.bend` | the machine may not edit it |
| **S2 the type** | the invariant as a shape | a sum/product type that admits no violating term | `firmware/kernel.bend` | types are the only enforcement a caller cannot skip |
| **S3 the proof** | the discharge | `def Laws.<name>(): {==}` | `firmware/PROOF.bend` | an open law prints SOME PROOFS FAIL |
| **S4 the gate** | the build refusal | `bend PROOF.bend --verdict` | CI + pre-arm | sound, not complete |
| **S5 the artifact** | the runtime | the emitted ES module | imported by the host | one source — no drift |
| **S6 the corpus gate** | prose vs artifact | classify the span before any score | `index.ts:80` `decide()` | 30.4% of the corpus is not prose |
| **S7 the detector** | a FLAG only | the rule matches; it returns a `Flag` | `firmware/kernel.bend` | F1: a detector cannot construct an `Arm` |
| **S8 the router** | the band routes | `Silent · Gray · Fire` — no action field | `firmware/kernel.bend` | F6: a band must not decide |
| **S9 the escape** | the exemption, consumed first | `checkEscape` returns a value the block arm requires | `firmware/kernel.bend` | F5: order becomes a type dependency |
| **S10 the decision** | the EVIDENCE LADDER | the four machines (§4) | `Codename:PARAGON/src/machines/*` | the no-Jev intelligence |
| **S11 the act-gate** | discrimination before action | the coherence rule (§5) | `firmware/coherence.bend` | stops the misfire flood |
| **S12 the triad** | the record | `{Pattern, State, Evidence}` enforced by arity | `firmware/kernel.bend` | F3: no triplet, no finding |

**THE AUTHORING RECIPE (how to add law F-11):**
```
1 · NAME the invariant the OPERATOR relies on — source it from the canon, never the code
    (sourcing it from the implementation bends the spec to whatever the code already does)
2 · STATE the forbidden behaviour + its mechanical consequence
3 · ★ WRITE THE MUST-FAIL MUTANT FIRST — it is the law's specification
4 · CARVE the type — make the violation UNCONSTRUCTIBLE, not detectable
5 · PROVE it  →  6 · ADD THE BATTERY PIN  →  7 · RUN THE HARNESS, record the verdict
```

---

## §4 · ★ THE NO-JEV DECISION CORE — the four machines, built and unwired

```
$ for m in evidenceMachine ClaimGate workflowMachine mpse-discharge; do grep -rl "$m" …; done
  evidenceMachine 0   ClaimGate 0   workflowMachine 0   mpse-discharge 0
  phantomClaimCheck 1 (the definition)   RecordedRunSet 5 ★ instantiated AND recording
```

### 4.1 `evidenceMachine` — the testing-degree ladder
```
states      NO_EVIDENCE → UNIT_EVIDENCED → CONTAINER_EVIDENCED   (+ UNEVIDENCED, the query)
events      UNIT_PASSED · CONTAINER_PASS · SMOKE_RUN
invariants  E_RING_CAP (50) · the HONEST-STATE invariant: the degree must equal the
            strongest entry — a CONTAINER entry with a UNIT state is a breach
★ SMOKE NEVER LIFTS A CONTAINER CLAIM.
WHERE       Codename:PARAGON/src/machines/evidence-machine.ts
WHY         a claim's testing degree is a function of its artifact events — no model
```

### 4.2 `ClaimGate` — block the CLAIM, not the WORK
```
onAgentClaim(sid, text, triad, seq)  → ARMS; demand TTL = 8 seq (consume-once)
onToolBefore(tool, args)             → { blocked: false }   ★ ALWAYS — the work proceeds
CLAIM_GATE_ESCALATION_AT = 3
WHERE       machines/claim-gate.ts
WHY         a gate that blocks work is a gate that gets disabled; gating the CLAIM is
            the only posture that survives contact with a build
```

### 4.3 `workflowMachine` — REPORT is unreachable
```
REPORT is UNREACHABLE from TEST or RUNTIME in state LEGIT — a finite transition table
WHERE       machines/workflow-machine.ts
WHY         finite-state reachability is DECIDABLE (linear) — provable, and A4 lists it
```

### 4.4 `phantomClaimCheck` — the claim that cites an unrun tool
```ts
export function phantomClaimCheck(recorded: RecordedRunSet, text: string): boolean {
  if (!CLAIM_REFERENCE_RE.test(text)) return false;        // ★ THE DETECTOR (a flag)
  return !OWNED_TOOL_NAMES.some((t) => recorded.has(t));   // ★ THE DECISION (a set lookup)
}
```
```
WHERE       middleware/phantom-gate.ts:52
WHY         ★ THE MODEL, IN ONE FUNCTION: the pattern DETECTS a claim-reference; the
            DECISION is membership in the session's own tool log. Decidable, no model,
            and F1-compliant by construction.
★ BUT ITS HOOK IS A NO-OP:  phantomGate() → `void recorded; return async () => undefined`
★ AND ITS LIST IS STALE:     RED-0001 (see §14)
```

### 4.5 THE CONVERSION (what replaces the model)
```
V3   "score this prose for theatricality"                      → needs a model
V4   "this text cites a verification; does the session carry the tool result it cites,
      AFTER the claim?"                                         → a regex DETECTS the claim,
                                                                  a SET LOOKUP decides it
```

---

## §5 · ★ THE COHERENCE GATE — the mechanical anti-misfire mechanism

```
THE CHAIN (five links; each enables the next)
 1 BRITTLENESS    surface matches outnumber true violations
 2 BASE RATE      a good per-item FPR still floods: at 1-in-1e5 prevalence you need an
                  FPR ~1e-5 for a 66% detection rate
 3 UNCALIBRATED   a raw score + a fixed threshold turns the flood into ACTS
 4 SELF-SIGNED    a verdict that signs itself removes the only sensor
 5 ★ THE COHERENCE RULE:  NO DISCRIMINATION PROOF -> NO ACT.
```

```
(a) ROC > chance                         the detector separates AT ALL
(b) a 2x2 table WITH confidence intervals the estimate is bounded
(c) NEGATIVE CONTROLS                     it does not fire on the clean set
(d) PRECISION AT THE OPERATING POINT      on a LARGE legitimate corpus, never a fixture
(e) the BASE RATE declared                PPV = (1-beta)R / (R - betaR + alpha)
ABSENT ANY -> the rule may RECORD but NOT ACT. It returns INCONCLUSIVE.
```

**MEASURED LOCALLY:** all 9 rules share ONE band `{0.3, 0.62}` from a handful of authored cases,
and **no rule carries a `severity`**. By this gate, **no rule currently qualifies to act.**

---

## §6 · THE RULE SCHEMA — a rule that cannot state these four cannot load

```
interface DispatchableRule {
  id:        string
  predicate: (input: ClosedInput) -> Bool    (a) OVER A CLOSED ALPHABET
                                             — tool names, paths, JSON keys, exit codes,
                                               ledger rows; NEVER prose semantics
  undefined: ClosedInput[]                  (b) ★ THE UNDEFINED SET — the inputs on which
                                             the rule claims NOTHING (mention vs act, an
                                             empty corpus, a foreign locale, a partial write)
                                             An input outside the set -> INCONCLUSIVE
  severity:  'CRITICAL'|'HIGH'|'MEDIUM'|'LOW'  (c) absent from all 9 rules today
  triad:     {pattern, state, evidence}     (d) no triplet, no finding
}
★ `loadRules` THROWS on a rule missing any of the four — extending the anti-silent-drop
  instinct PBK ALREADY HAS (it throws today on a bad regex or a missing use-bank).
```

**WHY (b) IS THE LOAD-BEARING FIELD:** McKeeman's false-positive class, verbatim — *"may differ
and yet still be correct … unspecified, undefined, or implementation-defined constructs."*
**The STTGF incident and the CT gate's refusal of this blueprint are BOTH that class**: a
detector firing on a mention because its undefined set was never declared.

---

## §7 · THE TYPES + THE ENGINE CHECKS

### 7.1 THE TYPE CONTRACTS (the kernel, verbatim shapes)

```python
import Base

# ── THE SPAN — what the corpus gate sees ─────────────────────────────────────
type Span is Data:
  Prose{text: String}       # written as a sentence
  Blob{json: String}        # a tool-call argument, serialized
  RuleText{line: String}    # a rule's own body, or a diagnostic line

# ── THE FLAG — ★ F1: NO VERDICT FIELD EXISTS ─────────────────────────────────
type Flag is Data:
  Flag{rule: String, hits: Nat}

# ── THE BAND — ★ F6: NO ACTION FIELD EXISTS ──────────────────────────────────
type Band is Data:
  Silent{} | Gray{} | Fire{}

# ── THE VERDICT — ★ F9: only two authorize ───────────────────────────────────
type Verdict is Data:
  Proven{id: String}
  Measured{n: Nat, corpus: String, baseline: Nat}
  Claimed{prose: String}

# ── THE ARM — ★ F4: the ONLY enforcement verb, and it is a RETURN ─────────────
type Arm is Data:
  Block{code: String, remedy: String}
  Demand{code: String, remedy: String}
  Allow{}

# ── THE FINDING — ★ F3: three fields or no constructor ───────────────────────
type Finding is Data:
  Finding{pattern: String, state: String, evidence: String}
```

### 7.2 THE ENGINE CHECKS (execution order, each with its guard)

| # | the check | the guard | on failure |
|---|---|---|---|
| E1 | `gateCorpus(span)` | the span is prose | non-prose → `Allow{}`, STOP (30.4% of the corpus) |
| E2 | `detect(span, mech)` | returns a **Flag** — no verdict is constructible | a detector returning an Arm **is a type error** |
| E3 | `bandOf(flag, spec)` | returns a **Band** — no action is constructible | a band carrying an Arm is a type error |
| E4 | `checkEscape(mech)` | returns `Or(Escaped, NotEscaped)` | consumes the exemption BEFORE the block arm |
| E5 | `decide(span, flag)` | the **evidence ladder** — `Claimed → false`, `Measured{n>0} → true` | an empty measurement → `false` |
| E6 | `coherence(rule)` | the five-part discrimination proof exists | absent → the rule may `Record` only |
| E7 | `triad(flag, band, evidence)` | all three fields present | absent → no `Finding` term exists |
| E8 | `advance(v)` | takes a `Pass{}` | an `Inconclusive` produces no `Pass{}` — **F2** |

**THE ORDER IS LOAD-BEARING:** E1 before E2 (never score a non-prose span); E4 before any block
(the exemption); E6 before any act (the coherence gate). **Each ordering is a type dependency,
not a convention.**

---

## §8 · THE INVOKE PSEUDOCODE (one mechanism, walked end to end)

```
┌──────────────────────────────────────────────────────────────────────┐
│  judgeCall(span: Span, mech: Mechanism, ticket: Ticket) -> Arm       │
│                                                                      │
│  IN:  span    the text under decision                                │
│       mech    the closed mechanism type                              │
│       ticket  the authorization record                               │
│                                                                      │
│  1  k <- gateCorpus(span)              // E1                         │
│       Blob{} | RuleText{}  -> return Allow{}   // not prose           │
│       Prose{}              -> 2                                      │
│                                                                      │
│  2  f <- detect(span, mech)             // E2 — a FLAG, never a verdict│
│                                                                      │
│  3  b <- bandOf(f, mech.band)           // E3 — routes, never decides  │
│       Silent{} -> return Allow{}                                     │
│       Gray{}   -> 4            // ★ the no-Jev decider joins HERE    │
│       Fire{}   -> 4                                                  │
│                                                                      │
│  4  e <- checkEscape(mech)              // E4 — BEFORE the block      │
│       Inl{Escaped{}}     -> return Allow{}                           │
│       Inr{NotEscaped{e}} -> 5                                        │
│                                                                      │
│  5  v <- evidenceLadder(f, mech)        // E5 — ★ NO MODEL           │
│       the ladder reads ARTIFACT EVENTS:                              │
│         did the tool run?  AFTER the claim?  what degree?            │
│       Claimed{}     -> return Allow{}          // prose authorizes   │
│       Measured{n=0} -> return Allow{}          // no denominator     │
│       Measured{n>0} -> 6   |   Proven{} -> 6                         │
│                                                                      │
│  6  if !coherence(mech) then            // E6 — the act-gate         │
│       record(f, state, evidence)        // RECORD ONLY               │
│       return Demand{code: INCONCLUSIVE, remedy: <the missing proof>} │
│                                                                      │
│  7  g <- triad(f, b, evidenceOf(v))     // E7 — all three or no term  │
│       record(g)                         // the ledger row            │
│       return Block{code, remedy}        // E8 — the only verb        │
│                                                                      │
│  OUT: Arm  (Block | Demand | Allow)                                  │
│                                                                      │
│  ★ STEP 5 IS THE WHOLE DESIGN. It reads EVIDENCE, not sentiment.     │
│  ★ EVERY step above is decidable; the function is total; the types   │
│    admit no violating term.                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## §9 · THE DISPATCH TRACES

```
THE EXTENSION'S TURN (V4 target)
────────────────────────────────────────────────────────────────────────────
message_update(text_delta)
  → index.ts:128   buffer the delta
  → index.ts:135   split into lines
  → index.ts:141   decide(line, "", buf.fence)     ★ fileKind="" — see §14 R-5
        → index.ts:80   classifySource(...)         TS — the 2-of-5 kinds reachable
        → NEW           gateCorpus(span)            kernel.mjs — E1
        → NEW           detect(span, mech) -> Flag  kernel.mjs — E2
        → index.ts:91   isQuotedMatch(...)          TS — unchanged
        → NEW           bandOf(flag) -> Band        kernel.mjs — E3
  → index.ts:143   band fire  -> ctx.abort() + inject     [BUILT, proven at 3 tiers]
  → NEW            band gray  -> evidenceLadder -> coherence -> Arm
  → index.ts:98    record(ruleId, c, srcKind, span, jev)  ← THE SLOT, NOW FILLED

THE BUILD (V4 target)
────────────────────────────────────────────────────────────────────────────
edit kernel.bend
  → bend PROOF.bend              the fast checker      <1 s        [MEASURED]
  → bend PROOF.bend --verdict    the Lean kernel       25.0 s (5 laws) [MEASURED]
  → bend kernel.bend -o kernel.mjs                                  [MEASURED]
  → bun test                     the host's import of the artifact
  → rm ~/.omp/run/lexicon-gate.OFF    ← ARMING (the operator's ruling, OD-3)

★ NEVER the CLI in a hot path — the interpreted `bend f.bend` is startup-dominated (~0.21 s).
  The emitted module (or the native binary) is the runtime.  [MEASURED, A5]
```

---

## §10 · THE TREES

```
┌──────────────────────────────────────────────────────────────────────┐
│ THE FIRMWARE SUBTREE                                                 │
├──────────────────────────────────────────────────────────────────────┤
│ pbk-v2/firmware/                                                     │
│   ├─ LAWS.bend          the constitution   (operator-owned)          │
│   ├─ kernel.bend        the types          (F1,F3,F4,F6,F9 built)    │
│   ├─ coherence.bend     the act-gate       (PROPOSED)                │
│   ├─ PROOF.bend         the discharge                                │
│   ├─ kernel.mjs         EMITTED — the artifact the host imports      │
│   └─ mutation-check/    ★ harness.py + one must-fail mutant per law   │
│                                                                      │
│ pbk-v2/src/machines-wired/          ★ NEW — the wiring of the four    │
│   ├─ evidence.ts  ├─ claim.ts  ├─ workflow.ts  ├─ discharge.ts        │
│                                                                      │
│ ~/.omp/agent/extensions/lexicon-gate/   (currently PARKED as         │
│   DISABLED-20260924)                     lib.ts:307 index.ts:203      │
│ ~/.omp/agent/rules/                      9 rules · no severity · one band│
│ ~/.omp/run/lexicon-ledger.jsonl          1245 rows · 0 judgments     │
└──────────────────────────────────────────────────────────────────────┘
[ruler: 17 lines · 72 cols · limit 76]

┌──────────────────────────────────────────────────────────────────────┐
│ THE CALL CHAIN (the refusal path, file:line anchored)                │
├──────────────────────────────────────────────────────────────────────┤
│ message_update                                                       │
│   index.ts:128    buffer the delta                                   │
│   index.ts:141    decide(line, "", fence)                            │
│     index.ts:80     classifySource()        TS · 2 of 5 kinds live   │
│     kernel.mjs      gateCorpus -> detect -> bandOf                   │
│   index.ts:143    fire -> abort + inject    TS · BUILT               │
│   kernel.mjs      gray -> evidenceLadder -> coherence -> Arm          │
│   index.ts:98     record(..., jev)          the ledger slot          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## §11 · THE LAWS + THE INVARIANTS

Each: the name · the forbidden behaviour · the mechanical consequence · the anchor.

```
L-1 · ONE DECIDER
  FORBIDDEN   a second component deciding the same span
  CONSEQUENCE the ledger shows two rows with different deciders for one span id -> FAIL
  ANCHOR      PBK FAILURE_LOG F-7 — "One decision-maker, or the claim is unverifiable."

L-2 · DETECTORS DO NOT DECIDE                       [F1]
  FORBIDDEN   a middleware gate blocking on a pattern match alone
  CONSEQUENCE a gate whose block path names no decision -> UNARMED, and the build refuses
              to report it as enforcement
  ANCHOR      LASME; today 11 of 11 violate it (phantom-gate.ts:51 is the literal no-op)

L-3 · OPPOSED CRITERIA, OR NO QUESTION
  FORBIDDEN   registering a decision question with no positive AND negative control
  CONSEQUENCE the registry REFUSES at load, naming the id
  ANCHOR      mirrors the lexicon's own exampleHits requirement

L-4 · THE SEPARATION FLOOR
  FORBIDDEN   a question whose controls separate below the floor
  CONSEQUENCE REJECTED at load with its measured delta
  ANCHOR      measured: 0.9908/0.9912 (opposed choice) vs 0.747/0.796 (leading noul)

L-5 · INCONCLUSIVE IS A TERMINAL, NEVER A PASS
  FORBIDDEN   treating a below-floor confidence as a violation or as clean
  CONSEQUENCE the span routes to Demand with the reason recorded
  ANCHOR      LASME; and Rice forces it (§2.2)

L-6 · THE EVENT IS THE RECORD
  FORBIDDEN   a decision not written to the ledger in the same tick
  CONSEQUENCE 0 rows for a claimed decision -> the claim is VOID
  ANCHOR      measured: 1245 rows, 0 judgments

L-7 · NO FOREIGN AS EVIDENCE
  FORBIDDEN   citing a model's opinion as proof
  CONSEQUENCE the decider is foreign by construction; --verdict REFUSES it
  ANCHOR      bend's own limitation list

L-8 · THE CORPUS, NOT THE FIXTURE
  FORBIDDEN   reporting accuracy measured only on the authoring fixture
  CONSEQUENCE VOID unless N, the corpus provenance, and the base rate are named
  ANCHOR      PBK's own words — "a 100% fixture score is an effort receipt"

L-9 · THE DECLARED UNDEFINED SET
  FORBIDDEN   a rule that fires on an input it never declared
  CONSEQUENCE the input is INCONCLUSIVE, never a fire
  ANCHOR      McKeeman's class; the STTGF incident; the CT gate refusing THIS blueprint

L-10 · THE NAMED RESIDUAL
  FORBIDDEN   an output with no residual ledger
  CONSEQUENCE AUTOMATIC FAIL
```

---

## §12 · THE ERROR VOCABULARY + SCHEMA + SHELL

### 12.1 THE FROZEN TOKENS

```
JUDGE_UNAVAILABLE         the decider is unreachable — fail LOUD        [judge.ts]
TICKET_TAMPERED           the record's seal does not recompute          [lsp-cards]
INCONCLUSIVE              insufficient evidence — NEVER a pass         [LASME]
SUBSTRATE_DRIFT           the pinned sha != the live tree               [matrix.ts]
ADVANCE_BLOCKED           advance() called before AUDITED               [audit-registry]
FINDING_NO_TRIPLET        a finding row without its evidence            [graph DDL]
SOME PROOFS FAIL          the Bend gate's refusal (exit 1)              [bend]
ALL PROOFS CHECK          the Bend gate's green (exit 0)                [bend]
UNEVIDENCED               the fail-closed evidence query                [evidence-machine]
CLAIM_UNEVIDENCED         ★ PROPOSED — a claim citing an unrun tool     [owner: V4]
RULE_UNDEFINED_INPUT      ★ PROPOSED — an input outside a rule's set    [owner: V4]
RULE_NO_COHERENCE         ★ PROPOSED — a rule may not act               [owner: V4]
```

### 12.2 THE LEDGER ROW (extended — the empty field becomes the record)

```json
{"Pattern":"<rule-id>",
 "State":{"band":"gray","score":0.44,"source_kind":"own_utterance"},
 "Evidence":{"span":"…","file":"<path:line>"},
 "Decision":{"ladder":"CONTAINER_EVIDENCED","degree_evidence":"ct-results.json",
             "claim_at_seq":812,"run_at_seq":814,"verdict":"MEASURED","n":1},
 "Coherence":{"roc":0.91,"controls":5,"base_rate":0.02,"qualifies":true},
 "Action":{"kind":"BLOCK","remedy":"…"}}
★ `Decision` non-null is THE census metric. Today: 0 of 1245.
```

### 12.3 THE FORKABLE SHELL

```python
# firmware/LAWS.bend — THE CONSTITUTION. Operator-owned.
import Base
import ./kernel.bend as K

# ★ F9 — BUILT and mutation-proven
law prose_cannot_authorize:
  {K.authorizes(K.Claimed{"the refactor was verified"}) == False{} : Bool}
law empty_measurement_cannot_authorize:
  {K.authorizes(K.Measured{0n, "none", 0n}) == False{} : Bool}

# ★ the corpus gate — BUILT and mutation-proven
law blob_never_actionable:
  {K.isActionable(K.classify(K.Blob{"a serialized tool argument"})) == False{} : Bool}

# PROPOSED — the no-Jev ladder (the shape is designed; the proof is the work)
law smoke_never_lifts:
  {K.degree(K.lift(K.UNITEVIDENCED, K.SMOKE{})) == K.UNIT{} : Bool}
law inconclusive_never_acts:
  {K.acts(K.rule{coherence: K.None{}}) == False{} : Bool}
```

---

## §13 · SUCCESS CRITERIA (mechanical, command-checkable)

| # | the criterion | the command | the pass |
|---|---|---|---|
| **SC-1** | the gate refuses every theatre, naming the law | `python3 firmware/mutation-check/harness.py` | exit 0 · N/N `REFUSED-BY-LAW` · each printing `Laws.<name>` |
| **SC-2** | the kernel passes the proven kernel | `bend firmware/PROOF.bend --verdict` | `ALL PROOFS CHECK` · exit 0 · wall time recorded |
| **SC-3** | the artifact is emitted and importable | `bend firmware/kernel.bend -o firmware/kernel.mjs` then a committed probe that imports it | exit 0 · the def names print |
| **SC-4** | F1 is a TYPE fact | `grep -c '\-> Arm' firmware/kernel.bend` restricted to detector signatures | **0** arm-returning detectors |
| **SC-5** | the four machines are WIRED | for each machine, `grep -rl '<name>'` over the live tree | **≥1 caller each** (today: 0) |
| **SC-6** | the evidence ladder decides without a model | `bun tdd/red-evidence.test.ts` | a CONTAINER claim on SMOKE evidence is refused |
| **SC-7** | the coherence gate blocks an unproven rule | `bun tdd/red-coherence.test.ts` | a rule with no ROC/controls/base-rate may Record, never Act |
| **SC-8** | every rule carries its four fields | `bun tdd/red-ruleschema.test.ts` | `loadRules` THROWS on any missing field |
| **SC-9** | the RED inventory is red-then-green | `python3 tdd/red-inventory.py` | every mutant FAILS before its fix and passes after |
| **SC-10** | the ledger carries decisions | `grep -c '"Decision"' ~/.omp/run/lexicon-ledger.jsonl` | rises above 0 (today: 0 of 1245) |
| **SC-11** | ★ NO false fire on the negative suite | the container battery, negative half | **0 fires** on the clean set |
| **SC-12** | ★ the container isolation proof | the canary trio, in-container | the host canary sha unchanged AND the container's fetch FAILED |
| **SC-13** | the host battery still passes | `cd ~/.omp/agent/extensions/lexicon-gate && bun test .` | 5 pass / 0 fail (the pre-existing bar) |
| **SC-14** | the spec gate approves | `spec-audit specPath=<this file>` | `SPEC-AUDIT: APPROVED (0/8)` |

**The mission nouns, each carried by a criterion below:** PBK (SC-5, SC-10) · Bend (SC-1, SC-2, SC-4) · firmware (SC-3, SC-4) · kernel (SC-2, SC-3) · law (SC-1) · gate (SC-7, SC-11) · evidence (SC-6, SC-12).

**SC-5, SC-11 and SC-12 carry the requirement.** SC-5 proves the intelligence is connected;
SC-11 proves it does not misfire; SC-12 proves nothing touched the host.

---

## §14 · THE EXECUTION PLAN — the waves, and the RED INVENTORY

### 14.1 THE RED INVENTORY (the must-fail mutants; TDD's iron law applied to guards)

```
★ FOR EVERY GUARD: WRITE THE MUST-FAIL MUTANT FIRST, WATCH THE GUARD FAIL TO CATCH IT.
  THE MUTANTS THAT PASS BECOME THE WORK.
  (this is the same cycle as the Bend law/mutant harness: the MUTANT is the failing test,
   the KERNEL is the minimal code, `--verdict` is the verify)
```

| # | the guard | the must-fail mutant | expected | status |
|---|---|---|---|---|
| R-1 | `phantomClaimCheck` | record the LIVE tool name only | a false DEMAND | ★ **FOUND** (RED-0001) |
| R-2 | `phantomGate` | delete the no-op; does anything notice? | nothing notices | **PENDING** |
| R-3 | `verifyMatrix` | pass a null pin | the check skips, verdicts still true | **PENDING** |
| R-4 | matrix's 4 literals | flip one to false | no test fails | **PENDING** |
| R-5 | the source-kind classifier's rule branch | call the live path with an empty file-kind | 18 rule-law headers go ACTIONABLE | ★ **FOUND** |
| R-6 | the fire branch | force the band silent | the suite catches it | ★ **CAUGHT** (M1) |
| R-7 | the ledger writer | drop the decision field | no test notices | **PENDING** |
| R-8 | each of the 9 rules | widen the band to `{0,1}` | untested per rule | **PENDING** |
| R-9 | each rule's `condition:` | delete the key | untested per rule | **PENDING** |
| R-10 | the source-kind gate | `quotation -> own_utterance` | the suite catches it | ★ **CAUGHT** (M3) |

**★ FOUR CAUGHT (the functions are guarded) · TWO LIVE DEFECTS FOUND · FIVE UNTESTED (the
gates and the wiring).** That split IS the work.

### 14.2 THE WAVES

```
W0 · THE CONTAINER FIRST                                      gate: SC-12
  setup with no network, a read-only source bind, and the canary trio:
    (i)  a host canary file + its sha256 recorded pre-run
    (ii) a host listener the container must FAIL to fetch
    (iii) the SAME probes against a known-good empty container — the negative control FIRST
  ★ nothing below runs on the host.

W1 · RED THE WIRING (R-1..R-7)                                gate: SC-9
  write each mutant, WATCH the system fail to catch it, record the raw output.
  Each becomes a defect.

W2 · GREEN THE WIRING                                          gate: SC-9
  fix each: derive the identifier list from the registry (R-1); arm or delete the no-op (R-2);
  make the pin total (R-3); compute the verdicts (R-4); classify from the span's own evidence
  (R-5); fill the decision slot (R-7).

W3 · THE FOUR MACHINES WIRED                                  gate: SC-5
  for each, the RED is a behaviour it must exhibit:
    evidenceMachine  a CONTAINER claim passes on SMOKE evidence      -> refuse
    ClaimGate        a work tool is blocked                          -> always false
    workflowMachine  REPORT reachable from TEST on LEGIT             -> unreachable
    phantomClaimCheck a claim citing an unrun tool passes            -> demand

W4 · THE RULE SCHEMA                                          gate: SC-8
  a rule loads only with predicate + undefined set + severity + triad.

W5 · THE COHERENCE GATE                                       gate: SC-7
  no discrimination proof -> Record only, never Act.

W6 · THE BEND KERNEL                                          gate: SC-1..SC-4
  carve F1/F3/F4/F6/F9 (BUILT), then the ladder + coherence laws (PROPOSED).

W7 · THE NO-JEV BATTERY IN THE CONTAINER                      gate: SC-11, SC-13
  positives fire, negatives stay silent, canaries untouched, a decision per firing.
  the artifact: `.trident/ct-results-NOJEV.json` with the passTokens in TOOL RESULTS.
```

**THE ORDER LAW.** W0 before everything (no test may touch the host). W1 before W2 (a fix
without a watched-RED mutant is a fix you cannot trust). W3 before W4 (the machines must exist
before the rules route to them). **W7 is the only wave that may ARM anything.**

---

## §15 · THE ANTI-PATTERNS (this design's failure classes + their detections)

| # | the anti-pattern | the detection |
|---|---|---|
| AP-1 | **a guard armed in appearance, dead in behaviour** | the RED inventory; a guard with no mutant is unproven |
| AP-2 | **a detector firing on a MENTION** | the undefined set + the carrier check (does it read an ACTION or TEXT?) |
| AP-3 | **a verdict that signs itself** | grep `verified: true` beside no check call |
| AP-4 | **a skip path** | a nullable pin; a `?? default`; an early `return true` |
| AP-5 | **the decider inside the proven kernel** | `--verdict` FAILS a book relying on a foreign |
| AP-6 | **the census stays 0** | the non-null decision count on the live ledger |
| AP-7 | **the fixture sold as a corpus** | a claim without N + provenance + base rate |
| AP-8 | **a mutated "test" that never applied** | the harness asserts a non-empty diff |
| AP-9 | **a refusal that names no law** | the harness asserts `Laws.` in the error |
| AP-10 | **the artifact drifts from the source** | the emitted module's mtime vs the `.bend` |
| AP-11 | **the IO shell growing into the kernel** | any foreign in `kernel.bend` voids `--verdict` |
| AP-12 | **laws written to fit the code** | the laws are operator-owned; no harness path edits them |
| AP-13 | **a rule with no `severity`** | currently TRUE for all 9 — the schema gate (W4) |

**THE ADVERSARIAL SURFACE:** every wave's gate is a MUTATION, not a review. **The four mutants
already built** (prose authorizes · blob actionable · unarmed question askable · empty
measurement authorizes) are the pattern; W1/W3/W4 extend it to every guard.

---

## §16 · OPEN DECISIONS

| # | the fork | options | **DEFAULT** | needs the operator? |
|---|---|---|---|---|
| **OD-1** | ★ **the posture** | observe-only · **arm** · staged | **OBSERVE FIRST**, gated on SC-10/SC-11 | **★ YES** |
| OD-2 | the two model-needing rules (`scope-shrink`, `record-anchor`) | convert to an evidence check · drop · keep a model | **CONVERT, then drop if it cannot be expressed** | no |
| OD-3 | the rules-state contradiction | the canon is stale · the restore reintroduced a deleted carrier | **INVESTIGATE first — do not decide blind** | **★ your call** |
| OD-4 | the rule source-of-truth | the `condition:` regex · the lexicon bank | **ONE carrier per rule** (§6) | no |
| OD-5 | the kernel's scope | the decision algebra · + the ladder · + the coherence gate | **the algebra + the ladder** | no |
| OD-6 | F8 (the left column) | a module boundary · a proof · leave it a doctrine | **the module first** | no |
| OD-7 | `--verdict` cadence | per-commit · per-merge · nightly | **per-merge** (25 s measured) | no |
| OD-8 | the 9 rules' bands | keep `{0.3,0.62}` · derive per rule | **derive** — one shared band is not a calibration | no |

**THE ONE FORK THAT NEEDS THE OPERATOR: OD-1.** The last time this extension enforced, its
injections broke goal loops; the off-sentinel and the silencing skill are the scar.

---

## §17 · THE RESIDUAL (named; a blueprint with no residual claims totality)

```
R-1  THE DECIDER IS ABSENT AND THAT IS PERMANENT. Two rules (scope-shrink, record-anchor)
     need world knowledge; per the requirement they must be CONVERTED or DROPPED. The
     conversion is designed (§4.5) and unproven.
R-2  NO CONTAINER ISOLATION PROOF EXISTS. The canary trio is DESIGNED and unrun.
R-3  PBK'S BASE RATE IS NOT ESTIMABLE from the ledger (1245 rows / 1151 distinct spans, many
     of them the rules' own text). The coherence gate needs a large legitimate corpus.
R-4  THE RULES-STATE CONTRADICTION IS UNRESOLVED (OD-3) — a candidate regression, not diagnosed.
R-5  F8 HAS NO MECHANISM. "The left column is never edited" remains a doctrine.
R-6  THE BEND LAW-vs-TS+MUTANT CHOICE per guard is a COST question, unmetered.
R-7  THE FOUR MACHINES WERE READ, NOT RUN. Their purity is asserted from their source; no
     execution was observed this session.
R-8  A7 AND A4 DISAGREE BY ONE RULE (fallback-slop vs instruction-not-predicate). Resolve by
     writing that rule's predicate.
R-9  NOT ENUMERATED: the abort-loop guard (one abort per rule+span) interacting with a decision
     that carries a confidence — whether a second span with the same signature re-fires.
R-10 THE 11 MIDDLEWARE GATES WERE MEASURED FOR SHAPE, NOT BEHAVIOUR. L-2 fails on all of them
     today; the blueprint does not include the remediation of the other ten.
```

---

## §18 · THE HANDOFF

**THE NEXT ARTIFACT:** the **build-package** — this is DPL1-grade, so it hands to
`build-package`, which mints the spec + the wave plan + the canon docs + the goal prompts. On a
worker topology, `worker-planning` + `worker-spec` mint the per-worker specs (W0–W7 are eight
disjoint domains).

**THE OWNER SKILL:** `build-package` (or `trident-deep-planning` for the L2 expansion of W3/W6).

**THE PRECONDITION:** the operator's ruling on **OD-1** and **OD-3**.

**THE EXTERNAL GATES (mandatory; the author is never the auditor):**
```
G1  bash ~/.omp/agent/managed-skills/create-planning/scripts/check.sh <this file>
G2  spec-audit specPath=<this file>
```

**TERMINAL STATE:** this document hands off to the build path — it never implements.

---

## §19 · THE BACKWARDS MAP + PROVENANCE

### 19.1 THE PROVENANCE LEDGER

| the artifact | origin | the location | status |
|---|---|---|---|
| `pbk-v2/` | built V0→V3 | `OMP/pbk-v2` | BUILT (`e6464096` renamed omp-ct → pbk) |
| the 11 middleware gates | V3 | `pbk-v2/src/middleware/*.ts` | BUILT (1 is a no-op) |
| `lexicon-gate` | V3 W7 | `~/.omp/agent/extensions.DISABLED-20260924/` | BUILT · PARKED |
| the 9 rules | V3 | `~/.omp/agent/rules/*.md` | RESTORED 2026-09-29 18:10 |
| the ledger | V3 runtime | `~/.omp/run/lexicon-ledger.jsonl` | BUILT · 1245 × 0 |
| the 6 Paragon machines | the Paragon build | `Codename:PARAGON/src/machines/` | BUILT · 0 WIRED |
| `matrix.ts` | the Paragon ring | `Codename:PARAGON/src/enforcement/` | BUILT · self-signed |
| `PARAGON_V2_BLUEPRINT.md` | the operator | `pbk-v2/` (26 KB) | the design authority |
| the 8 decision laws | this session | `worktrees/…/session-experiments-20260929/decision-layer/` | BUILT · 4/4 mutants refused |
| the no-Jev research | this session | `worktrees/…/pbk-v4-research/` | BUILT · 8 angles · 12 findings |
| **this blueprint** | this session | `pbk-v2/reports/PBK_V4_BEND_FIRMWARE_Master_Blueprint_v1.md` | v1 of the series |

### 19.2 THE WHY-WIRED LEDGER (law → mechanism → reason)

| the law | the mechanism | the reason (verbatim where available) |
|---|---|---|
| L-1 one decider | a single decision site | PBK F-7: *"One decision-maker, or the claim is unverifiable."* |
| L-2 detectors do not decide | `detect -> Flag` | LASME: *"a matcher/trigger that returns a verdict is slop"* |
| L-5 inconclusive never passes | `advance` takes a `Pass{}` | LASME; and **Rice forces it** |
| L-7 no foreign as evidence | `--verdict` refuses foreigns | the toolchain's own rule |
| L-8 the corpus not the fixture | the coherence gate | PBK: *"a 100% fixture score is an effort receipt"* |
| L-9 the undefined set | the rule schema (b) | McKeeman; the STTGF incident; the CT gate on THIS file |
| §4 the four machines | the evidence ladder | the operator: *"works without jev"* |

### 19.3 THE RE-HOST GUIDE

```
1  copy pbk-v2/ ; confirm e6464096 is the base
2  create firmware/{LAWS,kernel,coherence,PROOF}.bend — §7.1's types are the skeleton
3  write the mutation harness FIRST — a law with no mutant is decoration
4  emit kernel.mjs; import it at index.ts:80
5  wire the four machines (W3) — they exist; give each a caller
6  restore the 9 rules; add the four schema fields; derive the bands
7  run W0's container FIRST; then SC-1..SC-10 in the sandbox; SC-11/SC-12 in the container
8  the operator's ruling (OD-1) gates the single `rm ~/.omp/run/lexicon-gate.OFF`
```

### 19.4 WHAT WAS LEFT OUT

```
· the 11 gates' internal patterns — the SHAPE is in scope, the patterns are not
· the Paragon L4/L5/L6 internals — read for the purity boundary only
· the Jev Gates ticket kernel — proven separately (commit e558ceb4)
· Bend's compiler internals — treated as a given risk (young, 99% AI-written, unaudited)
```

---

## §20 · THE SELF-CHECK + THE RESIDUAL OF THIS DOCUMENT

```
[x] the nine master sections are present (macro · lifecycle · traces · types+checks ·
    pseudocode · trees · laws · vocabulary/schema/shell · backwards map)
[x] the planning-suite sections are carried (classification · scope · differential · core ·
    success criteria · execution plan · anti-patterns · open decisions · residual · handoff)
[x] a class is declared in the header ("Class: system")
[x] every claim is BUILT / MEASURED / PROPOSED / UNKNOWN — no fifth state
[x] ≥15 file:line anchors: phantom-gate.ts:51 · matrix.ts:95-106 · lib.ts:87-88 ·
    index.ts:141 · index.ts:80 · index.ts:143 · index.ts:98 · index.ts:128/135/91 ·
    container-testing.ts:286/348/349 · evidence-machine.ts · claim-gate.ts ·
    workflow-machine.ts · lsp-cards.ts · judge.ts · src/index.ts:62  → 17 anchors
[x] pseudocode per nontrivial mechanism (the invoke cycle, 7 steps; the ladder; the schema)
[x] trees with file:line and caps disclosed
[x] the laws are numbered, imperative, each with a consequence
[x] the error vocabulary, the schema, and a forkable shell are present
[x] the bump check ran (no prior Master_Blueprint — this is v1)
[x] 20 sections · the density floor cleared
```

**THE FALSIFICATION OF THIS DOCUMENT:** its tax is §14's **FIVE UNTESTED guards**, §17's **ten
residuals**, and **SC-5/SC-11/SC-12 being red today**. **If those had read green, the blueprint
would have been written to pass.** The one thing it cannot claim is that the no-Jev PBK
enforces without misfiring — **because no build has been tested.** That is what W1–W7 are for.

---

## §21 · THE MEASURED DEFECT LEDGER (every instance, anchored)

This is the artifact the blueprint exists to prevent. **One class, six instances, all measured.**

| # | the guard | armed in | dead in | the measurement |
|---|---|---|---|---|
| 1 | `phantomGate()` | the `BeforeGate` return type | `void recorded; return async () => undefined` | `middleware/phantom-gate.ts:51` |
| 2 | `verifyMatrix()` | 6 returned verdicts | **4 are `verified: true` literals**; the 6th is skipped when the pin is null | `enforcement/matrix.ts:95-106` |
| 3 | `OWNED_TOOL_NAMES` | a real predicate over a real regex | the list holds **pre-rename** tool names | RED-0001; `container-testing.ts:286` vs `phantom-gate.ts:33-43` |
| 4 | the source-kind classifier's rule branch | the `SrcKind` type declares it | the live path passes an empty file-kind | `lib.ts:87-88` vs `index.ts:141` |
| 5 | the STTGF gate | a real block | it reads the completed-message **TEXT** as well as the action | `sttgf-gate.ts:50-149` |
| 6 | the CT Container Gate | a real block with a real remedy | **a text scan** | ★ it refused **this document's own write** |

**THE CLASS:** *a guard whose ARMED APPEARANCE outlives its ARMED BEHAVIOUR.*

**THE MENTION-SUBCLASS** (a detector firing on the WORD, not the ACT): instances 5, 6, and the
doc-density gate on a short `.md` — **three occurrences, in one session, while writing the
document that names the class.**

### 21.1 THE COUNTERFACTUAL for each

```
1 · if `phantomGate` were armed    a claim citing an unrun tool would demand evidence
2 · if `verifyMatrix` computed     a drifted substrate would BLOCK, not report true
3 · if the list were derived       a rename could not orphan the guard
4 · if the kind were reachable     the rules would not fire on the rules
5 · if it read actions only        a quoted command would never block a document
6 · if it read actions only        ★ this blueprint would have written in one pass
★ IN EVERY CASE the counterfactual is "the original defect does not occur" — the tests are
  correctly aimed. (next-steps-blueprint STEP 4's counterfactual test.)
```

---

## §22 · ★ THE CONTAINER ISOLATION PROOF (the design; unrun — R-2)

The requirement: **nothing a test does may touch the host.** Six mechanical assertions.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  THE PROOF SET — each is a COMMAND, each has a PASS and a FAIL             │
│                                                                            │
│  P1 THE SOURCE IS READ-ONLY                                                │
│     pre:  sha256sum the source tree on the host -> H0                      │
│     run:  the container writes into its copy                               │
│     post: the HOST sha256 is re-read -> must still equal H0                │
│     FAIL: any difference                                                   │
│                                                                            │
│  P2 THE CANARY FILE IS UNTOUCHED                                           │
│     plant a host file with a known sha256 and a name the task is tempted   │
│     to touch; the task's instructions explicitly invite touching it.       │
│     PASS: the sha is unchanged AND the container-side write is REFUSED     │
│     ★ a canary that is never tested is decoration — the invitation is the  │
│       instrument                                                           │
│                                                                            │
│  P3 THE NETWORK CANARY                                                     │
│     a host listener on the loopback with a token.                          │
│     PASS: the container's fetch FAILS (a non-zero exit), AND the SAME      │
│     fetch from a NON-isolated container SUCCEEDS — proving the probe can   │
│     detect reachability at all.                                            │
│     ★ WITHOUT THE SECOND HALF the failure is indistinguishable from a      │
│       broken probe. (the known-positive control)                           │
│                                                                            │
│  P4 THE LAUNCH-FLAG AUDIT                                                  │
│     record the container's own inspect output: mounts + their read/write   │
│     flags, the network mode, the capability additions and drops, the       │
│     security options, and whether the rootfs is read-only.                 │
│     PASS: no host path is bound read-write; no network; no added           │
│     privileged capabilities.                                               │
│                                                                            │
│  P5 THE NEGATIVE CONTROL FIRST                                             │
│     run P1-P4 against a KNOWN-GOOD EMPTY container and record the baseline.│
│     ★ per the CT law: a suite with one half is half a suite.               │
│                                                                            │
│  P6 THE FAIL-CLOSED POSTURE                                                │
│     the battery ALSO runs with the decider unavailable, proving the        │
│     verdict is INCONCLUSIVE rather than a pass.                            │
│     (prior evidence: the judge-unavailable scenario already proved this)   │
└────────────────────────────────────────────────────────────────────────────┘
```

**WHY P3's SECOND HALF IS LOAD-BEARING:** a fetch that fails proves nothing unless the same
fetch can be shown to succeed elsewhere. **This is the known-positive control, applied to a
sandbox** — and it is the same instrument that caught my own two false passes (§14 R-8/R-9).

**AND THE HOLE TO CLOSE:** the prior W4 container result reaches a host service **by design**
through a forwarder. **For this proof that forwarder is the defect to remove, not the pattern
to copy** — the fail-closed posture already demonstrated is the correct base.

---

## §23 · THE PER-MECHANISM PSEUDOCODE SET (the rest of the walk)

```
┌──────────────────────────────────────────────────────────────────────┐
│  gateCorpus(span) -> SpanKind                    E1                   │
│    if the span parses as serialized data      -> Blob{}              │
│    if the span carries rule-file syntax        -> RuleText{}          │
│    else                                        -> Prose{}             │
│  ★ MEASURED: 378 of 1245 real spans die here (30.4%).                 │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│  evidenceLadder(flag, mech) -> Verdict            E5  ★ NO MODEL      │
│    r <- the ledger's own rows for this tool, this session             │
│    if r is empty                      -> Claimed{the text}            │
│    if r.seq <= claim.seq              -> Claimed{the text}  // BEFORE  │
│    if r.degree = CONTAINER            -> Measured{n:1, corpus, base}  │
│    if r.degree = UNIT and r.smoke     -> Claimed{}  // smoke never lifts│
│    if r.degree = UNIT                 -> Measured{n:1, …}             │
│  ★ EVERY BRANCH READS THE SESSION LOG. None reads sentiment.          │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│  coherence(rule) -> Bool                          E6                  │
│    roc      <- the rule's measured separation                         │
│    ctrl     <- its negative-control count                             │
│    base     <- the declared prevalence                                │
│    if roc <= chance            -> false                               │
│    if ctrl = 0                  -> false                              │
│    if base is undeclared        -> false                              │
│    else                         -> true                               │
│  ★ A FALSE HERE MEANS THE RULE MAY RECORD, NEVER ACT.                 │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│  advance(v) -> Or(Advanced, Blocked)              E8                  │
│    Pass{}          -> Advanced{proof: v}   // the ONLY arm that moves │
│    Fail{reason}    -> Blocked{reason}                                 │
│    Inconclusive{}  -> Blocked{why}   ★ never a pass                   │
│  ★ THE MUTANT THAT MUST FAIL: `Inconclusive -> Advanced`.             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## §24 · THE DEFECT-TO-LAW MAP (what each measured defect proves the design must carry)

| the measured defect | the law it forces | the mechanism |
|---|---|---|
| RED-0001 — a stale identifier list | **derive, never hand-write** | the list comes from the registry |
| the 4 self-signed verdicts | **a verdict carries its witness** | `Matches{witness}` — a literal has no term |
| the null-pin skip | **no optional gate** | the pin is a required proof argument |
| 0 of 1245 judgments | **the decision is a required field** | the row type admits no decisionless row |
| the rules fire on the rules | **the undefined set is declared** | an undeclared input is INCONCLUSIVE |
| the CT gate refused this file | **read the ACT, not the mention** | the gate reads the tool call structurally |
| 30.4% non-prose in the corpus | **the corpus gate precedes the score** | `gateCorpus` is step 1 |
| the empty gray branch | **a router is not a decider** | `Band` has no action field |
