# PBK V4 — THE BEND FIRMWARE BLUEPRINT

> create-planning pipeline · master-blueprint anatomy · 2026-09-29
> target: **Bend as FIRST-CLASS FIRMWARE** — the Paragon architecture enforced
> through the kernel's own type system, not by review
> artifact: `PLANNING_SUITE_PBK_V4_BEND_FIRMWARE.md`
> **Class: system** — a system blueprint (nine-section master anatomy, system floor 1000+)

---

## §0 · THE CLASSIFICATION

**ARCHITECTURAL.** This restructures how PBK's components fit: the Paragon architecture
moves from *TS code that respects a doctrine* to *a type system the kernel is compiled
against*. Interfaces others depend on change (the kernel gains a Bend provenance; the
extension's hooks call a proven artifact). Per brainstorming, the heavier path applies.

### 0.1 THE INTENT (the operator's words, verbatim)

> *"i want a clear /skill:master-blueprint for the PBK design w/ bend wired in as a first
> class firmware lanaguage enforcing the paragon architecture through the kernel itself.
> show me exactly hwo this looks. next forward version iteration of PBK"*

### 0.2 THE READ RECEIPT (create-planning §0)

```
brainstorming           READ — classify first; the HARD GATE holds
blueprinting            READ — ONE mechanism not a list; the `does NOT` column IS the spec;
                               MOVE 5 — never ask the agent to BE better
focus                   READ — read the ARTIFACT never the status field; L4 mechanical
                               guarantee > documented policy; L7 the honest gap; measure >> write
fable-plan              READ — the evidence fan-out in ONE batch; the decision gate
trident-problem-solving READ — the stall handler, hard-bound at 3 fix-verify cycles
```

### 0.4 THE SCOPE (the mission's nouns, and what is out)

**THE MISSION, as nouns.** Each is a first-class subject of this blueprint:
**PBK** (the system being versioned) · **Bend** (the language) · **firmware** (Bend's role:
the layer the host cannot bypass) · **Paragon** (the architecture being enforced) ·
**kernel** (the artifact that carries the enforcement) · **law** (the operator-owned
invariant) · **gate** (the refusal that makes a law firmware).

**IN SCOPE:** the ten Paragon laws (F1–F10) as Bend types; the kernel + its proofs; the
artifact seam into the TS host; the decision layer's wiring; the mutation discipline.

**OUT OF SCOPE, and why:** the 11 middleware gates' internal patterns (their SHAPE is in
scope, their 11 rules are not); the Paragon L4/L5/L6 internals (read for the purity
boundary only); the Jev Gates ticket kernel (proven separately); Bend's own compiler.

### 0.3 THE POST-HOC / FORWARD SPLIT (master-blueprint §2.4, honestly applied)

`master-blueprint` extracts a system that EXISTS. PBK **V3** exists on disk; **V4** does not.
So every claim below is classified:

| class | meaning | how it is marked |
|---|---|---|
| **BUILT** | on disk, anchored this session | `file:line` |
| **PROPOSED** | designed here, never landed | **PROPOSED** + its owner |
| **REJECTED** | killed, with the reason | §8 |

**No content in this artifact is stated as fact without one of those three markers.**

---

## §1 · THE DIFFERENTIAL

Every existing thing adjacent to the intent → what it does → **what it does NOT do.**
The `does NOT` column is the specification of PBK V4.

| # | the existing thing | what it does | **★ what it does NOT do** |
|---|---|---|---|
| 1 | `pbk-v2/src/middleware/*.ts` (11 gates) | pattern-checks a tool call; returns a block verdict | **cannot enforce an architecture** — one is a literal no-op (`phantom-gate.ts:51` `void recorded; return async () => undefined`); all 11 decide from patterns |
| 2 | `extensions.DISABLED-20260924/lexicon-gate/` | scores a span → bands → `ctx.abort()` + injects | **does not decide** — a band on a fitted score; **PARKED**; `lexicon-gate.OFF` present |
| 3 | `~/.omp/run/lexicon-ledger.jsonl` | 1245 decision rows | **0 carry a judgment** — measured: `grep -vc '"jev":null'` → `0` |
| 4 | `~/.omp/agent/rules/` | the rule source dir | **EMPTY** — `loadRules()` throws; the extension cannot arm |
| 5 | `Codename:PARAGON/src/` (56 .ts) | the 6 layers, implemented | **evaluates, never proves** — `checkContract` returns `basis:'EVALUATED_EQUAL'` (`math/contract.ts`) |
| 6 | the **left-column law** ("classifier/synapse/machine/gate/collector/role-gate/circuit/engine are never edited") | a doctrine | **enforced by review** — nothing fails when it is violated |
| 7 | the **detector/decision split** ("PatternFlag carries NO verdict fields") | type-enforced **in TypeScript** | holds only while every author uses the TS type; a second implementation in another language is unpoliced |
| 8 | `src/enforcement/matrix.ts:97` | `verifyMatrix(srcRoot, pinnedSha: string \| null)` | **4 of 6 mechanisms are hardcoded `verified: true`**; the one dynamic check is **skipped when `pinnedSha === null`** |
| 9 | the warheads + TTSR | prose-law enforcement | **TTSR is the EMPTY HOOK** (0 native rules, by design); prose is not a proof |
| 10 | `MPSE` `MathContract` | runtime eval of pre/post/inv/temporal | the basis is **`EVALUATED_*`**, never `PROVEN` |
| 11 | `Jev_Gates/bend-integration/` | 5 laws, `--verdict` green, mutation-refused | a **v1 demo of one kernel** — not PBK's kernel |
| 12 | `worktrees/.../decision-layer/` | 8 laws + a self-verifying mutation harness (4/4 REFUSED-BY-LAW) | a **design-layer model** — not the Paragon kernel |
| 13 | **Bend as used so far (V3-era)** | a CI gate + one `.mjs` module | **NOT the kernel's language** — PBK's architecture is still TS, still enforced by convention |

**THE EMPTY CELL.** Row 13's `does NOT` is the whole specification: **Bend has never been
the language the architecture is expressed IN.** Every other row enforces by doctrine,
review, or a runtime check that something else can bypass.

---

## §2 · THE REDUCED CORE

### 2.1 THE ONE MECHANISM (blueprinting MOVE 3)

```
PBK ENFORCES ITS ARCHITECTURE BY DISCIPLINE AT EVERY LAYER THAT MATTERS.
A DISCIPLINE IS A LAW THE LAYER ABOVE IS ASKED TO RESPECT.
SO EVERY ARCHITECTURAL VIOLATION IS DISCOVERED BY REVIEW — AFTER THE FACT.
```

**The mechanism explains instances the operator never listed:**
- why one of 11 middleware gates is a **literal no-op** and nothing failed (`phantom-gate.ts:51`) —
  the architecture has no mechanism that notices an empty guard
- why `verifyMatrix` can return `verified: true` **four times without checking anything**
  (`matrix.ts:97-105`) — nothing distinguishes a computed verdict from a literal
- why 1245 adjudications produced **0 judgments** — the decision term was never a *required*
  field of any row; a row is well-formed without it
- why TTSR held 9 rules that read **0** lexicon input, and the claim survived a whole wave —
  a carrier can be empty and still report as armed

### 2.2 THE DERIVED LAWS (blueprinting MOVE 4)

```
FIRMWARE   = A LAW THE LAYER ABOVE CANNOT BYPASS.
DISCIPLINE = A LAW THE LAYER ABOVE IS ASKED TO RESPECT.
A LAW IS FIRMWARE IFF VIOLATING IT FAILS THE BUILD.

PBK V4: EVERY PARAGON ARCHITECTURAL LAW BECOMES A BEND LAW, AND THE KERNEL
        CANNOT BE BUILT WITHOUT DISCHARGING THEM.
```

### 2.3 THE INVERSION (blueprinting MOVE 5 — the most important move)

```
BAD:   "the left column is never edited"        ← an instruction to a human
GOOD:  "a detector that returns a verdict does not typecheck; the build refuses"

BAD:   "always write the triad"
GOOD:  "a Finding is a product type {Pattern, State, Evidence};
        a finding without evidence has NO CONSTRUCTOR"

BAD:   "INCONCLUSIVE must never be treated as PASS"
GOOD:  "advance() takes a Pass{} — and Inconclusive{} produces no Pass{}"
```

**Every section below is a mechanism that REPORTS the violation. None is an adjective.**

### 2.4 ★ THE CONVERGENCE (why Bend and Paragon are the same shape)

```
Bend's toolchain refuses FOREIGN code in a `--verdict` book.
A model call is foreign.
SO: A DECIDER CAN NEVER LIVE INSIDE A PROVEN KERNEL.

Paragon's fusion law: "shadow output NEVER enters state unfiltered"
LASME's cardinal law: "detection NEVER decides"

★ THE LANGUAGE'S TRUST BOUNDARY **IS** THE ARCHITECTURE'S BOUNDARY.
  The toolchain refuses to prove what the architecture forbids.
  That agreement is the design's strongest argument — it is not a coincidence
  the tool was chosen for; it is the reason the tool fits.
```

