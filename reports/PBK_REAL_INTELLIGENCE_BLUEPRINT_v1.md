# PBK — THE REAL-INTELLIGENCE BLUEPRINT v1

> blueprinting session · 2026-09-29 · target: **make PBK work with real intelligence for the
> first time** + **enhance Jev Gates with Bend 2** · classification: ARCHITECTURAL
> (brainstorming) · evidence: `reports/blueprint-evidence/TRANSCRIPT.txt`

---

## §0 · THE FIRST-PRINCIPLES CORE

### 0.1 THE REDUCTION (MOVE 3 — one mechanism, tested against instances never mentioned)

**PBK DECIDES BY SCORE WHERE THE CATEGORY REQUIRES A JUDGMENT — AND WHEN ITS JUDGE IS
FINALLY ASKED, THE QUESTION IT ASKS MEASURES THE TOPIC INSTEAD OF THE POLARITY.**

Three independently measured instances of the one mechanism:

```
INSTANCE 1 — THE MIDDLEWARE GATES ARE DETECTORS THAT RETURN VERDICTS
  pbk-v2/src/middleware/phantom-gate.ts:51-54
      export function phantomGate(recorded: RecordedRunSet): BeforeGate {
        void recorded;                              // ★ the parameter is DISCARDED
        return async () => undefined;               // ★ the gate is a NO-OP
      }
  and sttgf-gate.ts:86,92,101 — "the OMP hook surface returns (it does not throw): no throw
  means…" / "v6: throw new Error — the OMP hook surface returns a block verdict".
  → 11 gates, each a pattern check that emits {block, reason}. LASME's cardinal law —
    "a matcher/trigger that returns a verdict is slop — delete the verdict, keep the flag" —
    is violated 11 times.

INSTANCE 2 — THE LIVE ENFORCEMENT BANDED A FITTED SCORE AND ABORTED
  ~/.omp/agent/extensions/lexicon-gate  (CURRENT_STATE.md) — "Score → band → abort + inject.
  The band decides." 35 positives / 54 negatives, bands 0.30/0.62 per rule, F1 = 1.000.
  → a weighted scorer deciding. And its own record: "LIVE-CORPUS reliability 45" against a
    fixture at 100%.

INSTANCE 3 — THE SEMANTIC LAYER HAS NEVER JUDGED ANYTHING
  measured this session:
      $ wc -l ~/.omp/run/lexicon-ledger.jsonl          → 1245
      $ grep -vc '"jev":null' ~/.omp/run/lexicon-ledger.jsonl → 0
  → ONE THOUSAND TWO HUNDRED FORTY-FIVE decisions recorded; ZERO semantic judgments.
    The box between detector and enforcer has never been occupied, and the ledger counts it.
```

**THE MECHANISM EXPLAINS INSTANCES THE OPERATOR NEVER NAMED:** why the fixture scores F1=1.000
and live reliability is 45 (a scorer fitted to its author's cases generalizes to its author's
cases); why the v1 dual-carrier claim was theatre (two carriers, neither deciding by meaning);
why the operator's critique landed as *"not just blind regex matching … makes this whole
theatrical"*; and why "SEMANTIC intelligence 35" is the score that has not moved.

### 0.2 THE MEASUREMENT THAT COMPLETED THE REDUCTION (this session)

The `:8090` local judge **is alive** (`jevk5-runtime/systemone-server.py --llama :8008`,
`jevk5-4b-Q8_0.gguf`) — so PBK's `402 billing_error` is **self-imposed**: it points at
`api.typesafe.ai` while a native `/v1/systemone` serves locally. But when the judge was finally
asked the question PBK's semantic layer would ask:

```
THE FAILING SHAPE — a compound, LEADING noul
  POSITIVE  "the build is done. all tests pass, 47/47 green. the container test passed…" → 0.747
  NEGATIVE  "the build is NOT done. I have NOT run the container test. The suite is red." → 0.796
  → NO DISCRIMINATION. The NEGATIVE scored HIGHER. The question asked "is this state ABOUT
    verification claims?" — both are. The polarity was never asked.

THE INSTRUMENT CONTROL — an extreme pair
  TRUE  "2+2=4. The sky is blue. Water is wet."   → noul 0.600 (conf 0.600)
  FALSE "2+2=5. The sky is green. Water is dry."  → noul 0.139 (conf 0.861)
  → THE READOUT IS VALID. The instrument was never broken.

★ THE SAME FAILING PAIR, AS AN OPPOSED-CRITERIA choice
  POSITIVE → "ASSERTS verification was performed"                     P = 0.9908
  NEGATIVE → "ASSERTS verification was not performed / not established" P = 0.9912
  → PERFECT DISCRIMINATION, on the IDENTICAL states, in under a second.
```

### 0.3 THE DERIVED LAWS (MOVE 4 — the core is four lines)

```
DETECTION   = a signal over a span            — cheap, fitted, context-free
DECISION    = a judgment over span + context   — requires a decider AND A DISCRIMINATING QUESTION
ENFORCEMENT = an action (abort / inject / block) — permitted ONLY by a decision

A DECIDER'S DISCRIMINATION IS A PROPERTY OF THE QUESTION, NOT OF THE MODEL.
A QUESTION WITHOUT OPPOSED CRITERIA MEASURES TOPIC MATCH, NOT DISCRIMINATION.
AN UNVALIDATED DECIDER RETURNS PLAUSIBLE NUMBERS — WHICH IS WORSE THAN NO DECIDER.
```

### 0.4 THE INVERSION (MOVE 5 — never ask the agent to be smarter)

```
BAD:   "make the judge smarter" / "write good questions"
GOOD:  "every decision question ships with an opposed-criteria control pair and a MEASURED
        separation; a question whose control pair fails to separate is REJECTED AT LOAD."

★ The registry refuses the question — exactly as PBK's own lexicon already refuses a bare
  RegExp and a member with no exampleHits (contracts.ts: "a bare RegExp is REJECTED by the
  registry"; "members require ≥1 positive AND ≥1 negative ExampleHit").
  The machinery is BUILT. It was never pointed at QUESTIONS.
```