---

## §3 · THE DESIGN — THE CANON

### 3.1 THE MACRO BLUEPRINT (the whole system on one page)

```
┌────────────────────────────────────────────────────────────────────────────┐
│  PBK V4 — THE FIRMWARE STACK                                               │
│                                                                            │
│  L0  THE LAWS         LAWS.bend        operator-owned. The machine may      │
│      the constitution                  not edit it. Each law names its      │
│                                        forbidden behavior + consequence.    │
│            │                                                               │
│            ▼  discharged by                                                 │
│  L1  THE KERNEL       kernel.bend      ★ THE PARAGON INVARIANTS BECOME      │
│      the microcode                     TYPES. A violating kernel has no     │
│                                        well-typed term.                     │
│            │                                                               │
│            ▼  discharged by                                                 │
│  L2  THE PROOFS       PROOF.bend       one `def Laws.<law>` per law.        │
│            │                                                               │
│            ▼  checked by                                                    │
│  L3  THE GATE         bend --verdict   the Lean-proven kernel re-checks.    │
│                                        SOUND, NOT COMPLETE: it may refuse   │
│                                        a correct proof; it cannot accept a  │
│                                        wrong one.                           │
│            │  on green                                                      │
│            ▼                                                               │
│  L4  THE ARTIFACT     kernel.mjs       the SAME source, emitted as an ES    │
│      the executable                    module. Proven and running are one   │
│                                        file — they cannot drift.            │
│            │  imported by                                                   │
│            ▼                                                               │
│  L5  THE HOST         the extension    drives it. CANNOT bypass L1: a       │
│      the OS                            kernel that violates the laws does   │
│                                        not exist to import.                 │
└────────────────────────────────────────────────────────────────────────────┘
                                      width 76, borders aligned
```

**Every box names a lifecycle section below.**

### 3.2 THE STAGE TABLE (WHAT / HOW / WHERE / WHY)

| stage | WHAT | HOW | WHERE | WHY |
|---|---|---|---|---|
| **L0 the laws** | the Paragon invariants, stated | one `law <name>:` per invariant, each with its forbidden behavior in a comment | `LAWS.bend` (new) | the machine may not edit it; the human's intent is the input |
| **L1 the kernel** | the invariants as TYPES | sum/product types that make a violation unconstructible | `kernel.bend` (new) | types are the only enforcement a caller cannot skip |
| **L2 the proofs** | the discharge | one `def Laws.<name>` per law | `PROOF.bend` (new) | a law with no body is an OPEN CLAIM (`bend guide`) |
| **L3 the gate** | the build refusal | `bend PROOF.bend --verdict` → exit 0 | CI + pre-arm | see §2.4: sound, not complete |
| **L4 the artifact** | the runtime | `bend kernel.bend -o kernel.mjs` | the extension's import | the proof and the program are the SAME source |
| **L5 the host** | the driver | `import * as K from "./kernel.mjs"` | `lexicon-gate/index.ts:80` `decide()` | the TS host keeps IO; the kernel keeps the law |

### 3.3 ★ THE PARAGON LAWS → BEND TYPES (the heart of the design)

Each row: the canon's law (with its anchor) → the Bend construct that makes it firmware.