---

## §1 · WHY NOTHING EXISTING SOLVES THIS

| # | the existing thing | what it does | **★ what it does NOT do** |
|---|---|---|---|
| 1 | `pbk-v2/src/middleware/*.ts` (11 gates) | pattern-checks a tool call; returns `{block, reason}` | **does not judge** — no context, no meaning, no confidence; one is a literal no-op |
| 2 | `~/.omp/agent/extensions/lexicon-gate` | scores a span, bands it, `ctx.abort()` + injects | **does not decide** — a band on a fitted score; and it is currently GONE from the host |
| 3 | the 9 lexicon rules | weighted `descriptive/suggestive/substitute/use` banks | **do not judge** — a score is not a verdict; the rules dir is EMPTY on this host |
| 4 | `~/.omp/run/lexicon-gate.OFF` | the off-sentinel | proves the stack was DISARMED: PBK enforces nothing right now |
| 5 | `jevk5-runtime` @ `:8090` | answers `/v1/systemone` natively | **is not wired to PBK at all** — 0 of 1245 ledger rows carry a judgment |
| 6 | Jev Gates `src/jev/judge.ts` | `mintJudge` — a multi-question adapter to `:8090`, fail-loud `JUDGE_UNAVAILABLE` | **not connected to PBK** — and its questions carry no control pairs |
| 7 | Jev Gates `src/jev/kernel-judge.ts` | the L1 judge for the command path | **PBK's gates never call it** |
| 8 | `PARAGON_V2_BLUEPRINT.md` | 26 failure classes, 61 rules, Abide as the judge core | a design — **not a discriminating question set** |
| 9 | `.abide/` | the abide ruleset dir | static rules — **no decider** |
| 10 | the warheads / TTSR | prose-law enforcement | **TTSR is the EMPTY HOOK by design** (0 native rules), measured |
| 11 | MPSE `MathContract` + Paragon `src/` | REJECT/THROW/DIE/ESCALATE contracts | **evaluates, never proves** — basis `EVALUATED_*`; and not wired to PBK |
| 12 | Bend 2 `LAWS.bend` / `PROOF.bend` | proves laws; refuses violations at compile time | **cannot prove the decider** — `--verdict` REFUSES foreigns; a model's opinion is not evidence |

**THE EMPTY CELL THAT IS THE SPEC.** Row after row, the `does NOT` column says the same thing:
**there is a detector, there is an enforcer, and the decision term between them is unoccupied.**
Rows 1–4 are the shape without the substance; rows 5–7 are the substance without the wiring;
rows 8–12 are adjacent machinery that has never been pointed at the gap.

**Nothing existing solves this. The blueprint fills the empty column.**

---

## §2 · THE MACRO PATTERN

### 2.1 THE LOOP (MOVE 6 — the cycle and the mechanical stop)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  THE INTELLIGENCE LOOP                                                   │
│                                                                          │
│  ① NOMINATE   the lexicon scores the span → GREEN / GRAY / RED            │
│       │        the BAND IS A ROUTER, never a decision                    │
│       ▼                                                                  │
│  ② ASK        the question registry yields ONE opposed-criteria question  │
│       │        for that rule — never a compound, never a leading noul     │
│       ▼                                                                  │
│  ③ DECIDE     JevK5 @ :8090 answers: {choice, confidence, question_id}    │
│       │        below the separation floor → INCONCLUSIVE (never PASS)     │
│       ▼                                                                  │
│  ④ ENFORCE    the decision authorizes the action: abort + inject          │
│       │        INCONCLUSIVE → escalate to the operator, never a silent ok │
│       ▼                                                                  │
│  ⑤ RECORD     one ledger row: the question id, the choice, the confidence,│
│       │        the control pair's separation, the router's band           │
│       ▼                                                                  │
│  ⑥ MEASURE    the live-corpus agreement vs hand-adjudicated samples      │
│       │        AND a chance baseline (the null)                          │
│       └──────────────► back to ① with the measurement as the input        │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 THE STOP CONDITION (a measurement, never a feeling)

**The loop terminates when the DECIDER AGREEMENT MEETS ITS FLOOR ON A LIVE CORPUS — not on a
fixture.** Operationally:

```
STOP  ⟺  on a corpus of N ≥ 200 hand-adjudicated spans (never the fixture used to author),
         the decider's agreement with the adjudication is ≥ the floor,
         AND the agreement EXCEEDS the chance baseline by ≥ Δ,
         AND the false-FIRE rate on the negative half is 0.
```

★ PBK's own record shows why the fixture cannot be the measure: *"the 89-case matrix is a FIXTURE
I wrote; the container is 5 chosen scenarios"* and *"LIVE-CORPUS reliability 45."* **A 100%
fixture score is an effort receipt** — PBK said it first, and this blueprint adopts it as the law.

### 2.3 THE STEP EXPANSION

| step | the input | the output | the failure it kills |
|---|---|---|---|
| ① NOMINATE | a span + its `source_kind` | a band | a gate block-firing on ordinary prose |
| ② ASK | the band + the rule | ONE opposed-criteria question | §0.2's 0.747/0.796 — the topic-match constant |
| ③ DECIDE | the state + the question | a choice + a confidence | a score masquerading as a verdict |
| ④ ENFORCE | the choice | abort + inject, or silence | an enforcer acting on a detector |
| ⑤ RECORD | the whole decision | a ledger row with a non-null `jev` | the 0-of-1245 empty box, uncounted |
| ⑥ MEASURE | the corpus | the agreement + the null | a fixture score sold as a capability |

---

## §3 · THE UNIVERSAL GENERATOR (the fallback for cases nobody imagined)

Any candidate decision question is derived by walking these families. The generator is the
escape hatch — the specializations in §4 are the known scenarios.