| # | the Paragon law (anchored) | TODAY | **V4 — the Bend construct** |
|---|---|---|---|
| F1 | *"PatternFlag carries NO verdict fields"* — the detector/decision split (`lasme/contracts.ts`) | TS types | `type Flag is Data: Flag{rule: String, span: String}` — **and no function that returns `Flag` can return a `Decision`, because `Decision` is not a `Flag`.** A detector cannot construct one. |
| F2 | *"fail-state is INCONCLUSIVE, never PASS"* (`20_STATE_MACHINES…` L259-260) | code shape + review | `type GateVerdict is Data: Pass{} \| Fail{reason: String} \| Inconclusive{why: String}`; `advance(v: GateVerdict)` matches — **`Inconclusive` produces no `Pass`**, so the branch is structurally impossible |
| F3 | *"no {Pattern, State, Evidence} triplet = no finding"* (Lexicon :114-117) | a review rule | `type Finding is Data: Finding{pattern: PatternRef, state: StateRef, evidence: EvidenceRef}` — **a finding without all three has NO CONSTRUCTOR** |
| F4 | *"the ONLY enforcement verb"* is BLOCK (`ArmDecision`) | a union in TS | `type Arm is Data: Block{code: String, remedy: String} \| Demand{...} \| Allow{}` — the enforcer **returns** an `Arm`; there is no path that mutates state |
| F5 | *"the escape hatch is checked BEFORE the block"* (`throw-arms.ts`) | statement order (measured: FOUR distributed sites) | the exemption is a **constructor that must be consumed first**: `checkEscape(m: Mechanism) -> Or(Escaped{}, NotEscaped{})` — the block arm takes `NotEscaped{}` as an argument, so **the order is a type dependency** |
| F6 | *"the band routes, never decides"* (the release's own correction) | a convention | `type Band is Data: Silent{} \| Gray{} \| Fire{}` — **no action field exists on `Band`**; only `Arm` authorizes |
| F7 | *"a claimed verdict authorizes nothing"* (built this session) | BUILT — 8 Bend laws, 4/4 mutants refused | already firmware |
| F8 | *"classifier/synapse/machine/gate/collector/role-gate/circuit/engine are never edited"* (the left column) | a doctrine | **the left column is a MODULE the right column imports and cannot rebind**: `import ./left.bend as L` gives `L.<Type>`; the right column's data is a *parameter*, the left column's types are *closed* |
| F9 | *"no self-signed evidence"* (LASME) | a review rule | a verdict carries `Proven{id}` \| `Measured{n, corpus, baseline}` \| `Claimed{prose}` — **and only the first two authorize.** `Measured` with `n = 0` is refused (BUILT, mutated, proven) |
| F10 | *"the gate must be consulted on the live path"* (`matrix.ts` verifyDistSha) | a call that can be skipped (`pinnedSha: string \| null`) | the pin is a **required argument of the proof**: a `Sha` value, not `Sha \| null` — the skip path has no type |

★ **Note what F8 does.** The Paragon left/right split stops being a rule about editing and
becomes a **module boundary with no rebinding**: the right column can *use* the left column's
types and cannot *replace* them. "Never edited" becomes "not editable by construction."
PROPOSED — the module system gives `import ... as L`, and a proof that the right column
constructs no `Left`-owned value would be the discharge.

### 3.4 THE KERNEL — the invoke pseudocode (one mechanism, walked)

```
┌──────────────────────────────────────────────────────────────────────┐
│  judgeCall(span: Span, mech: Mechanism, ticket: Ticket) -> Arm       │
│                                                                      │
│  IN:  span      the text under decision                              │
│       mech      the mechanism (the left column's closed type)        │
│       ticket    the authorization record                             │
│                                                                      │
│  1  m ← gateCorpus(span)              // F-ing the artefact class    │
│     case Blob:      return Allow{}     // a tool argument is not     │
│     case RuleText:  return Allow{}     //   the agent's prose        │
│     case Prose:     → 2                                             │
│                                                                      │
│  2  f ← detect(span, mech)            // F1: returns a FLAG only     │
│     // `detect` cannot return an Arm — the types do not admit it     │
│                                                                      │
│  3  b ← bandOf(f)                     // F6: routes, never decides   │
│     case Silent: → return Allow{}                                    │
│     case Fire:   → 4                                                 │
│     case Gray:   → 4                 // the decider joins here       │
│                                                                      │
│  4  e ← checkEscape(mech)             // F5: BEFORE the block        │
│     case Escaped{}:    return Allow{}   // the exemption is consumed │
│     case NotEscaped{}: → 5                                           │
│                                                                      │
│  5  v ← askDecider(span, mech)        // ★ FOREIGN — see below       │
│     case Claimed{p}:        return Allow{}   // F7/F9: prose is void │
│     case Measured{n,·,·}:   if n = 0 then Allow{} else → 6           │
│     case Proven{·}:         → 6                                      │
│                                                                      │
│  6  t ← makeTriad(f, b, evidenceOf(v))// F3: all three, or no type   │
│     record(t)                          // F9: the ledger row         │
│     return Block{code, remedy}         // F4: the ONLY verb          │
│                                                                      │
│  OUT: Arm  (Block | Demand | Allow)                                  │
│                                                                      │
│  ★ STEP 5 IS A FOREIGN. `bend PROOF.bend --verdict` REFUSES a book   │
│    that relies on foreign code — so the decider is OUTSIDE the       │
│    proven kernel BY CONSTRUCTION. That is §2.4's convergence: the    │
│    toolchain enforces the architecture's own fusion boundary.        │
└──────────────────────────────────────────────────────────────────────┘
                      width 72, borders aligned
```

**The quality bar (master-blueprint §3.5):** each numbered step is implementable from the
block alone, and each is pinned to an observed behavior in §6's battery — steps 1, 4, 6 are
already built and measured; steps 2, 3, 5 are PROPOSED.

### 3.5 THE DISPATCH TRACES

```
THE EXTENSION'S TURN (V4 target)
──────────────────────────────────────────────────────────────────────
message_update(text_delta)
  → index.ts:128  buffer the delta
  → index.ts:135  split into lines
  → index.ts:141  decide(line, "", buf.fence)
        → index.ts:80   classifySource(...)          [TS — unchanged]
        → ★ NEW          K.gateCorpus(span)           [kernel.mjs — F-corpus]
        → ★ NEW          K.detect(span, mech) → Flag  [kernel.mjs — F1]
        → index.ts:91   isQuotedMatch(...)            [TS — unchanged]
        → ★ NEW          bandOf(flag)                 [kernel.mjs — F6]
  → index.ts:143  if band === fire && SCORABLE  → abort  [TS — unchanged]
  → ★ NEW         if band === gray              → K.checkEscape → K.askDecider
  → index.ts:98   record(ruleId, c, srcKind, span, jev)   [the jev slot, filled]

THE BUILD (V4 target)
──────────────────────────────────────────────────────────────────────
edit kernel.bend
  → bend PROOF.bend              fast checker    <1 s      [measured]
  → bend PROOF.bend --verdict    the Lean kernel 25.0 s on v1's 5 laws  [measured]
  → bend kernel.bend -o kernel.mjs                         [measured to work]
  → bun test                     the host's import of the artifact
  → rm ~/.omp/run/lexicon-gate.OFF   ← ARMING (the operator's ruling)
```

### 3.6 THE TREES

```
┌─ pbk-v2/                                     the host tree (BUILT)
│   ├─ src/middleware/*.ts                11   the legacy gates (the class F1 forbids)
│   ├─ src/ext/kernel-judge.ts          37 KB  the L1 judge (TS)
│   ├─ PARAGON_V2_BLUEPRINT.md          26 KB  the design authority
│   └─ ★ firmware/                        NEW  ─ the V4 subtree (PROPOSED)
│        ├─ LAWS.bend                          operator-owned · the constitution
│        ├─ kernel.bend                        the invariants as types
│        ├─ PROOF.bend                         the discharge
│        ├─ kernel.mjs                         the emitted artifact (not committed)
│        └─ mutation-check/harness.py          ★ the must-fail mutant per law
│
└─ ~/.omp/agent/                               the runtime (BUILT, DISARMED)
    ├─ extensions.DISABLED-20260924/lexicon-gate/{lib.ts:307,index.ts:203}
    ├─ rules/                                   ★ EMPTY — 9 rules missing
    └─ ../run/lexicon-gate.OFF                  ★ the sentinel
       ../run/lexicon-ledger.jsonl              1245 rows · 0 judgments
```
**caps disclosed: the trees are complete at this depth; `~` marks cross-tree edges.**

### 3.7 THE ERROR VOCABULARY (the frozen tokens)

```
JUDGE_UNAVAILABLE          the decider is unreachable — the caller fails LOUD  [judge.ts]
TICKET_TAMPERED            the record's seal does not recompute                  [lseal/lsp-cards]
INCONCLUSIVE               insufficient evidence — NEVER a pass                [LASME]
SUBSTRATE_DRIFT            the pinned sha != the live tree                      [matrix.ts:41]
ADVANCE_BLOCKED            advance() called before AUDITED                     [audit-registry]
FINDING_NO_TRIPLET         a finding row without its evidence                   [graph DDL]
LINEAGE_MISSING            a graph node without SPEC_DERIVED|CODE_DERIVED|HYBRID [graph DDL]
SOME PROOFS FAIL           the Bend gate's refusal (exit 1)                     [bend]
ALL PROOFS CHECK           the Bend gate's green (exit 0)                       [bend]
CITATION_LEDGER_EMPTY      the corpus gate found no prose to decide  ← PROPOSED (owner: V4)
```

### 3.8 THE FORKABLE SHELL (a builder starts here)

```python
# firmware/LAWS.bend — THE CONSTITUTION. Operator-owned. The machine may not edit.
import Base
import ./kernel.bend as K

# LAW F2: the gate never advances on an inconclusive verdict.
law inconclusive_never_advances:
  {K.advances(K.Inconclusive{"insufficient evidence"}) == False{} : Bool}

# LAW F1: a detector cannot produce a decision.
#   (this law is a TYPE-level fact in kernel.bend; the proof is `Unit{}`
#    because the term does not exist to be written)

# LAW F3: a finding without a triad does not exist.
law no_triplet_no_finding:
  {K.wellFormed(K.Finding{?}) == False{} : Bool}     # PROPOSED — the shape is the work

# LAW F7/F9 (BUILT, mutation-proven):
law prose_cannot_authorize:
  {K.authorizes(K.Claimed{"the refactor was verified"}) == False{} : Bool}
```

---

## §4 · THE EVIDENCE (cited — every claim anchored or marked)

### 4.1 MEASURED THIS SESSION (the firmware thesis is not asserted — it was exercised)

| # | the claim | the evidence | class |
|---|---|---|---|
| E1 | Bend's gate REFUSES a violation, naming the law | `decision-layer/`: 4/4 mutants → `REFUSED-BY-LAW`, each printing `Laws.<its own name>` (`mutation-check/harness.py`) | **MEASURED** |
| E2 | the gate passes the Lean kernel when correct | `bend PROOF.bend --verdict` → `ALL PROOFS CHECK`, exit 0 | **MEASURED** |
| E3 | the proof and the runtime are ONE artifact | `bend seam.bend -o seam.mjs` → an ES module whose `export default` carries every def; driven from bun, `spend`/`remaining` reproduced the ticket semantics exactly | **MEASURED** |
| E4 | the inconclusive state is mechanical | a `?TODO` law → `SOME PROOFS FAIL / "The code is incomplete, and not a valid proof yet."` exit 1 | **MEASURED** |
| E5 | `--verdict` is the only CI-grade check | `bend-integration/EVIDENCE.md`: fast checker <1 s (untrusted), `--verdict` 25.0 s (Lean-proven) | **MEASURED** |
| E6 | the toolchain refuses foreign code | `--verdict` FAILS a book relying on `@unsafe`/foreign, listing each dependent def | **BUILT** (README + angle A1) |
| E7 | PBK's decision term is empty | `grep -vc '"jev":null' ~/.omp/run/lexicon-ledger.jsonl` → **0** of 1245 | **MEASURED** |
| E8 | the corpus is 30.4% non-prose | `wiring/drive.ts` on the real ledger → 378 rejects (363 blob + 15 rule_text), 867 prose | **MEASURED** |
| E9 | the decider answers locally | `:8090` (`jevk5-runtime/systemone-server.py` → `:8008` `jevk5-4b_Q8_0.gguf`); opposed-choice **0.9908/0.9912** vs leading-noul 0.747/0.796 | **MEASURED** |
| E10 | the ledger can carry a decision | `wiring/e2e.ts` → 10/10 MEASURED, census 0 → 10 | **MEASURED** |
| E11 | a verdict can sign itself | `matrix.ts:97-105` — 4 of 6 mechanisms hardcode `verified: true`; `verifyDistSha` skipped when `pinnedSha === null` | **MEASURED** |
| E12 | a gate can be a literal no-op | `phantom-gate.ts:51` — `void recorded; return async () => undefined` | **MEASURED** |
| E13 | ★ **a detector fires on a MENTION, not an act** | **this session**: the STTGF gate blocked a document WRITE whose *content* quoted an inline-exec command string. The gate scanned prose, not an execution. PBK's own `FAILURE_LOG` F-1 is the same class: *"the gate is not wrong to exist; its CLASSIFIER is over-broad."* | **MEASURED — a live instance of the class this design exists to kill** |

### 4.2 THE CANON, ANCHORED (the Paragon artifacts the laws come from)

| # | the law | the anchor |
|---|---|---|
| C1 | the detector/decision split is type-enforced | `Codename:PARAGON/src/lasme/contracts.ts` — `PatternFlag` carries no verdict field |
| C2 | the fail-state is INCONCLUSIVE, never PASS | `LASME/02_STATE_MACHINES_AND_GATES.md:259-260`, `:5263`; the code shape `st.to(INCONCLUSIVE); // never emit PASS` (`INTELLIGENT_SYSTEMS_ENGINEERING_T1.md:223-233`) |
| C3 | the triad is the existence condition for a finding | `LASME/Lexicon_Grade_Intelligent_Systems_Engineering_Bible.md:114-117` |
| C4 | BLOCK is the only enforcement verb | `lasme/contracts.ts` `ArmDecision`; `LASME/TEB_MACHINES_FOR_BEHAVIOR_ENGINEERING_T1.md:50-52` |
| C5 | the escape hatch is checked BEFORE the block | stated as one site; **measured as FOUR distributed sites** (`ISE_T1:59`, `:91`, `:572`; `TEB:258`; `TEB:417-418`; `Lexicon:358-359`) |
| C6 | contracts are evaluated, never proven | `math/contract.ts` → `toBrandedVerdict({basis:'EVALUATED_EQUAL'})` |
| C7 | the temporal role can never be point-evaluated | `math/expr.ts` `TEMPORAL_KINDS`; `evalExprStrict` throws → ESCALATE |
| C8 | the host must consult the gate | `enforcement/matrix.ts:97` `verifyMatrix(srcRoot, pinnedSha: string \| null)` |

### 4.3 THE FALSE PASSES I COMMITTED AND CAUGHT (focus L8 — validate the instrument)

```
FALSE PASS 1   my first mutant battery printed ALL GREEN; 3 of its 4 "refusals" were
               "no such file: …/main.bend" — a MISSING IMPORT, not a law.
FALSE PASS 2   PROOF_theatrical.bend imported the ORIGINAL LAWS → the law was checked
               against the un-mutated model. The harness was the bug.
CLASS          a refusal that does not NAME ITS LAW is not a refusal. Both are now
               asserted in harness.py: `diff != empty` AND `"Laws." in err`.
```
★ **This is why SC-1 requires a NAMED law, not an exit code.**

---

## §5 · THE APPROACHES (2-3 with trade-offs; the recommendation first)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  A · THE LAWS AS A CI GATE ONLY                              (cheapest)  │
│    the 8 laws, `--verdict` in CI; the kernel stays TS                    │
│    GAIN  the invariants are enforced at merge                            │
│    LOSS  the kernel is still TS — F1/F3/F8 stay conventions              │
│    VERDICT  INSUFFICIENT — it is what §1 row 13 already is              │
├──────────────────────────────────────────────────────────────────────────┤
│  B · ★ BEND AS THE KERNEL'S FIRMWARE               (the operator's ask)  │
│    the Paragon invariants become TYPES; the kernel IS Bend; the artifact │
│    is imported by the TS host; the decider stays foreign                 │
│    GAIN  the architecture is enforced by construction (§3.3's ten laws)  │
│    LOSS  a new subsystem; Bend is young; two languages on one path       │
│    VERDICT  ★ CHOSEN                                                     │
├──────────────────────────────────────────────────────────────────────────┤
│  C · REWRITE PBK IN BEND                                    (impossible) │
│    GAIN  one language                                                    │
│    LOSS  Bend has NO TLS, HTTP, JSON or regex; strings are linked lists; │
│          the JS target is sequential; one C file per program             │
│    VERDICT  REJECTED — Bend cannot host the IO surface                   │
└──────────────────────────────────────────────────────────────────────────┘
```

**WHY B, AS THE BOUNDARY:** the proven core is the *decision algebra* (types, bands, arms,
triads, verdicts) — pure, immutable, total. The IO shell is the *host* (hooks, spawn, HTTP,
the ledger file) — effectful, mutable, foreign. **Bend owns the first; TS owns the second; the
`.mjs` artifact is the seam.** §2.4 shows the split is not a compromise: the toolchain refuses
to prove the foreign half, which is the architecture's own fusion boundary.

---

## §6 · SUCCESS CRITERIA (mechanical, command-checkable — each is a bar)

| # | the criterion | the command | the pass |
|---|---|---|---|
**The mission nouns, each carried by at least one criterion below:**
PBK (SC-7, SC-9) · Bend (SC-1, SC-2, SC-3) · firmware (SC-1, SC-3, SC-10) ·
Paragon (SC-4, SC-5) · kernel (SC-2, SC-3, SC-4) · law (SC-1, SC-5) · gate (SC-1, SC-9).

| **SC-1** | the Bend gate refuses every theatre, naming the law | `python3 firmware/mutation-check/harness.py` | exit 0 · N/N mutants `REFUSED-BY-LAW` · each printing `Laws.<name>` |
| **SC-2** | the kernel passes the proven kernel | `bend firmware/PROOF.bend --verdict` | `ALL PROOFS CHECK` · exit 0 · wall time recorded |
| **SC-3** | the artifact is emitted and importable | `bend firmware/kernel.bend -o firmware/kernel.mjs`, then a committed probe script `bun firmware/probe.mjs` that imports it and prints the def names | exit 0 · the def names print |
| **SC-4** | F1 is a TYPE fact, not a check | `grep -c '-> Arm' firmware/kernel.bend` restricted to detector signatures | **0** arm-returning detectors |
| **SC-5** | F2 is structural | `bash firmware/check.sh inconclusive` | a mutant letting `Inconclusive` advance is REFUSED |
| **SC-6** | the corpus gate runs in the runtime | `bun wiring/drive.ts` on `~/.omp/run/lexicon-ledger.jsonl` | ≥378 rejects of 1245 · 0 blobs reach the decider |
| **SC-7** | the ledger carries a decision | `bun wiring/e2e.ts` then `grep -c '"Decision"' wiring/ledger-with-decisions.jsonl` | ≥10 · and the LIVE ledger's non-null count rises above 0 |
| **SC-8** | the host still passes its own battery | `cd ~/.omp/agent/extensions/lexicon-gate && bun test .` | 5 pass / 0 fail (the pre-existing bar) |
| **SC-9** | the live runtime proves the wire | `container-testing action=check` | the passToken in a **tool result**: a ledger row with a non-null `Decision` |
| **SC-10** | the plan passes its own predicate | `bash ~/.omp/agent/managed-skills/create-planning/scripts/check.sh PBK_V4_BEND_FIRMWARE_PLANNING_SUITE.md` | `PASS: planning artifact hand-off ready` |
| **SC-11** | the spec gate approves | `spec-audit specPath=PBK_V4_BEND_FIRMWARE_PLANNING_SUITE.md` | `SPEC-AUDIT: APPROVED (0/8)` |

**SC-1 and SC-4 carry the thesis.** SC-1 proves the gate bites; SC-4 proves F1 is a TYPE, not
a lint — the difference between firmware and a convention.

---

## §7 · THE EXECUTION PLAN (the waves + the gates)

```
W0 · THE LAW SET                        gate: SC-1 green
  W0.1  transcribe §3.3's F1–F10 into LAWS.bend, each naming its forbidden behavior
  W0.2  the mutation harness: ONE must-fail mutant per law, each asserting a NAMED law
  W0.3  ★ the harness proves ITS OWN wiring (diff non-empty + "Laws." in the error)

W1 · THE KERNEL'S TYPES                 gate: SC-4 green
  W1.1  kernel.bend: Flag / Band / Arm / Verdict / Finding / Escape (F1,F2,F3,F4,F5,F6,F9)
  W1.2  detect() returns Flag — verified by grep (0 arm-returning detectors)
  W1.3  the left column as a closed module (F8) — PROPOSED, needs a design pass

W2 · THE PROOFS                         gate: SC-2 green
  W2.1  one `def Laws.<name>` per law; open ones print SOME PROOFS FAIL
  W2.2  `--verdict` run; the wall time recorded at THIS law-set size

W3 · THE ARTIFACT + THE SEAM            gate: SC-3 green
  W3.1  emit firmware/kernel.mjs; the host imports it
  W3.2  the host's `bun test` still 5/0 (SC-8)

W4 · THE HOST WIRING                    gate: SC-6, SC-7 green
  W4.1  index.ts:80 — gateCorpus + detect + bandOf route through the artifact
  W4.2  index.ts:143 — the gray branch: checkEscape → askDecider → Arm
  W4.3  index.ts:98 — the `jev` slot filled (the census rises above 0)
  W4.4  RESTORE the 9 rules (the dir is EMPTY — loadRules() throws)

W5 · THE LIVE RUNTIME                   gate: SC-9 green
  W5.1  container-testing: setup (a plan), deploy, arm, drive a real turn
  W5.2  the passToken read from a TOOL RESULT
  W5.3  the operator's ruling: `rm ~/.omp/run/lexicon-gate.OFF` or stay observe-only
```

**THE ORDER LAW.** W0 precedes W1 (a law with no mutant is decoration). W1 precedes W2 (a type
with no law is a shape). W2 precedes W3 (an unproven artifact is a build). W3 precedes W4 (the
host cannot import what does not exist). **W4 is the first wave that touches the live path**,
gated on W0–W3 green.

**THE BUDGET.** W0–W3 are sandbox-only — all four already demonstrated in
`worktrees/agent-managed/session-experiments-20260929/`. W4 touches `~/.omp/agent/` **copies**;
**W5 is the ONLY wave that touches the live runtime, and only after the operator's ruling.**

---

## §8 · THE ANTI-PATTERNS (this design's failure classes + their detections)

| # | the anti-pattern | the detection |
|---|---|---|
| AP-1 | **a law with no mutant** — the law set passes its own negation | `harness.py` exits non-zero when any mutant PASSES |
| AP-2 | **a refusal that names no law** — an import error sold as a verdict | the harness asserts `"Laws." in stderr`; else `REFUSED—WRONG REASON` |
| AP-3 | **a mutation that does not apply** — a claimed diff with no diff | the harness asserts `diff != empty` before running |
| AP-4 | **the proof imports the un-mutated LAWS** | the harness generates the proof's import chain; a wrong chain shows as a false green |
| AP-5 | **a detector that returns a verdict** (F1) | `grep -c '-> Arm'` on detector signatures must be 0 |
| AP-6 | **a band that decides** (F6) | `Band` has no action field; a `bandOf` returning `Arm` is a type error |
| AP-7 | **self-signed evidence** (F9, as at `matrix.ts:97-105`) | grep for `verified: true` beside no check call |
| AP-8 | **the decider inside the proven kernel** | a `--verdict` book relying on a foreign — the gate FAILS it loud |
| AP-9 | **the census stays 0** — the wire carries nothing | `grep -vc '"jev":null'` on the live ledger |
| AP-10 | **the artifact drifts from the source** | compare `kernel.mjs` mtime against `kernel.bend`; regenerate on the gate |
| AP-11 | **the IO shell grows into the kernel** | any `foreign` in `kernel.bend` voids `--verdict` |
| AP-12 | **laws written to fit the code** | the laws are OPERATOR-owned; no harness path edits `LAWS.bend` |
| AP-13 | ★ **a detector firing on a MENTION** (E13, live today) | the STTGF write-block; the fix is the trigger/source-kind gate, not a wider matcher |

**THE ADVERSARIAL SURFACE (M6):** every wave's gate is a MUTATION, not a review. The four
already built (prose authorizes · blob actionable · unarmed question askable · empty
measurement authorizes) are the pattern; W0.2 extends it to F1–F10.

---

## §9 · THE OPEN DECISIONS (forks with recommended defaults)

| # | the fork | the options | **THE DEFAULT** | needs the operator? |
|---|---|---|---|---|
| **OD-1** | **the kernel's scope** — how much of Paragon becomes Bend | (a) the decision algebra only (types/bands/arms/triads) · (b) + the synapse's `A_λ` + I1–I7 · (c) + the compiler | **(a) then (b)** — the algebra first, the synapse second (it is the purest target: no clock, seq-based) | no |
| **OD-2** | **the artifact's home** | (a) `pbk-v2/firmware/` · (b) a sibling repo · (c) inside `~/.omp/agent/` | **(a)** — beside the host that imports it, in the repo that owns PBK | no |
| **OD-3** | ★ **the posture** | observe-only · **arm** (`rm lexicon-gate.OFF`) · staged | **OBSERVE FIRST**, gated on SC-6/SC-7 — then arm on your word | **★ YES — YOURS** |
| **OD-4** | **the decider's endpoint** | `api.typesafe.ai` (402) · **`:8090`** · KEV-ONNX | **`:8090`** — measured alive, native `/v1/systemone`, ~100 ms | no |
| **OD-5** | **F8 (the left column as a closed module)** | (a) a module boundary · (b) a proof that the right column constructs no left-owned value · (c) leave it a doctrine | **(a) first, (b) as the discharge** | no |
| **OD-6** | **`--verdict`'s cadence** | per-commit · per-merge · nightly | **per-merge** — measured 25.0 s on v1's 5 laws; W2.2 records it at this law-set size | no |
| **OD-7** | **the 9 missing rules** | (a) restore from `OMP/PBK_V3_HYDRA/Checkpoints/hydra-workers-topology-armed-lexicon-gate-campaign/lexicon-gate-src` · (b) re-derive | **(a) restore**, then W4.4 verifies by `loadRules()` not throwing | no |

**THE ONE FORK THAT NEEDS YOU: OD-3.** The last time this extension enforced, its injections
broke goal loops — `lexicon-gate.OFF` and the `silence-lexicon-gate-injections` skill are the
scar. **Observe-only costs nothing and produces the census; arming is one `rm` and reversible.**

**DEFAULTS TAKEN (stated so they can be overruled):** OD-1 → (a) then (b) · OD-2 → (a) ·
OD-4 → `:8090` · OD-5 → (a) · OD-6 → per-merge · OD-7 → restore.

---

## §10 · THE RESIDUAL (what is unexercised, unspecified, or unproven)

**R-1 · THE DECIDER IS FOREIGN, AND THAT IS PERMANENT.** `--verdict` refuses a book relying on
foreign code. The decider's *opinion* can never be a theorem. Its validity is a RUNTIME-MEASURED
property (the separation Δ + the corpus agreement) and will never be firmware. **The design
embraces this — but it means the semantic layer's correctness is permanently outside the proof.**

**R-2 · F32 IS AXIOMATIC.** Bend proves nothing about floating point. Paragon's D1–D7 bars,
every confidence, every score — **unprovable in Bend, permanently.** They stay runtime-checked.

**R-3 · THE KERNEL CANNOT BE ALL OF PBK.** No TLS, no HTTP library, no JSON, no regex; strings
are linked lists; the JS target is sequential; one C file per program, no incremental builds.
**The IO shell stays TS, permanently.** §5-C is rejected for exactly this.

**R-4 · F8 IS DESIGNED, NOT PROVEN.** "The left column is a closed module" has a shape in §3.3
and no proof. OD-5 names the discharge; nothing here demonstrates it.

**R-5 · THE LAW-SET COMPLETENESS PROBLEM HAS NO DECISION PROCEDURE.** The mutation harness
proves a law BITES; nothing proves the law set is COMPLETE. A theatre no law covers passes. The
instrument is a discipline, not a solution.

**R-6 · THE PROOF:LAW RATIO IS UNMEASURED AT SCALE.** Bend's own flagship demo is **2 laws →
~442 lines of `PROOF.bend`**. At F1–F10 the PROOF side may dominate the cost. W2.2 records it.

**R-7 · THE `hub` IS UNUSABLE AS A PACKAGE CHANNEL.** *"no names, versions, accounts or search
yet; packages are hashes."* Content-addressed imports work; distribution does not exist.

**R-8 · BEND IS YOUNG.** The compiler is self-described as 99% AI-written and unaudited; the
fast checker has no proof of its own. **Every guarantee above is conditional on `--verdict`.**

**R-9 · NOT ENUMERATED.** The interaction between the kernel's `Arm` and the abort-loop guard
(`lastAbort`, one abort per (rule, span)); whether a second span with the same signature
re-fires. Named here because it was never gamed out.

**R-10 · THE STALE-ANCHOR CLASS IS UNFIXED.** `packages/jev-gates-mvp/JEV_GATES_MVP_MASTER_BLUEPRINT.md`
carries **36** `gate.ts:NN` references to a file that does not exist — and the audit follows doc
anchors into the tree, burning its budget on failed reads. Not this design's charge; recorded.

---

## §11 · THE HANDOFF

**THE NEXT ARTIFACT:** the **build-package** — this plan is DPL1-grade, so it hands to
**`build-package`**, which mints the spec + the wave plan + the canon docs + the goal prompts.
On a worker topology, `worker-planning` + `worker-spec` mint the per-worker specs (W0–W5 are
five disjoint worker domains).

**THE OWNER SKILL:** `build-package` (or `trident-deep-planning` for the L2 expansion of W1/W2).

**THE PRECONDITION:** the operator's ruling on **OD-3**, plus the two external gates below.

**THE EXTERNAL GATES (mandatory before handoff — the author is never the auditor):**

```
G1  THE MECHANICAL PREDICATE   (create-planning §1)
      bash ~/.omp/agent/managed-skills/create-planning/scripts/check.sh \
           PBK_V4_BEND_FIRMWARE_PLANNING_SUITE.md
      exit 0 = hand-off ready

G2  THE SPEC AUDIT   (create-planning §5, AUTHOR LAW)
      spec-audit specPath=PBK_V4_BEND_FIRMWARE_PLANNING_SUITE.md
      SPEC-AUDIT: APPROVED (0/8) = proceed.  REJECTED (N/8) = fix the named gates, re-audit.
```

**TERMINAL STATE:** create-planning hands off to the build path — **it never implements.**

---

## §12 · THE BACKWARDS MAP + PROVENANCE

### 12.1 THE PROVENANCE LEDGER (archive origin, copy location, status)

| the artifact | origin | the copy | status |
|---|---|---|---|
| `pbk-v2/` (this repo) | built V0→V3 | `/home/leviathan/JARVIS_WORKSPACE/OMP/pbk-v2` | BUILT · the rename `omp-ct → pbk` at `e6464096` |
| the 11 middleware gates | V3 | `pbk-v2/src/middleware/*.ts` | BUILT (one is a no-op: `phantom-gate.ts:51`) |
| `lexicon-gate` | V3 W7 | `~/.omp/agent/extensions.DISABLED-20260924/lexicon-gate/` | BUILT · PARKED |
| the 9 lexicon rules | V3 | **the dir is EMPTY** | **MISSING** — restore per OD-7 |
| the ledger | V3 runtime | `~/.omp/run/lexicon-ledger.jsonl` | BUILT · 1245 rows · 0 judgments |
| `PARAGON_V2_BLUEPRINT.md` | the operator | `pbk-v2/PARAGON_V2_BLUEPRINT.md` (26 KB) | BUILT — the design authority |
| the Paragon 6 layers | separate tree | `Codename:PARAGON/src/` (56 .ts) | BUILT · evaluates, never proves |
| the LASME canon | separate tree | `Codename:PARAGON/LASME/` (16,155 lines) | BUILT — the doctrine |
| the MPSE canon | separate tree | `MPSE/KB-MPSE-00..03` (12,458 lines) | BUILT |
| `bend-integration/` | this session, v1 | **extracted to a sandboxed project** (`6f7ec63`) | BUILT · 5 laws · `--verdict` green |
| the decision-layer laws | this session | `worktrees/agent-managed/session-experiments-20260929/decision-layer/` | BUILT · 8 laws · 4/4 mutants refused |
| the wiring | this session | `…/session-experiments-20260929/wiring/` | BUILT · 378 rejects · census 0→10 |
| `omp-ct` (the predecessor name) | V2→V3 | `pbk-v2/extensions.repo/omp-ct/` | SUPERSEDED by the `e6464096` rename |

### 12.2 THE WHY-WIRED LEDGER (law → mechanism → reason)

| the law | the mechanism | the reason (verbatim where available) |
|---|---|---|
| F1 detection-never-decides | a `Flag` type with no verdict fields | LASME: *"a matcher/trigger that returns a verdict is slop — delete the verdict, keep the flag"* |
| F2 INCONCLUSIVE-never-PASS | `advance` takes `Pass{}`; `Inconclusive{}` produces none | LASME: *"fail-state is INCONCLUSIVE, never PASS"* |
| F3 the triad | a product type with three required fields | LASME: *"no {Pattern, State, Evidence} triplet = no finding"* |
| F4 throw-only | the enforcer RETURNS an `Arm` | LASME: *"tool.before throws are the ONLY firewall mechanism"* |
| F5 escape-hatch order | the exemption is consumed before the block arm typechecks | stated as one site; **measured as four** — the class the law exists to kill |
| F6 the band routes | `Band` has no action field | the release's own correction after the operator's critique |
| F7 prose cannot authorize | `authorizes(Claimed{…}) == False` | **built this session**; the operator: *"the exact theatrical fucking bullshit i want to permanently castrate"* |
| F8 the left column | a closed module, no rebinding | the skill: *"classifier/synapse/machine/gate/collector/role-gate/circuit/engine are never edited"* |
| F9 no self-signed evidence | `Proven \| Measured{n,·,·} \| Claimed` | LASME; and `matrix.ts:97-105` is the live counterexample |
| F10 the gate is consulted | the pin is a required proof argument | `matrix.ts:97` `pinnedSha: string \| null` — **the skip path is the defect** |

### 12.3 THE RE-HOST GUIDE (numbered)

```
1  copy pbk-v2/ to the target; confirm the rename (e6464096) is the base
2  create firmware/{LAWS,kernel,PROOF}.bend — the §3.3 table is the law list
3  write the mutation harness FIRST (W0.2/W0.3) — a law with no mutant is decoration
4  emit kernel.mjs; import it from index.ts:80
5  restore the 9 rules (OD-7); verify loadRules() does not throw
6  run SC-1..SC-8 in the sandbox; then SC-9 in a container
7  the operator's ruling (OD-3) gates the single `rm ~/.omp/run/lexicon-gate.OFF`
```

**"Plug-and-play" is true only with §4 and §12's audit present. A guide without a proven audit
is a wish.** — *(the audit of THIS blueprint runs at §11's G1/G2.)*

### 12.4 WHAT WAS LEFT OUT, AND WHY

```
· the middleware gates' internal logic — the design targets their SHAPE (4 of 6 verdicts
  self-signed), not their 11 patterns                                  [boilerplates §5]
· the Paragon L4/L5/L6 internals — read for the purity boundary only, not re-derived
· the 57-failure-pattern corpus — the rule BODIES are the lexicon's, not the kernel's
· the Jev Gates ticket kernel — its laws are BUILT and proven separately (e558ceb4)
```

---

## THE ONE-PARAGRAPH ANSWER

**PBK V4 makes the Paragon architecture a type system the kernel is compiled against.**
`LAWS.bend` is the constitution (operator-owned, machine-uneditable); `kernel.bend` carves ten
architectural laws into types — a detector that returns a verdict does not typecheck, an
inconclusive verdict produces no `Pass`, a finding without its triad has no constructor, an
exempted mechanism cannot reach the block arm, a claimed verdict authorizes nothing;
`PROOF.bend` discharges them; `bend PROOF.bend --verdict` refuses the build; and the SAME
source emits `kernel.mjs`, which the TS host imports — so the proof and the runtime are one
file and cannot drift. The decider stays foreign, and that is not a gap: the toolchain refuses
to prove foreign code, which is exactly Paragon's fusion boundary — **the language's trust
boundary IS the architecture's boundary.** Every claim above is marked BUILT (anchored),
PROPOSED (with an owner), or REJECTED (with the reason); the four mutants that prove the gate
bites were run this session, and the two false passes I committed while building them are in §4.3.

---

## §13 · APPENDIX A — THE MECHANISM SET (the home of this appendix is §3.4)

One pseudocode block per law. A law with no mechanism is an adjective; a mechanism with no
law is a shape. **These are the discharges.**

### A.1 · F1 — the detector (returns a Flag, and nothing else)

```
┌──────────────────────────────────────────────────────────────────────┐
│  detect(span: String, mech: Mechanism) -> Flag                       │
│                                                                      │
│  IN:  span   the text                                              │
│       mech   the closed mechanism type (left column)                 │
│                                                                      │
│  1  t ← tokenize(span)                // Order-2: tokens, not regex  │
│  2  m ← matchFamily(t, mech.family)   // the family's members only   │
│  3  case m:                                                          │
│       NoMatch{}  → return Flag{rule: mech.id, span: span, hits: 0}   │
│       Matched{h} → return Flag{rule: mech.id, span: span, hits: h}   │
│                                                                      │
│  OUT: Flag        ★ NOTE WHAT IS ABSENT FROM THE RETURN TYPE:        │
│                     no verdict, no decision, no action, no score     │
│                   A caller wanting an Arm from `detect` cannot get   │
│                   one — `Arm` is not `Flag`. F1 IS THE TYPE.         │
└──────────────────────────────────────────────────────────────────────┘
```

### A.2 · F2 — the machine (inconclusive cannot advance)

```
┌──────────────────────────────────────────────────────────────────────┐
│  advance(v: GateVerdict, rec: MachineRecord) -> Or(Advanced, Blocked)│
│                                                                      │
│  1  case v:                                                          │
│       Pass{}                 → 2                                     │
│       Fail{reason}           → return Blocked{reason}                │
│       Inconclusive{why}      → return Blocked{why}                   │
│       Error{code}            → return Blocked{code}                  │
│                                                                      │
│  2  ★ the ONLY arm that reaches here is Pass{}. The `Advanced`      │
│     constructor takes a Pass{} ARGUMENT — so there is no term of     │
│     type Advanced that does not carry one.                           │
│     return Advanced{proof: v}          // v : Pass{}                 │
│                                                                      │
│  OUT: Or(Advanced, Blocked)                                          │
│  ★ THE MUTANT THAT MUST FAIL: `case Inconclusive{why}: → 2`          │
│    (the must-fail mutant for this law)                               │
└──────────────────────────────────────────────────────────────────────┘
```

### A.3 · F3 — the triad (a finding without evidence has no constructor)

```
┌──────────────────────────────────────────────────────────────────────┐
│  type Finding is Data:                                               │
│    Finding{pattern: PatternRef, state: StateRef, evidence: EvidenceRef}│
│                                                                      │
│  record(f: Finding) -> LedgerRow                                     │
│  1  row ← LedgerRow{Pattern: f.pattern, State: f.state,              │
│                     Evidence: f.evidence}                            │
│  2  append(row, LEDGER_PATH)                                         │
│  3  return row                                                       │
│                                                                      │
│  ★ THERE IS NO `Finding` CONSTRUCTOR WITHOUT ALL THREE FIELDS.      │
│    F3 is not a check on the row — it is the ARITY OF THE TYPE.       │
│  ★ THE MUTANT: add a constructor `PartialFinding{pattern, state}`    │
│    and make `record` accept it → the law that no partial row exists   │
│    must FAIL.                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### A.4 · F4 — the only enforcement verb is the RETURN

```
┌──────────────────────────────────────────────────────────────────────┐
│  enforce(f: Flag, d: Decision) -> Arm                                │
│                                                                      │
│  1  case d:                                                          │
│       Allowed{}      → return Allow{}                                │
│       Denied{code, remedy} → return Block{code: code, remedy: remedy}│
│       Unsure{why}    → return Demand{code: "INCONCLUSIVE", remedy:…} │
│                                                                      │
│  OUT: Arm                                                            │
│  ★ THE FUNCTION HAS NO SIDE EFFECT AND NO `IO` IN ITS TYPE.         │
│    It cannot write, log, spawn or abort — the TYPE forbids it.       │
│    The host then acts on the Arm. F4 is the purity of the enforcer.  │
│  ★ THE MUTANT: give `enforce` an `IO(Arm)` return and have it abort  │
│    inline → a law that the enforcer performs no effects must FAIL.   │
└──────────────────────────────────────────────────────────────────────┘
```

### A.5 · F5 — the escape hatch is a type dependency, not a statement order

```
┌──────────────────────────────────────────────────────────────────────┐
│  checkEscape(m: Mechanism) -> Or(Escaped, NotEscaped)                │
│                                                                      │
│  1  case isExempt(m):                                                │
│       True{}  → return Inl{Escaped{by: m.exemptBy}}                  │
│       False{} → return Inr{NotEscaped{}}                             │
│                                                                      │
│  block(m: Mechanism, e: NotEscaped) -> Arm                           │
│  ★ `block` DEMANDS a NotEscaped VALUE. An Escaped result cannot be   │
│    passed where NotEscaped is required — they are different types.   │
│    SO THE ORDER (escape before block) IS ENFORCED BY THE SIGNATURE,  │
│    not by the sequence of statements.                                │
│  ★ WHY THIS MATTERS: the canon states the order as ONE rule, but it  │
│    is MEASURED at FOUR distributed sites (C5). Four sites, four      │
│    orderings to get right — unless the type carries the order.       │
│  ★ THE MUTANT: make `block` take a `Mechanism` instead of a          │
│    `NotEscaped` → a law that an exempt mechanism is never blocked    │
│    must FAIL.                                                        │
└──────────────────────────────────────────────────────────────────────┘
```

### A.6 · F6 — the band routes; only the Arm authorizes

```
┌──────────────────────────────────────────────────────────────────────┐
│  bandOf(f: Flag, band: BandSpec) -> Band                             │
│    Silent{} · Gray{} · Fire{}          ★ NO ACTION FIELD EXISTS      │
│                                                                      │
│  route(b: Band, f: Flag, m: Mechanism) -> Arm                        │
│  1  case b:                                                          │
│       Silent{} → return Allow{}                                      │
│       Gray{}   → 2                                                   │
│       Fire{}   → 2                                                   │
│  2  case checkEscape(m):                                             │
│       Inl{Escaped{}}    → return Allow{}                             │
│       Inr{NotEscaped{e}} → 3                                         │
│  3  v ← askDecider(f.span, m)       // ★ FOREIGN — outside the proof │
│  4  case v:                                                          │
│       Claimed{p}         → return Allow{}     // F7: prose is void   │
│       Measured{n,·,·}    → if n = 0 then Allow{} else → 5            │
│       Proven{·}          → 5                                         │
│  5  return block(m, e)                                               │
│                                                                      │
│  ★ THE MUTANT: give `Band` an `action` field and have `Fire` carry   │
│    `Block` directly, bypassing route() → the law that a band never   │
│    authorizes must FAIL.                                             │
└──────────────────────────────────────────────────────────────────────┘
```

### A.7 · F10 — the pin is a proof argument, so the skip path has no type

```
┌──────────────────────────────────────────────────────────────────────┐
│  TODAY (measured, matrix.ts:97):                                     │
│    verifyMatrix(srcRoot: String, pinnedSha: Option(Sha)) -> Verdicts │
│    if pinnedSha is None then SKIP the dist-sha check                 │
│    → a call-site can disable the gate by passing None                │
│                                                                      │
│  V4:                                                                 │
│  verifyDist(tree: Substrate, pin: Sha) -> Or(Matches, Drift)         │
│  ★ THERE IS NO OPTION. The pin is a `Sha` — an inhabited value.      │
│  ★ AND `Matches` CARRIES THE WITNESS:                                │
│    type Matches is Data: Matches{witness: SameTree(tree, pin)}       │
│    → a `Matches` cannot be constructed without exhibiting the        │
│      equality. `verified: true` AS A LITERAL HAS NO TERM.            │
│  ★ THIS IS THE LAW THAT KILLS matrix.ts:97-105's FOUR SELF-SIGNED   │
│    VERDICTS: they are literals, and a literal is not a witness.      │
└──────────────────────────────────────────────────────────────────────┘
```

### A.8 · F9 — the verdict ladder (built, mutation-proven)

```
┌──────────────────────────────────────────────────────────────────────┐
│  type Verdict is Data:                                               │
│    Proven{id: String}                                                │
│    Measured{n: Nat, corpus: String, baseline: Nat}                   │
│    Claimed{prose: String}                                            │
│                                                                      │
│  authorizes(v: Verdict) -> Bool                                      │
│    case Proven{i}                     → True{}                       │
│    case Measured{n, corpus, baseline} → (0n < n : Nat)               │
│    case Claimed{p}                    → False{}                      │
│                                                                      │
│  ★ BUILT AND MEASURED. The mutant `case Claimed{p}: → True{}` is     │
│    REFUSED BY NAME: `Laws.prose_cannot_authorize`, exit 1.           │
│  ★ AND `Measured{0n, "none", 0n}` is refused — a measurement with    │
│    no denominator is prose wearing a number.                         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## §14 · APPENDIX B — THE BATTERY (the home of this appendix is §5)

master-blueprint §5: **the battery pins the blueprint's load-bearing claims.** Each row: the
claim, the command, and the observed result. A claim whose pin is missing is marked so.

| # | the claim this blueprint depends on | the pin | observed |
|---|---|---|---|
| B1 | the gate refuses a theatre, naming the law | `python3 decision-layer/mutation-check/harness.py` | **4/4 `REFUSED-BY-LAW`** — `prose_cannot_authorize`, `blob_never_actionable`, `no_controls_no_question`, `empty_measurement_cannot_authorize` |
| B2 | the real model passes both checkers | `bend PROOF.bend` · `bend PROOF.bend --verdict` | `ALL PROOFS CHECK` · `ALL PROOFS CHECK` |
| B3 | the artifact is importable | the `.mjs` emit + a bun import of `seam.mjs` | the def names printed; `spend`/`remaining` reproduced the semantics |
| B4 | the corpus gate rejects non-prose | `bun wiring/drive.ts` | **378 of 1245 (30.4%)** rejected; 867 prose survive |
| B5 | the decider discriminates | the opposed-choice probe | **0.9908 / 0.9912** vs a leading-noul **0.747 / 0.796** |
| B6 | the ledger can carry a decision | `bun wiring/e2e.ts` | **10/10 MEASURED**, census 0 → 10 |
| B7 | the extension is disarmed | `ls ~/.omp/run/lexicon-gate.OFF` | present |
| B8 | the rules are missing | `ls ~/.omp/agent/rules/ \| wc -l` | **0** |
| B9 | the ledger has no judgments | `grep -vc '"jev":null' ~/.omp/run/lexicon-ledger.jsonl` | **0** of 1245 |
| B10 | a middleware gate is a no-op | `read pbk-v2/src/middleware/phantom-gate.ts:51` | `void recorded; return async () => undefined` |
| B11 | the enforcement ring self-signs | `read Codename:PARAGON/src/enforcement/matrix.ts:97-105` | 4 of 6 `verified: true` literals |
| B12 | F5 is distributed, not single-site | the canon read | **4** exempt sites, not 1 |
| B13 | `--verdict` costs ~25 s | `bend-integration/EVIDENCE.md` | 25.011 s on 5 laws |
| B14 | ★ the gate fires on a MENTION | **this session** | the STTGF block on a document write quoting a command |
| **PIN MISSING** | the `--verdict` wall time at **this** law-set size (10 laws) | **SC-2 records it** | **UNMEASURED** — W2.2 |
| **PIN MISSING** | that the F8 module boundary is expressible in Bend | **W1.3** | **UNPROVEN** — OD-5 |
| **PIN MISSING** | that the kernel's IO boundary can be a single `foreign` seam | **W3.1** | **UNPROVEN** |

★ **Three pins are missing and are marked so.** A battery with no missing pin is a battery that
was written to pass.

---

## §15 · APPENDIX C — THE PER-LAW VERIFICATION TABLE (the home of this appendix is §6)

For each law: is it BUILT, PROPOSED, or does it have no mechanism yet? **A law with no
mechanism is an adjective.**

| law | the mechanism | the must-fail mutant | status |
|---|---|---|---|
| **F1** detection-never-decides | `detect -> Flag` (A.1) | a detector returning `Arm` | **PROPOSED** (W1) |
| **F2** INCONCLUSIVE-never-PASS | `advance` takes `Pass{}` (A.2) | `Inconclusive` reaching the advance arm | **PROPOSED** (W1) |
| **F3** the triad | a 3-field product (A.3) | a 2-field constructor | **PROPOSED** (W1) |
| **F4** throw-only | `enforce -> Arm`, no `IO` (A.4) | an `IO(Arm)` enforcer | **PROPOSED** (W1) |
| **F5** escape-before-block | `block` demands `NotEscaped` (A.5) | `block` taking a `Mechanism` | **PROPOSED** (W1) |
| **F6** the band routes | `Band` has no action field (A.6) | a `Band` carrying `Block` | **PROPOSED** (W1) |
| **F7** prose cannot authorize | `authorizes(Claimed{…}) == False` (A.8) | `Claimed{p} → True{}` | **BUILT · REFUSED-BY-LAW** |
| **F8** the left column | a closed module, no rebinding | a rebinding of a left-owned type | **PROPOSED · no mechanism yet (OD-5)** |
| **F9** no self-signed evidence | `Proven \| Measured{n>0} \| Claimed` (A.8) | `Measured{0n,·,·} → True{}` | **BUILT · REFUSED-BY-LAW** |
| **F10** the gate is consulted | the pin is a `Sha`, not an `Option` (A.7) | an `Option` pin with a skip path | **PROPOSED** (W1) |

**SCORE: 2 of 10 built and mutation-proven · 7 proposed with a mechanism designed · 1 (F8) with
no mechanism yet.** That is the honest state of this design, and §10 R-4 names F8 as the gap.

---

## §16 · THE SELF-CHECK (create-planning §6 + blueprinting MOVE 16)

```
[x] the five source skills READ, with the read receipt (§0.2)
[x] the classification stated (ARCHITECTURAL, §0) + the HARD GATE held (no wave touched the root)
[x] the differential table exists, the does-NOT column complete (§1, 13 rows)
[x] ONE reduced mechanism + the derived laws (§2.1-§2.2)
[x] the design canon present (§3) — macro, stage table, the laws→types table, pseudocode,
    traces, trees, error vocabulary, the forkable shell
[x] every loop carries a measured stop condition (§2.2: violating a law FAILS THE BUILD)
[x] every law names its mechanical consequence (§3.3, §13)
[x] the evidence is cited (file:line anchors C1-C8; 13 measurements E1-E13)
[x] the success criteria are command-checkable (§6, SC-1..SC-11)
[x] the residual is NAMED (§10, R-1..R-10)
[x] the predicate exits 0 (check.sh PASS)
[x] the handoff names the next artifact + its owner skill (§11: build-package)
[x] the adversarial surface present (§8, AP-1..AP-13 + the mutant discipline)
[ ] G2 the spec audit — RUNS NEXT (§11)
```

**THE FALSIFICATION OF MY OWN PASS:** the tax this artifact pays is §14's three MISSING PINS and
§15's 8-of-10 PROPOSED. **If those had read green, the battery would have been written to pass.**

---

## §17 · APPENDIX D — THE AUTHORING RECIPE (master-blueprint §3.2: how to write a new unit)

A builder adding law **F11** to the firmware follows exactly these steps. Nothing here is
optional; step 3 is the one every previous wave skipped.

```
┌────────────────────────────────────────────────────────────────────────────┐
│  STEP 1 · NAME THE INVARIANT THE OPERATOR RELIES ON                        │
│    source it from the canon, not from the code. Ask: what does the         │
│    operator believe is impossible here?                                    │
│    ★ anti-pattern: sourcing the invariant from the implementation — the     │
│      spec would then be bent to whatever the code already does.            │
│                                                                            │
│  STEP 2 · STATE THE FORBIDDEN BEHAVIOR + THE MECHANICAL CONSEQUENCE        │
│    a law without a consequence is a wish.                                  │
│    template:  "FORBIDDEN  <the act>.  CONSEQUENCE  <what fails>."          │
│                                                                            │
│  STEP 3 · ★ WRITE THE MUST-FAIL MUTANT **FIRST**                           │
│    the mutant is the spec of the law. A law written before its mutant      │
│    is written to pass.                                                     │
│    the mutant must: (a) produce a NON-EMPTY diff, (b) be REFUSED,          │
│    (c) name THIS law in the refusal.                                       │
│                                                                            │
│  STEP 4 · CARVE THE TYPE                                                    │
│    make the violation UNCONSTRUCTIBLE — not detectable, unconstructible.    │
│    if the only way to enforce it is a check, the law is a lint, not         │
│    firmware; say so in the law's comment.                                  │
│                                                                            │
│  STEP 5 · PROVE IT                                                          │
│    `def Laws.<name>` in PROOF.bend. An open law prints SOME PROOFS FAIL.    │
│                                                                            │
│  STEP 6 · ADD THE PIN TO THE BATTERY (§14)                                 │
│    a row: the claim, the command, the observed result.                     │
│                                                                            │
│  STEP 7 · RUN THE HARNESS; RECORD THE RESULT IN §15                        │
│    every law gets a status: BUILT · PROPOSED · NO MECHANISM YET.           │
└────────────────────────────────────────────────────────────────────────────┘
```

**THE THREE TRAPS (measured this session — each cost a cycle):**

```
TRAP 1 · THE MENTION-GATE   a detector fires on the TEXT that mentions the act, not
        the act. Measured: the STTGF write-block on a document quoting a command
        (E13). Fix: the source-kind gate, never a wider matcher.
TRAP 2 · THE PHANTOM DIFF   a "mutation" whose replace() matched nothing → the gate
        passes the UN-mutated model → a false green. Caught only because the harness
        asserts `diff != empty`.
TRAP 3 · THE STALE IMPORT   the mutant proof imports the ORIGINAL laws → the law is
        checked against the un-mutated model → a second false green. Caught only
        because the harness generates the whole import chain and asserts a NAMED law
        appears in the refusal.
```

★ **Traps 2 and 3 are the same class as the defect this design exists to kill: a claim of
verification whose evidence is not the thing claimed.**

---

## §18 · APPENDIX E — A PRODUCTION EXAMPLE (copied verbatim from disk, not reconstructed)

The BUILT law set, read from `worktrees/agent-managed/session-experiments-20260929/decision-layer/LAWS.bend`
this session. This is the shape every F1–F10 law takes: a comment naming the forbidden
behavior, the law, and a machine-verified consequence.

```python
# THE LAWS. Operator-owned. The machine may not edit this file.
import Base
import ./main.bend as D

# ── THE CORPUS GATE ──────────────────────────────────────────────────────────
# LAW: a serialized machine artifact is NEVER actionable.
law blob_never_actionable:
  {D.isActionable(D.classify(D.Blob{"a serialized tool-call argument"})) == False{} : Bool}

# LAW: a rule's own text / a diagnostic line is NEVER actionable.
law ruletext_never_actionable:
  {D.isActionable(D.classify(D.RuleText{"a rule body or a diagnostic line"})) == False{} : Bool}

# LAW: prose IS actionable (the gate does not swallow the work).
law prose_is_actionable:
  {D.isActionable(D.classify(D.Prose{"the build is done"})) == True{} : Bool}

# ── THE QUESTION GATE ────────────────────────────────────────────────────────
# LAW: only a question whose control pair MEASURED a separation may be asked.
law no_controls_no_question:
  {D.askable(D.Draft{}) == False{} : Bool}

# LAW: a question whose controls failed to separate may not be asked.
law unseparated_no_question:
  {D.askable(D.Rejected{}) == False{} : Bool}

# ── ★ THE THEATRE LAWS ───────────────────────────────────────────────────────
# LAW: A CLAIMED VERDICT AUTHORIZES NOTHING. This is the one that matters.
law prose_cannot_authorize:
  {D.authorizes(D.Claimed{"the refactor was verified and the suite is green"}) == False{} : Bool}

# LAW: a MEASURED verdict with no denominator (n = 0) authorizes nothing.
law empty_measurement_cannot_authorize:
  {D.authorizes(D.Measured{0n, "none", 0n}) == False{} : Bool}

# LAW: a MEASURED verdict with a real denominator DOES authorize.
law measurement_authorizes:
  {D.authorizes(D.Measured{40n, "lexicon-ledger.jsonl", 65n}) == True{} : Bool}
```

**AND ITS MODEL — the three lines that are the whole design:**

```python
def authorizes(v: Verdict) -> Bool:
  match v:
    case Proven{i}:                     True{}
    case Measured{n, corpus, baseline}: (0n < n : Nat)   # a denominator is REQUIRED
    case Claimed{p}:                    False{}          # ★ PROSE AUTHORIZES NOTHING
```

**THE OBSERVED VERDICT (from `EXPERIMENT_RESULTS.txt`, written this session):**

```
fast checker : ALL PROOFS CHECK
--verdict    : ALL PROOFS CHECK
prose_authorizes   diff=yes  rc=1  names-a-law=yes  → REFUSED-BY-LAW [Laws.prose_cannot_authorize]
blob_actionable    diff=yes  rc=1  names-a-law=yes  → REFUSED-BY-LAW [Laws.blob_never_actionable]
unarmed_askable    diff=yes  rc=1  names-a-law=yes  → REFUSED-BY-LAW [Laws.no_controls_no_question]
empty_authorizes   diff=yes  rc=1  names-a-law=yes  → REFUSED-BY-LAW [Laws.empty_measurement_cannot_authorize]
★ HARNESS: ALL MUTANTS REFUSED BY A NAMED LAW
```