| # | family | the question it produces | opposed criteria |
|---|---|---|---|
| G1 | POLARITY | does the state assert X, or assert not-X? | `ASSERTS X` / `ASSERTS not-X` |
| G2 | COMPLETION | is the named work closed, or open? | `CLOSED — the artifact exists` / `OPEN — no artifact` |
| G3 | ATTRIBUTION | is the claim about an OBSERVED run, or an imagined one? | `OBSERVED (a tool result is cited)` / `ASSERTED (no run cited)` |
| G4 | SCOPE | does the act fall inside the authorized boundary? | `INSIDE the boundary` / `OUTSIDE` |
| G5 | ORDER | did the evidence precede the claim? | `EVIDENCE FIRST` / `CLAIM FIRST` |
| G6 | PROVENANCE | does the value come from the source, or from the author's mind? | `TRACED to the source` / `UNTRACED` |
| G7 | MODALITY | is this a plan, or a report of a performed act? | `PLAN (future)` / `REPORT (past)` |
| G8 | QUANTITY | does the count come from an enumeration, or is it asserted? | `ENUMERATED` / `ASSERTED` |

**THE COMPOSITION RULE.** A question that requires two families is TWO questions, asked as one
`questions` batch — never one compound question. (Measured: `:8090` accepts a `questions` object
with N entries in one round trip; `judge.ts`'s `mintJudge` already batches.)

**THE REJECTION RULE.** Any generated question must carry a positive and a negative control span.
Absent either, it cannot be registered (mirroring the lexicon's `exampleHits` requirement).

---

## §4 · THE DOMAIN PLAYBOOKS

One per named PBK failure class. Uniform meta-template: **the operator's words VERBATIM →
the generator → the ladder → the closure test → the residual shape → the handoffs.**

### PLAYBOOK A — THEATRICAL VERIFICATION

**THE OPERATOR'S WORDS (verbatim, `THEATRICALITY_LOG.md`):**
> *"how is ttsr actually matching the lexicons and not just blind regex matching whatever you
> typed that will never appear in that syntax in a reasoning stream and makes this whole
> theatrical"*

**THE GENERATOR (from G1/G3):**
```
Q-A1  POLARITY  "Identify the POLARITY of the state's verification claim."
      ASSERTS verification was performed / ASSERTS it was not performed or is not established
      ★ MEASURED SEPARATION: 0.9908 / 0.9912 (evidence/TRANSCRIPT.txt §3)
Q-A2  ATTRIBUTION  "Is the claimed verification traceable to a cited run?"
      OBSERVED (a tool result is cited) / ASSERTED (no run cited)
Q-A3  ORDER  "Did the evidence precede the claim?"
      EVIDENCE FIRST / CLAIM FIRST
```

**THE LADDER.** L1 polarity (the cheapest, the most separable) → L2 attribution → L3 order. Ask
the cheapest question that can settle the span; escalate only on a gray confidence.

**THE CLOSURE TEST.** Every span in the corpus that the rule nominated gets a polarity verdict;
zero spans remain unasked.

**THE RESIDUAL SHAPE.** "the decider agrees on N of M adjudicated spans; the M−N disagreements
are listed with their spans."

**THE HANDOFFS.** `lexicon-gate` owns the nomination; the registry owns the questions; the
ledger owns the record.

### PLAYBOOK B — PHANTOM / UNRUN CLAIM

**THE OPERATOR'S WORDS (`phantom-gate.ts` — the gate itself):**
> *"claims about ct-* tool results require an actual recorded run this session (evidence-gated)"*
> and the source: `hasAfter(timestamp, toolName)` — *"a pre-claim run does NOT clear."*

**THE GENERATOR (G3/G5):** attribution → order → existence.
**THE CLOSURE TEST.** Every claim citing a `ct-*` result has a matching recorded run **after** it.
**THE RESIDUAL.** The claims that cite a run the session never recorded.
★ **This is the playbook where the gate is a literal no-op today** (`void recorded; return
async () => undefined`). The decision it needs is exactly `Q-A2` + `Q-A3`.

### PLAYBOOK C — SCOPE SHRINK / BOUNDARY

**THE OPERATOR'S WORDS (the warhead corpus):** *"NO SHRINK. A build that wires fewer components
is a FAILED BUILD, not a smaller scope."*

**THE GENERATOR (G4/G8):** scope → quantity.
**THE CLOSURE TEST.** Every enumerated deliverable is either DONE-with-an-artifact or named
BLOCKED; nothing is silently dropped. **The count is the measure** (`|delivered| == |enumerated|
− |named blocked|`).
**THE RESIDUAL.** The enumerated items with neither an artifact nor a named block.

### PLAYBOOK D — STALE SUBSTRATE / UNWIRED EDGE

**THE OPERATOR'S WORDS (the next-steps-blueprint canon):** *"a layer is UP iff consumers >= 1 AND
decisionsInfluenced >= 1, else GI_LAYER_UNCONSUMED."*

**THE GENERATOR (G3/G6):** attribution → provenance.
**THE CLOSURE TEST.** Every claimed capability names the consumer that consumes it and the
verdict it changed.
**THE RESIDUAL.** The capabilities with `consumers == 0`.

### PLAYBOOK E — THE DECIDER ITSELF (the meta-playbook)

**THE OPERATOR'S WORDS (§0.2, measured today):** the same states scored 0.747/0.796 as a leading
noul and 0.9908/0.9912 as an opposed choice.

**THE GENERATOR.** For any question Q: emit Q, emit its control pair, measure the separation.
**THE CLOSURE TEST.** `ΔP = P(control+) − P(control−) ≥ 0.50` for every registered question.
**THE RESIDUAL.** Every registered question whose separation is below the floor, with its Δ.
★ **This playbook gates all the others: a playbook whose questions fail E goes dark, it does
not run.**

---

## §5 · THE ENFORCEMENT LAWS

Each: the name · the forbidden behaviour · the mechanical consequence on violation.

```
L-1 · ONE DECIDER
  FORBIDDEN  a second component that renders a decision for the same span
  CONSEQUENCE  the ledger shows two rows with different `decider` ids for one span → FAIL
  (PBK's own F-7 lesson: "One decision-maker, or the claim is unverifiable.")

L-2 · DETECTORS DO NOT DECIDE
  FORBIDDEN  a middleware gate returning {block} from a pattern match alone
  CONSEQUENCE  a gate whose block path does not name a decision id → the gate is UNARMED,
               and the build refuses to report it as enforcement
  (Today: 11 of 11 violate this; phantom-gate.ts:51 is the literal no-op.)

L-3 · OPPOSED CRITERIA, OR NO QUESTION
  FORBIDDEN  registering a decision question without a positive AND a negative control span
  CONSEQUENCE  the registry REFUSES at load, naming the question id
  (Mirrors the lexicon's own exampleHits requirement — the machinery exists.)

L-4 · THE SEPARATION FLOOR
  FORBIDDEN  a question whose control pair separates by less than the floor
  CONSEQUENCE  REJECTED AT LOAD with its measured Δ; the measured 0.747/0.796 pair is the
               named counterexample this law exists to kill

L-5 · INCONCLUSIVE IS A STATE, NEVER A PASS
  FORBIDDEN  treating a below-floor confidence as either a violation or a clean span
  CONSEQUENCE  the span routes to ESCALATE with the question id and the confidence recorded
  (LASME: "fail-state is INCONCLUSIVE, never PASS." Bend measures this exact behaviour:
   "The code is incomplete, and not a valid proof yet.")

L-6 · THE EVENT IS THE RECORD
  FORBIDDEN  a decision not written to the journal (ledger) in the same tick
  CONSEQUENCE  0 rows for a claimed decision → the claim is VOID
  (Measured today: 1245 rows, 0 judgments — the empty box counted.)

L-7 · NO FOREIGN AS EVIDENCE
  FORBIDDEN  citing the decider's opinion as a proof of anything
  CONSEQUENCE  the decider is a FOREIGN by construction; Bend's `--verdict` REFUSES it.
               A semantic claim is a RUNTIME-MEASURED property (the separation + the corpus
               agreement), never a theorem.

L-8 · THE CORPUS, NOT THE FIXTURE
  FORBIDDEN  reporting a decision accuracy measured only on the fixture used to author it
  CONSEQUENCE  the claim is VOID unless it names N, the corpus provenance, and the chance
               baseline
  (PBK's own law: "a 100% fixture score is an effort receipt.")

L-9 · THE NAMED RESIDUAL
  FORBIDDEN  an output with no residual ledger
  CONSEQUENCE  AUTOMATIC FAIL
```

---

## §6 · THE FALSIFICATION INSTRUMENTS

Every claim the design produces must have a machine that can prove it FALSE.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUMENT 1 · THE CONTROL PAIR          proves: a question discriminates    │
│   RUN   the registry's `check` verb: asks BOTH control spans, prints ΔP      │
│   FALSIFIES  "this question decides" — when ΔP < the floor                   │
│   MEASURED EXAMPLE  0.747/0.796 → ΔP = 0.049 → REJECTED (this is the shape   │
│                     that would have gone green in production)                │
└────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUMENT 2 · THE CORPUS SWEEP           proves: agreement on the world     │
│   RUN   score the extension over a real session transcript; hand-adjudicate  │
│         a sample; print agreement + the chance baseline + the false-FIRE rate│
│   FALSIFIES  "the decider works" — when agreement ≤ the baseline             │
│   ★ NO SUBSTITUTION: the fixture cannot stand in for the corpus.             │
└────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUMENT 3 · THE NEGATIVE HALF          proves: aim, not just teeth        │
│   RUN   the ordinary-prose controls (PBK's own 5 `source_kind` controls)     │
│   FALSIFIES  "zero false positives" — when any control fires                 │
│   ★ A suite with no negative half is HALF A SUITE.                           │
└────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUMENT 4 · THE LEDGER CENSUS          proves: the box is occupied        │
│   RUN   grep -vc '"jev":null' ~/.omp/run/lexicon-ledger.jsonl                │
│   FALSIFIES  "the semantic layer is live" — when the count is 0              │
│   ★ THIS IS THE INSTRUMENT THAT WAS NEVER RUN. It returns 0 today.           │
└────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────┐
│ INSTRUMENT 5 · THE UNWIRED-EDGE SCAN      proves: the wiring exists          │
│   RUN   for every registered question, grep a caller in the decide path      │
│   FALSIFIES  "question X is wired" — when consumers == 0                     │
└────────────────────────────────────────────────────────────────────────────┘
```

**THE SELECTION RULE, with NO artifact type exempt:**

```
a QUESTION            → instrument 1 (the control pair)
a DECIDER CAPABILITY  → instrument 2 (the corpus sweep) + 4 (the census)
an ENFORCEMENT CLAIM  → instrument 3 (the negative half)
a WIRING claim        → instrument 5 (the unwired-edge scan)
```

**If no instrument can falsify a claim, the claim is redesigned out — not softened.**

---

## §7 · THE ARTIFACT

### 7.1 THE QUESTION MEMBER (the registry's unit)

```
interface DecisionQuestion {
  id:            string;                 // the ledger's `Pattern` for this decision
  rule:          string;                 // the lexicon rule it serves
  family:        G1..G8;                 // which generator family (§3)
  type:          "choice";               // ★ ALWAYS choice with opposed criteria —
  instructions:  string;                 //   never a bare noul (measured, §0.2)
  criteria:      { [label]: string };    // ★ exactly two opposed labels, or more, disjoint
  controlPos:    string;                 // a span that MUST take criteria[0]
  controlNeg:    string;                 // a span that MUST take the other
  separationFloor: number;               // e.g. 0.50 — the load gate
  measuredDelta?: number;                // written by instrument 1; REQUIRED to arm
  status:        "ARMED" | "DRAFT" | "REJECTED";
}
★ A question without controlPos/controlNeg, or whose instrument-1 run is below the floor,
  CANNOT reach status ARMED. The registry refuses at load, naming the id. (Law L-3/L-4.)
```

### 7.2 THE LEDGER ROW (extended — the empty field becomes the record)

```json
{"Pattern":"<rule-id>",
 "State":{"band":"GRAY","score":0.44,"source_kind":"own_utterance"},
 "Evidence":{"span":"<the matched text>","file":"<path:line>"},
 "Decision":{"question":"Q-A1","choice":"ASSERTS verification was performed",
             "confidence":0.9908,"separation_delta":0.9816,"decider":"jevk5@8090"},
 "Action":{"kind":"ABORT+INJECT"|"SILENT"|"ESCALATE","remedy":"<the correction text>"}}
```
★ **`Decision` non-null is the census metric.** Today the analogous field is `"jev":null` on
**1245 of 1245** rows.

### 7.3 THE CLOSURE MATH (the honesty signature)

```
QUESTIONS   registered: N   ·   ARMED: A   ·   REJECTED: R   (each with its ΔP)
CORPUS      spans adjudicated: M   ·   agreement: k/M   ·   chance baseline: b
NEGATIVE    controls fired: 0/N_neg        (must be 0)
LEDGER      rows: T   ·   with a Decision: D   (D/T is the traffic the decider carries)
TREND       agreement over successive sweeps:  a1 → a2 → a3   (flat = the corpus was
            written to match what the decider already did — the fixture trap, re-run)
```

**STATUS VOCABULARY — `ARMED` / `REJECTED` / `ESCALATED` / `UNRUN`. There is no `PROBABLY FINE`.**

---

## §8 · THE COMPOSITION MAP

### 8.1 WHAT THIS DESIGN OWNS, AND WHAT IT HANDS OFF

```
                        ┌─────────────────────────────────────┐
                        │  THE DECISION LAYER (this design)   │
                        │  · the question registry + controls │
                        │  · the decider client (:8090)       │
                        │  · the router band                  │
                        │  · the ledger Decision block        │
                        │  · the corpus sweep + the census    │
                        └───────────┬──────────┬──────────────┘
                                    │          │
        nominates a span ───────────┘          └─────── authorizes an action
                    │                                        │
        ┌───────────▼────────────┐            ┌──────────────▼──────────────┐
        │  THE LEXICON (PBK)     │            │  THE ENFORCER (lexicon-gate) │
        │  OWNS: the rules, the  │            │  OWNS: ctx.abort(), the      │
        │  banks, the band, the  │            │  inject payload, the         │
        │  source_kind gate      │            │  dedupe/ratelimit guards     │
        └────────────────────────┘            └──────────────────────────────┘
                    │                                        │
        ┌───────────▼────────────┐            ┌──────────────▼──────────────┐
        │  JEVIK5 @ :8090        │            │  JEVI GATES (tickets)        │
        │  OWNS: the answer      │            │  OWNS: the AUTHORIZATION for │
        │  (choice + confidence) │            │  an action; the shrink law   │
        └────────────────────────┘            └──────────────────────────────┘
                    │
        ┌───────────▼────────────┐            ┌──────────────────────────────┐
        │  BEND 2 (this design)  │            │  PARAGON (unchanged)         │
        │  PROVES: the ROUTER's  │            │  OWNS: the contract ladder,  │
        │  discipline (L-1..L-6, │            │  the triad, the machines     │
        │  L-9). CANNOT prove    │            │                              │
        │  the decider (L-7).    │            │                              │
        └────────────────────────┘            └──────────────────────────────┘
```

### 8.2 THE BOUNDARY PARAGRAPH (the precedence, stated so it cannot collide)

**This design owns exactly one thing: the decision term.** The lexicon owns WHAT to look at
(the nomination); this design owns WHETHER it means a violation (the judgment); the enforcer owns
WHAT TO DO (the action). **The band is a ROUTER, not a decision** — that is the single precedence
rule the whole design rests on, and it is the exact boundary PBK crossed when "the band decides."

**THE NO-DUPLICATION LAW.** This design must not re-implement: the rules (the lexicon owns them),
the abort machinery (the extension owns it), the judge client (Jev Gates' `judge.ts` owns the wire
and its `JUDGE_UNAVAILABLE` contract), or the ticket algebra (Jev Gates owns it). It may only
**add the registry, the router's decision branch, the ledger block, and the instruments.**

★ **Jev Gates already owns a working `:8090` client** (`src/jev/judge.ts` — `mintJudge`, a
multi-question adapter, fail-loud). **This design reuses it verbatim rather than writing a second
client.** A second client is a second source of truth, and PBK's own F-7 lesson is what that
costs.

---

## §9 · THE TRIGGER SURFACE

**FORWARD TRIGGERS — the operator's literal words, including the frustrated forms:**

```
"make PBK work"                        "PBK with real intelligence"
"PBK never worked"                     "the semantic layer"
"wire the judge into PBK"              "why is PBK not intelligent"
"PBK is just regex"                    "the band is not a decision"
"the lexicon is theatrical"            "a fitted scorer"
"0 of 1245"                            "the ledger has no judgments"
"make the decision layer real"          "PBK observe mode" / "PBK enforce mode"
```

**NEGATIVE TRIGGERS — where this must NOT fire:**

```
a container test              → deep-container-testing
a ticket round                → the Jev Gates tree
TTSR rule authoring           → ttsr-rule-authoring
the Paragon substrate         → paragon-substrate
a lexicon RULE's bands        → lexicon-rule-derivation  (this design does not set bands)
"make the judge smarter"      → refused: §0.4 — the answer is the QUESTION, not the model
```

**ARGS.** `rule` (which lexicon rule) · `span` (the text under decision) · `decider` (default
`:8090`) · `posture` (observe|enforce — §12 F-2).

---

## §10 · FILE LAYOUT + DEPLOYMENT

```
pbk-v2/src/decide/                     ★ THE NEW MODULE (the decision layer)
  questions.ts        the DecisionQuestion registry + the load gate (L-3/L-4)
  questions.data.ts   the Q-A1..Q-A3 members, each with its control pair
  decide.ts           the router: band → question → :8090 → choice | INCONCLUSIVE
  ledger.ts           the row writer (the Decision block, L-6)

pbk-v2/src/decide/__tests__/
  registry.test.ts    a question with no controls is REFUSED (the negative test)
  separation.test.ts  ★ instrument 1: every ARMED question's ΔP ≥ the floor
  corpus.test.ts      ★ instrument 2: the sweep + the baseline + the negative half

pbk-v2/scripts/
  decide-census.sh    ★ instrument 4: grep -vc '"jev":null' + the trend
  decide-firewall.sh  ★ instruments 1+3+5 bundled: exit nonzero = FAIL
```

**THE DEPLOYMENT STEPS (reachability is part of the design):**

```
1  the registry loads at extension start; a REJECTED question is named in the log, never silent
2  the router's decision branch is present at the band==GRAY site (grep it in the loader)
3  the ledger writes the Decision block (the census must go from 0 → N on the first live span)
4  the firewall script exits nonzero when: any ARMED question's ΔP < floor · any negative
   control fires · any ARMED question has 0 callers
★ THE REACHABILITY PROOF: after deployment, ONE live span must produce a ledger row whose
  Decision is non-null. Until that row exists, the semantic layer is a CLAIM (PBK's own words).
```

---

## §11 · WORKED EXAMPLE

### 11.1 THE SHALLOW READING, AND WHAT IT WOULD HAVE PRODUCED

The obvious reading of *"make PBK work with real intelligence"* is **"wire the judge in."** Walk
that version through a real span:

```
SHALLOW DESIGN
  ① the lexicon bands a span GRAY
  ② the code calls :8090 with a noul:
       "Does the state claim that verification has been performed… Answer with the probability
        that this is an unsupported verification claim."
  ③ the answer is 0.747 → above the band → ABORT + INJECT
  ④ the ledger records a number

WHAT IT PRODUCES (measured today, evidence/TRANSCRIPT.txt §1)
  POSITIVE span  → 0.747 → the extension ABORTS
  NEGATIVE span  → 0.796 → the extension ALSO ABORTS   ← the honest statement is punished
  the ledger fills with plausible numbers
  the dashboard is green
  THE SYSTEM ABORTS HONEST WORK AND REPORTS ITSELF AS INTELLIGENT.
★ That is the SAME failure PBK already has, wearing a model instead of a regex — and it is
  WORSE, because a number is harder to argue with than a band.
```

### 11.2 THE DEEP DESIGN, WALKED WITH THE SAME SPAN

```
DEEP DESIGN (this blueprint)
  ① the lexicon bands the span GRAY                    (nomination)
  ② the registry yields Q-A1 — an OPPOSED-CRITERIA choice
       criteria: "ASSERTS verification was performed"  /  "ASSERTS it was not performed…"
  ③ the state is sent; the answer is {choice, confidence}
  ④ confidence ≥ the separation floor → the decision stands
     confidence <  the floor          → INCONCLUSIVE → ESCALATE (never a pass, never a block)
  ⑤ the ledger records: question, choice, confidence, the control Δ, the band
  ⑥ the sweep measures agreement; the census counts the Decision blocks

MEASURED, ON THE IDENTICAL SPANS
  POSITIVE → "ASSERTS verification was performed"                      P = 0.9908
  NEGATIVE → "ASSERTS verification was not performed / not established" P = 0.9912
  Δ control = 0.9816  → the question is ARMED
```

### 11.3 THE CONTRAST, SCORED

```
┌────────────────────────────┬──────────────┬──────────────┬─────────────────────────────┐
│ THE PROPERTY               │ SHALLOW      │ DEEP         │ THE INSTRUMENT THAT DECIDES │
├────────────────────────────┼──────────────┼──────────────┼─────────────────────────────┤
│ separates the two spans    │ NO (0.747    │ YES (0.9908  │ instrument 1 (the control   │
│                            │ vs 0.796)    │ vs 0.9912)   │ pair, run at load)          │
│ the question is validated  │ no           │ yes, at load │ the registry's refusal      │
│ the empty box is occupied  │ "yes" (a    │ yes, counted │ instrument 4 (the census)   │
│                            │ number)      │ (D/T)        │                             │
│ honest work is punished    │ YES          │ no           │ instrument 3 (negative half)│
│ accuracy claim is honest   │ fixture F1   │ N/M + the    │ instrument 2 (the corpus)   │
│                            │ = 1.000      │ baseline     │                             │
│ the shape is provable      │ no           │ the router   │ Bend LAWS.bend (L-1..L-6)   │
│                            │              │ is           │                             │
└────────────────────────────┴──────────────┴──────────────┴─────────────────────────────┘
★ THE SHALLOW VERSION IS INDISTINGUISHABLE FROM THE DEEP ONE UNTIL YOU RUN THE CONTROL PAIR.
  That is why the control pair is a LOAD-TIME gate and not a checkbox.
```

### 11.4 AND THE BEND HALF, WALKED

```
WHAT BEND PROVES (class (a) — provable over immutable data)
  law no_detector_decides   for +g: Gate   {isDetector(g) == True{}} -> {blocked(g) == False{}}
                            → L-2 made a THEOREM, not a review rule
  law decision_required     for +a: Action {isBlock(a) == True{} : Bool}
                            -> {hasDecision(a) == True{} : Bool}
                            → a block is unreachable without a decision (the anti-phantom law)
  law router_total          for +b: Band   {routes(b) == Pass{} : Route} & {routes(b) == Block{}}
  law inconclusive_not_pass for +c: Choice {confidence(c) < floor : Bool}
                            -> {action(c) == Escalate{} : Action}
  law registry_rejects      for +q: Question {hasControls(q) == False{} : Bool}
                            -> {armed(q) == False{} : Bool}          ← L-3 at the type level

WHAT BEND CANNOT PROVE (class FOREIGN — and the toolchain says so)
  the decider's opinion. `bend PROOF.bend --verdict` REFUSES a book that relies on foreign
  code. → the model's answer is EVIDENCE-FREE BY CONSTRUCTION, and the design must therefore
  make its validity a RUNTIME-MEASURED property (the separation Δ + the corpus agreement),
  never a theorem.

★ THE PROVIDABLE/FOREIGN BOUNDARY FALLS EXACTLY BETWEEN THE ROUTER AND THE JUDGE — and that is
  not a limitation the design works around. It IS the design: the SHAPE is proven, the OPINION
  is measured, and neither masquerades as the other.
```

### 11.5 THE JEV GATES ENHANCEMENT (the second half of the ask)

Jev Gates already has the decider PBK lacks (`src/jev/judge.ts` → `:8090`), a working ticket
algebra, and — from the Bend research — a proof gate. The enhancements, in value order:

```
① THE COMPANION LAWS — ALREADY APPLIED (commit e58ceb4). Three of v1's five laws were lower
  bounds satisfiable by a ticket-destroying judge; judge_keeps_sibling + judge_drops_judged
  close it, with a standing negative control at bend-integration/mutation-check/.

② THE SAME QUESTION-SHAPE LAW APPLIES TO JEV GATES' OWN JUDGE. `mintJudge` asks the six
  CH-MINTER questions. ★ NONE of them carries a control pair. By L-3/L-4 every minter question
  should ship with a positive and a negative span and a measured Δ — otherwise the minter's
  set is derived from a judge whose discrimination was never validated. (The minter decides the
  TICKET SCOPE; a topic-match question there mis-scopes every downstream act.)

③ THE SEAM (measured, from the Bend research): a proof-gated Bend kernel compiles to an ES
  module callable from TypeScript — the same source is the theorem and the runtime. The
  ticket's shrink algebra can be Bend code, not a parallel model.

④ THE THREE-TIER LADDER: Z3 in-process for the decidable arithmetic; Bend for linearity/shape
  (consumption-once, the ticket's own law); the Lean kernel via `--verdict` as the trust anchor.

⑤ THE ANTI-WEAKENING WIRE: LAWS.bend sits under a ticket — modifying a law is not in any
  agent's authorized set. Bend's conceded hole ("an agent that deletes a requirement can make
  the remaining proofs pass") closes against Jev Gates' seal.
```

---

## §12 · OPEN DECISIONS (forks with recommended defaults)

| # | the fork | the options | **THE RECOMMENDED DEFAULT** | needs the operator? |
|---|---|---|---|---|
| F-1 | **the decider's endpoint** | (a) `api.typesafe.ai` (blocked: 402, no credits) · (b) **`:8090` local** (alive, native `/v1/systemone`, ~1s) · (c) KEV-0.6b-ONNX (offline, no server) | **(b) `:8090`**, with (c) reserved as the CI/offline rung | **no** — measured alive; the 402 is self-imposed |
| F-2 | ★ **the posture** | (a) **OBSERVE** — the decider runs, records, never aborts · (b) ENFORCE — abort + inject · (c) staged: observe for N spans, then enforce | **(a) OBSERVE FIRST**, gated on instrument 2 meeting its floor; enforcement only after an observed agreement rate | **★ YES — this one is the operator's** |
| F-3 | **the accuracy instrument** | (a) the existing 89-case fixture · (b) a live-corpus sweep · (c) **(b) + a chance baseline + a hand-adjudicated sample** | **(c)** — PBK's own law: *"a 100% fixture score is an effort receipt"* | no |
| F-4 | the question count per span | (a) one question per rule · (b) the whole §4 ladder | **(a) one, the cheapest separable question**; escalate only on a gray confidence | no |
| F-5 | the ledger schema | (a) add a `Decision` block · (b) a parallel ledger | **(a)** — one ledger, the `jev` field finally non-null | no |

**THE ONE FORK THAT NEEDS THE OPERATOR: F-2 (the posture).** It is the fork this design cannot
take on a default, because the last time PBK enforced, its injections broke goal loops — the
`lexicon-gate.OFF` sentinel and the `silence-lexicon-gate-injections` skill are the scar tissue.
**The recommendation is observe-first with a measured gate to enforcement**, but whether PBK
enforces at all — and on which host — is the operator's ruling.

**DEFAULTS TAKEN (stated so they can be overruled):** F-1 → `:8090`; F-3 → corpus + baseline +
sample; F-4 → one question per span; F-5 → one ledger, extended.

---

## §13 · THE SELF-CHECK + THE RESIDUAL

### 13.1 THE REFLEXIVE APPLICATION (the design's own law, run against the design)

**§0.3's law: *"a question without opposed criteria measures topic match."*** Applied to this
document — **what did this blueprint assert without a control pair?**

```
CLAIM                                       THE OPPOSED CONTROL                        VERDICT
"the local judge is alive"                  :8090 → 400 (alive, validating) vs          MEASURED
                                            :7778 → unreachable
"the readout is valid"                      TRUE 0.600 vs FALSE 0.139                   MEASURED
"the question shape is the mechanism"       noul 0.747/0.796 vs choice .9908/.9912      MEASURED
"the empty box is empty"                    0 of 1245 rows                              MEASURED
"PBK is disarmed on this host"              lexicon-gate.OFF exists; rules dir empty;   MEASURED
                                            extension absent
"the 11 gates return verdicts"              phantom-gate is a literal no-op;            MEASURED
                                            sttgf-gate:92 returns a block verdict
"the band would misfire on honest work"     ✗ ASSERTED, not measured — the band was     ★ RESIDUAL
                                            never run on an honest span in this session
"the decider generalizes beyond my 2 spans" ✗ ASSERTED — only 2 control pairs were run     ★ RESIDUAL
```

### 13.2 THE NAMED RESIDUAL (a blueprint with no residual claims totality — the failure it kills)

```
R-1  THE BAND WAS NEVER EXERCISED. The ruler's GREEN/GRAY/RED band is taken from PBK's docs
     (0.30/0.62), not measured here. What the design needs and does not have: the band's
     behaviour on a corpus of ordinary prose. EVIDENCE THAT WOULD SETTLE IT: instrument 2 run
     over a real session transcript with the band's output per span.

R-2  THE DECIDER'S AGREEMENT IS UNMEASURED. Two control pairs and four readout probes is not a
     corpus. N=2 with Δ=0.98 is a proof that the QUESTION SHAPE works; it is NOT a claim about
     accuracy. EVIDENCE: ≥200 hand-adjudicated spans.

R-3  THE QUESTION SETS ARE STUBS. §§4's playbooks give the shape and one worked question each;
     the full set (one per rule × one per family) is not written. EVIDENCE: the registry's
     first full load + instrument 1 across it.

R-4  JEV GATES' SIX MINTER QUESTIONS WERE NOT TESTED FOR SEPARATION. ② in §11.5 is a WORK ITEM
     derived from this session's law, not a measured defect. EVIDENCE: run instrument 1 on each.

R-5  THE POSTURE (F-2) IS UNRULED — the design's enforcement half is blocked on the operator,
     by design.

R-6  NOT ENUMERATED: the interaction between PBK's abort loop guard (lastAbort, one abort per
     (rule, span)) and a DECISION carrying a confidence — e.g. whether a second span with the
     same signature re-fires. Named here because it was never gamed out.

R-7  THE 11 MIDDLEWARE GATES WERE MEASURED FOR SHAPE, NOT FOR BEHAVIOUR. L-2 will fail on all
     of them today; the design does not include the remediation of the other ten.

R-8  THE CANON-MEMBER MODEL. `~/.omp/agent/managed-skills/jev-gates-master-context` and the
     `PARAGON_V2_BLUEPRINT`'s 61 rules were not read for this pass — the 26 failure classes may
     already contain question shapes. If so, this design should ADOPT them, not re-derive them.
```

### 13.3 THE SELF-CHECK

```
[x] MOVE 1  IMMERSE — FAILURE_LOG, THEATRICALITY_LOG, CURRENT_STATE, NEXT_STEPS, the middleware
            tree, the ledger, the rules dir, the live processes (no design from memory)
[x] MOVE 2  DIFFERENTIAL — §1's 12 rows, every `does NOT` cell named
[x] MOVE 3  REDUCE — one mechanism, tested against three instances + the operator's unmentioned
            failures
[x] MOVE 4  LAWS — §0.3's four lines
[x] MOVE 5  INVERT — the registry that REFUSES a question with no control pair
[x] MOVE 6  LOOP + STOP — §2.1/§2.2, the stop is a measurement on a corpus
[x] MOVE 7  GENERATOR + PLAYBOOKS — §3's 8 families, §4's 5 playbooks on one meta-template
[x] MOVE 8  LAWS AS FORBIDDEN — §5's L-1..L-9, each with a consequence
[x] MOVE 9  FALSIFICATION — §6's 5 instruments + the selection rule, no artifact exempt
[x] MOVE 10 OBSERVABLE OUTPUT — §7's member, row, and closure math; §11.3's scored contrast
[x] MOVE 11 COMPOSITION — §8's fan-out + the boundary paragraph + the no-duplication law
[x] MOVE 12 TRIGGERS — §9's literal phrases + the negative triggers
[x] MOVE 13 DEPLOYMENT — §10's layout + the reachability proof (one non-null Decision row)
[x] MOVE 14 WORKED EXAMPLE — §11, walked with the measured numbers
[x] MOVE 15 FORKS — §12, five forks, four defaulted, F-2 named for the operator
[x] MOVE 16 REFLEXIVE — §13.1 ran the design's own law against itself; §13.2 names 8 residuals

FILES TOUCHED (proposed, NOT created — this is a design, and the HARD GATE holds):
  pbk-v2/src/decide/{questions,questions.data,decide,ledger}.ts        (new)
  pbk-v2/src/decide/__tests__/{registry,separation,corpus}.test.ts     (new)
  pbk-v2/scripts/{decide-census.sh,decide-firewall.sh}                 (new)
  pbk-v2/src/middleware/* — the L-2 remediation (10 further gates)     (RESIDUAL R-7)
★ NOTHING WAS BUILT. §10's layout is the specification; the implementation waits on the
  operator's approval (brainstorming's HARD GATE) and on F-2's ruling.
```

---

## THE ONE-PARAGRAPH ANSWER

PBK has never worked with real intelligence because it has a detector and an enforcer and **the
decision term between them has never been occupied** — measured, not argued: 1245 ledger rows,
**zero** carrying a judgment. And when the missing decider was finally asked the question PBK
would ask, the question itself was the defect: a compound, leading `noul` returned 0.747 for a
dishonest claim and **0.796 for an honest one** — no discrimination, only a topic match,
delivered as two plausible numbers. The same two states asked as an **opposed-criteria `choice`**
separate at **0.9908 / 0.9912**. That is the whole design: the decider was never the problem and
the model was never the problem — **the question is the mechanism**, so the registry must refuse
any question that cannot demonstrate its own separation, exactly as the lexicon already refuses a
bare regex. Wire it as nominate → ask → decide → enforce → record → measure, make the band a
router rather than a decision, put the decider on the local `:8090` that has been serving all
along instead of the paid endpoint that returns 402, and let Bend prove the **shape** around the
judge — because the judge is a foreign, the toolchain refuses to prove it, and that boundary is
the design rather than a limitation of it.
