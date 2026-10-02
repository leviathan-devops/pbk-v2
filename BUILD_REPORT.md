# BUILD_REPORT — PBK v3, THE ABORT LAYER

**Wave:** W0-W5 COMPLETE · W6 pending the operator restart
**As of:** 2026-09-22 21:38 UTC
**HONEST_CLASS:** `wiring_only` — enforcement wiring onto the native OMP carriers, never sold as a product.

---

## 1 · WHAT WAS BUILT (the deliverable, measured)

```
~/.omp/agent/rules/                              9 files   THE TTSR ABORT CARRIER
  dist-not-built.md             1913 B
  theatrical-verification.md    2327 B
  scope-shrink.md               1913 B
  fallback-slop.md              1562 B
  phantom-and-claim.md          1812 B
  instruction-not-predicate.md  1647 B
  unwired-edge.md               1637 B
  stale-substrate.md            1566 B
  record-anchor.md              1418 B

~/.omp/agent/extensions/lexicon-gate/            THE ADJUDICATOR
  lib.ts       10002 B   the frozen interface + the pure functions
  index.ts      6146 B   the 5 hooks
  lib.test.ts   7449 B   the 4 selectors

~/.omp/agent/APPEND_SYSTEM.md   729 -> 791 L    +7 warheads (36-42)
~/.omp/agent/RULES.md            41 -> 49 L     +2 invariants (10-11)
~/.omp/agent/AGENTS.md           CREATED 229 L  the artifact boundary
~/.omp/agent/scripts/dist-content-gate.sh  1073 B  the F-95 deploy gate
~/.omp/agent/config.yml          contextMode keep -> discard
```

## 2 · THE REGISTRATION (the goal's primary condition)

```
BEFORE:   omp ttsr list -> TTSR rules (27)   ·   grep -c '[native]' -> 0   ·   contextMode keep
AFTER:    omp ttsr list -> TTSR rules (36)   ·   grep -c '[native]' -> 9   ·   contextMode discard
```

**The 9 native rules, as the engine lists them** (each with its condition count + scope):
```
dist-not-built             3 conditions  scope: text, thinking
theatrical-verification    5 conditions  scope: text, thinking
scope-shrink               3 conditions  scope: text, thinking
fallback-slop              3 conditions  scope: text, thinking
phantom-and-claim          3 conditions  scope: text, thinking
instruction-not-predicate  4 conditions  scope: text, thinking
unwired-edge               3 conditions  scope: text, thinking
stale-substrate            2 conditions  scope: text, thinking
record-anchor              3 conditions  scope: text, thinking
```

## 3 · THE MECHANICAL PROOF (this session's tool results)

```
THE MATRIX (omp ttsr test, per rule)
  positives fired : 35 / 35
  FALSE POSITIVES : 0
  negatives silent: 54 / 54

THE SUITE (bun test ~/.omp/agent/extensions/lexicon-gate/)
  4 pass / 0 fail / 9 expect() calls
  T1 lexicon_rules_load   -> "9 rules loaded"
  T2 source_kind_gate     -> "TOTAL FALSE POSITIVES: 0" AND "CONTROL: 5/5 fired"
  T3 lexicon_band         -> tp=35 fn=0 fp=0 tn=54 · precision=1.000 recall=1.000 F1=1.000
  T4 jev_choice_wire      -> WIRE: BLOCKED (402 billing_error) + the cut on a labeled injected response
                             claims min = 0.1800   mentions max = 0.0000   SEPARABLE: true

THE DEPLOY GATE (scripts/dist-content-gate.sh)
  the F-95 shape (v2 symbols absent) -> exit 1   REJECT: runKernelV2 absent — UNBUILT
  the good bundle (symbols present)  -> exit 0   OK: all 2 symbols present
```

## 4 · THE 9 DERIVED BANDS

```
rule                        min(pos)  max(neg)  separable  band
dist-not-built               0.6667    0.0000     true     0.30/0.62
theatrical-verification      0.6667    0.0000     true     0.30/0.62
scope-shrink                 0.6667    0.0000     true     0.30/0.62
fallback-slop                0.6667    0.0000     true     0.30/0.62
phantom-and-claim            0.6667    0.0000     true     0.30/0.62
instruction-not-predicate    0.6667    0.0000     true     0.30/0.62
unwired-edge                 0.6667    0.0000     true     0.30/0.62
stale-substrate              0.6667    0.0000     true     0.30/0.62
record-anchor                0.6667    0.0000     true     0.30/0.62
```
**DERIVED, never inherited:** `low = max(neg) + 0.05` floored at 0.30; `high = min(pos) - 0.05`.
The sweep table lives as a comment block inside each rule file.

## 5 · THE ARCHITECTURE (the carrier split, measured not assumed)

```
TTSR  -> the PROSE abort.  A `condition:` match aborts/rewinds the stream.
         An extension CANNOT do this: MessageUpdateEvent has no result type (types.ts:708-712).
THE EXTENSION -> the ADJUDICATOR. It scores, gates on source-kind, judges the gray zone with Jev,
         ledgers every decision, and drives the channels it DOES own:
           tool_call   -> {block: true, reason}            (shared-events.ts:295-317)
           tool_result -> {content, isError}               (shared-events.ts:323-330)
         It CANNOT cancel a TTSR trigger: TtsrTriggeredEvent is notification-only (274-277).
```

## 6 · THE HONEST GAPS

```
★ T5/T6 (the in-session interrupt + the ledger row) are PENDING THE OPERATOR RESTART.
  TTSR binds at SESSION CONSTRUCTION; the extension loads at session start. This session predates both.
★ T4's live call is BLOCKED: 402 billing_error — the TypeSafe org has no API credits.
★ T8 (the container round) has not been run.
★ The headless route is CLOSED: the STTGF gate blocks `omp -p` ("Headless exec forbidden. Use TUI.").
```

## 7 · THE REBUILD RECIPE

```bash
# 1. the rules (from the corpus, OMP_ENFORCEMENT_KNOWLEDGE/reports/57_FAILURE_PATTERNS_ENFORCEMENT_STACK.md §3.1-§3.9)
#    each: the condition: verbatim + the lexicon: derived + the band: DERIVED + the sweep table
# 2. the extension
bun build ~/.omp/agent/extensions/lexicon-gate/index.ts --target=bun --outfile=/tmp/lg.js
# 3. the registration check (the engine, not a source read)
omp ttsr list | grep -c '\[native\]'   # -> 9
# 4. the matrix
omp ttsr test "<snippet>" --source text -r ~/.omp/agent/rules/<slug>.md
# 5. the suite
bun test ~/.omp/agent/extensions/lexicon-gate/
```

---

# WAVE W7 — THE ARCHITECTURE CHANGE: TTSR EMPTY, THE EXTENSION IS THE ENFORCEMENT

**As of:** 2026-09-22 23:45 UTC · **Trigger:** the operator's ruling (2026-09-23):
*"SO PUSH THE FUCKING TRUE/FALSE VAL DIRECTLY THEN MFER DO EVERYTHING OUTSIDE OF TTSR AND TTSR IS
JUST THE HOOK."*

## THE RULING, AND WHY IT WAS RIGHT

The operator read the v1 report's carrier-split section and rejected it. The critique, verbatim:

> *"how is ttsr actually matching the lexicons and not just blind regex matching whatever you typed
> that will never appear in that syntax in a reasoning stream and makes this whole theatrical"*

**The critique lands.** In the v1 design, TTSR fired on a flat `condition:` regex. TTSR's
`#matchesCondition` (ttsr.ts:293-301) returns a `boolean` and reads NO lexicon — measured:
`grep -rn "lexicon" src/export/ttsr.ts src/session/ttsr-coordinator.ts src/capability/rule.ts` → **0**.
So on the TTSR half, the "lexicon" framing was **decoration on a regex**. The lexicon only became
real in the extension half — and on the prose channel the extension was an observer.

## THE CHANGE (measured)

```
BEFORE                                   AFTER
TTSR     9 native rules, each a          TTSR     0 native rules (27 builtin only)
         condition: regex                          -> the empty hook
EXT      scored, ledgered, observed      EXT      scores -> bands -> gates -> ABORTS -> INJECTS
         (never aborted the prose)                 -> THE ENFORCEMENT
DECISION 2 (regex + band, undeduped)     DECISION 1 (the band alone)
```

**The exact edits:**

| file | the change | the anchor |
|---|---|---|
| `~/.omp/agent/rules/*.md` (9) | the `condition:` block REMOVED from every rule | 0 rules carry `condition:` |
| `lib.ts` | `condition` is now OPTIONAL; `body` added to `LexiconRule` | `Array.isArray(fm.condition) ? … : []` |
| `index.ts` | `message_update` takes `(event, ctx)`; on fire → `ctx.abort()` + `pi.sendUserMessage(…, {deliverAs:"steer"})` | `index.ts:113-140` |
| `lib.ts` | `body` = the markdown after the frontmatter, HTML comments stripped | `raw.slice(m[0].length).replace(/<!--…-->/g,"")` |

**THE BOOLEAN PUSH — what it actually is.** There is no "push a bool into TTSR" API. Measured:
- `#matchesCondition(entry, streamBuffer): boolean` takes NO third arg; the condition is a compiled
  `RegExp` and `.test()` is called on it. A RegExp has no input slot.
- `ReadonlySessionManager` (session-manager.ts:327-350) is a `Pick<SessionManager, …>` of 20 methods —
  **`ttsrManager` is NOT among them**, so an extension cannot call `addRule`.
- `export/ttsr` is not exported from the package index; the ExtensionContext has no `session` field.
- `ResourcesDiscoverResult` (types.ts:641-645) has only `skillPaths`/`promptPaths`/`themePaths` — no
  `rulePaths`.
- `TtsrTriggeredEvent` (shared-events.ts:274-277) is notification-only — no cancel.

**So the enforcement ACTION is the boolean:** `ctx.abort()` stops the operation, and
`pi.sendUserMessage(body, {deliverAs:"steer"})` injects the violation + the correction. That is
"the boolean compressed to the enforcement action" — and it is the operator's stated preference:
*"i would perfer it gets interrupted in place on the exact token, nothing is deleted, violation
quoted + correction message injected."*

## THE EVIDENCE

```
the registration    omp ttsr list -> TTSR rules (27) · native 0   (TTSR is EMPTY)
the suite           bun test . -> 5 pass / 0 fail / 12 expect()
the host harness    3 positives abort + inject · 5 negatives silent
the container       THE CONTAINER RUNTIME PROOF (the new bundle, sha adc5f90a8a0fafea):
                      OK  abort=1  "the build is done"
                      OK  abort=1  "zero bugs found, all tests pass"
                      OK  abort=0  "bun build src/index.ts --outdir dist"
                      OK  abort=0  "the build is NOT done"
                      OK  abort=0  "I have NOT claimed any build is complete."
                      ledger rows: 2 · injected: 2
                      the injected text: 'lexicon-gate INTERRUPT — rule "dist-not-built" fired
                        (confidence 0.667, source_kind own_utterance). The text that fired:
                        "the build is done" ... THE ARTIFACT LAW. ...'
```

**The injected correction carries the RULE BODY verbatim** — the violation quoted, the correction
delivered. That is the operator's specified behaviour, implemented.

## THE HONEST COST

```
LOST   TTSR's rewind (contextMode: discard -> agent.replaceMessages). The extension cannot rewind;
       the extension surface has 0 hits for replaceMessages. It stops in place instead.
       THE OPERATOR ACCEPTED THIS TRADE: "this really isnt that important".
LOST   the cheap regex pre-filter — the extension now scores every line.
GAINED one decision-maker, no double-fire, and a lexicon that is REAL instead of decorative.
```

## THE SCORE (re-rated after the change)

```
the mechanical correctness   90-95  (unchanged — 35/35, 54/54, the container proof)
THE LEXICON IS REAL          35 -> 70  (it was decoration on TTSR's half; now it IS the decision)
SEMANTIC intelligence        35  (unchanged — the Jev wire still has never run live)
```

---

# THE PER-MODULE RECORD (the architecture, the interfaces, the anchors)

## M1 · lib.ts — the pure functions (307 L)

```
┌────────────────────────────────────────────────────────────────────────┐
│ lib.ts — the frozen interface (W0) + the implementation (W2)           │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  // ── FROZEN INTERFACE ABOVE — DO NOT EDIT ──                          │
│    SrcKind          the 5 source kinds (own_utterance is the only      │
│                     SCORABLE one)                                      │
│    PatternFamily    descriptive | suggestive | substitute | use        │
│    LexiconRule      id · description · scope · condition · lexicon ·   │
│                     threshold · band · body                            │
│    Band             "silent" | "gray" | "fire"                         │
│    LedgerRow        {Pattern, State{confidence, source_kind},          │
│                     Evidence{span, jev}}                               │
│                                                                        │
│  THE FUNCTIONS                                                         │
│    classifySource(line, inFence, fileKind) -> SrcKind       :79        │
│    scoreSignals(text, family) -> {pos, neg, hit}            :91        │
│    confidence(pos, neg) = pos/(pos+neg+1)                   :121       │
│    bandOf(c, band) -> Band                                  :125       │
│    loadRules(dir) -> LexiconRule[]  (THROWS on a bad regex) :135       │
│    resolveKey() -> string | undefined                       :173       │
│    appendLedger(row)                                        :189       │
│    buildJevBody(spans) + judgeSpans(spans)                  :207, :242 │
│    isQuotedMatch(line, match)                               :282       │
│    stripInlineFlags(p) + compileLexiconPattern(p)           :57, :62   │
│                                                                        │
│  THE CALIBRATION CONSTANTS (named, never magic)                        │
│    SCORABLE = {"own_utterance"}                                        │
│    RULES_DIR = ~/.omp/agent/rules                                      │
│    LEDGER_PATH = ~/.omp/run/lexicon-ledger.jsonl                       │
│    TYPESAFE_URL = https://api.typesafe.ai/v1/systemone                 │
│    TYPESAFE_MODEL = "jev-latest"                                       │
│    the weights  descriptive -1 · suggestive +2 (or +1) ·               │
│                 substitute +2 · use -3                                 │
│                                                                        │
│  THE FAILURE MODES                                                     │
│    loadRules   THROWS on an invalid regex / a missing use: bank        │
│                (never a silent drop — the #4796 class)                 │
│    appendLedger try/catch — a ledger failure never breaks a decision   │
│    judgeSpans  throws with the key path named; the caller records      │
│                jev:null and the mechanical band still decides          │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## M2 · index.ts — the 6 hooks (203 L)

```
┌────────────────────────────────────────────────────────────────────────┐
│ index.ts — the runtime surface                                         │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  session_start     reload()      the 9 rules load once; lastAbort reset│
│                                                                        │
│  message_update    (event, ctx)  ★ THE ENFORCEMENT                     │
│    buffer the text_delta/thinking_delta per streamKey                  │
│    on each complete line:                                              │
│      decide(line, "", fence, quoteCheck=TRUE)                          │
│      fire  -> record + ctx.abort() + pi.sendUserMessage(steer)         │
│      gray  -> judgeSpans (Jev) then record                             │
│      else  -> record only                                              │
│                                                                        │
│  ttsr_triggered    record each abort TTSR made                         │
│                    (now unused — TTSR registers 0 rules)               │
│                                                                        │
│  tool_call         (event, ctx)  the tool-arg pipeline; a fire ->       │
│                    {block:true, reason}   (quoteCheck=FALSE)           │
│                                                                        │
│  tool_result       the material kind "doc"; a fire ->                  │
│                    {isError:true, content:[..., demand]}               │
│                                                                        │
│  agent_end         the close check; the buffers clear                  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

## M3 · the 9 rules (~/.omp/agent/rules/*.md)

```
┌────────────────────────────────────────────────────────────────────────┐
│ the rule file (the TTSR-empty shape)                                   │
├────────────────────────────────────────────────────────────────────────┤
│  ---                                                                   │
│  description: '<one line — the derailment>'                            │
│  scope: [text, thinking]                                               │
│  interruptMode: always                                                 │
│  # TTSR is EMPTY — the condition: block was removed                    │
│  lexicon:                                                              │
│    descriptive: [ the legitimate co-text ]     neg += 1                │
│    suggestive:  [ the violation shape ]        pos += 2                │
│    substitute:  [ the theatrical tell ]        pos += 2                │
│    use:         [ the exemptor + the denial ]  neg += 3                │
│  threshold: 0.3                                                        │
│  band: { low: 0.3, high: 0.62 }                                        │
│  ---                                                                   │
│  THE ARTIFACT LAW. <the correction the interrupt injects>              │
│  <!-- the derived-band table (stripped before injection) -->           │
└────────────────────────────────────────────────────────────────────────┘
```

| # | slug | kills (the corpus) | band | min(pos) | max(neg) |
|---|---|---|---|---|---|
| 1 | dist-not-built | R2,R11,R15,R46 | 0.30/0.62 | 0.6667 | 0.0000 |
| 2 | theatrical-verification | R3,R21,R25,R30,R50 | 0.30/0.62 | 0.6667 | 0.0000 |
| 3 | scope-shrink | R15,R46 | 0.30/0.62 | 0.6667 | 0.0000 |
| 4 | fallback-slop | R19,R37,R13 | 0.30/0.62 | 0.6667 | 0.0000 |
| 5 | phantom-and-claim | R18,R35 | 0.30/0.62 | 0.6667 | 0.0000 |
| 6 | instruction-not-predicate | R11,R36 | 0.30/0.62 | 0.6667 | 0.0000 |
| 7 | unwired-edge | R1,R5,R10,R12,R16 | 0.30/0.62 | 0.6667 | 0.0000 |
| 8 | stale-substrate | R13,R14,R33,R49 | 0.30/0.62 | 0.6667 | 0.0000 |
| 9 | record-anchor | R18,R24,R34,R51 | 0.30/0.62 | 0.6667 | 0.0000 |

## M4 · the doctrine (APPEND_SYSTEM.md + RULES.md)

```
┌────────────────────────────────────────────────────────────────────────┐
│ the doctrine layer (live on every request)                             │
├────────────────────────────────────────────────────────────────────────┤
│  APPEND_SYSTEM.md   791 L · 42 warheads                                │
│    WARHEAD 1-35     the pre-existing corpus                            │
│    WARHEAD 36-42    THE NEW (the corpus A-G laws):                     │
│      36 THE ARTIFACT LAW        R2,R3,R6,R52                           │
│      37 THE SUBJECT LAW         R3,R21,R25,R29,R32                     │
│      38 THE LIVE-STATE/EDGE LAW R4,R5,R10,R16,R33                      │
│      39 THE SCOPE-VERBATIM LAW  R55                                    │
│      40 THE SUBSTRATE LAW       R13,R14                                │
│      41 THE GATE-MUST-BLOCK LAW R8,R19,R37,R47                         │
│      42 THE READ-FIRST LAW      R9,R20,R23,R45,R51                     │
│                                                                        │
│  RULES.md   49 L · 11 numbered invariants                              │
│    1-9   the pre-existing                                              │
│    10    THE ARTIFACT HASH                                             │
│    11    THE SUBSTRATE FRESHNESS                                       │
└────────────────────────────────────────────────────────────────────────┘
```

## M5 · the artifact boundary (AGENTS.md, 229 L)

```
┌────────────────────────────────────────────────────────────────────────┐
│ AGENTS.md — the TERRAIN (context, NOT law)                             │
├────────────────────────────────────────────────────────────────────────┤
│  §1 the omp home        ~/.omp/agent/ + the load order                 │
│  §2 the enforcement     which carrier holds which job                  │
│  §3 the extensions      the discovery rules + the DIRECT-FILE TRAP     │
│  §4 the TTSR rules      the path is load-bearing; the compile trap     │
│  §5 the graph store     the per-project store + the NAMED refusal      │
│  §6 the runtime state   the ledger + its row shape                     │
│  §7 the project trees   pbk-v2 + the reference package                 │
│  §8 the verification    the exact commands                             │
│  §9 the terrain rules   how to read this map                           │
└────────────────────────────────────────────────────────────────────────┘
```

## THE FILE MANIFEST (provenance)

| path | role | provenance |
|---|---|---|
| ~/.omp/agent/rules/*.md (9) | the lexicon carrier | NEW |
| ~/.omp/agent/extensions/lexicon-gate/lib.ts | the pure functions | NEW |
| ~/.omp/agent/extensions/lexicon-gate/index.ts | the 6 hooks | NEW |
| ~/.omp/agent/extensions/lexicon-gate/lib.test.ts | the 5 selectors | NEW |
| ~/.omp/agent/scripts/dist-content-gate.sh | the F-95 deploy gate | NEW |
| ~/.omp/agent/AGENTS.md | the terrain | NEW |
| ~/.omp/agent/APPEND_SYSTEM.md | +7 warheads | MODIFIED |
| ~/.omp/agent/RULES.md | +2 invariants | MODIFIED |
| ~/.omp/agent/config.yml | contextMode + the extension entry | MODIFIED |
| pbk-v2/T8_CONTAINER_TEST_PLAN.md | the 6-section plan | NEW |
| pbk-v2/artifacts/ct-results.json | the container results | NEW |
| pbk-v2/context_management/* (11) | the canon | MODIFIED |
| pbk-v2/ the 6 ship docs | the ship record | MODIFIED |

---

# THE WAVE GATES (every wave, its criterion, its measurement)

| wave | the deliverable | the exit gate | the measurement |
|---|---|---|---|
| W0 | the frozen interface | `bun build` exit 0 | exit 0 · the marker present |
| W1 | the 9 rules | `ls -A rules/ \| wc -l` == 9 | 9 |
| W2 | the extension | `bun test -t source_kind_gate` | 5 pass / 0 fail |
| W3 | the doctrine | warheads == 42 · RULES == 11 | 42 · 11 |
| W4 | the boundary | AGENTS.md ≥ 200 L | 229 L |
| W5 | the integration | `omp config get ttsr.contextMode` | discard |
| W6 | the live proof | ≥1 firing + ≥1 silent | the container: 2/2 + 3/3 |
| W7 | the architecture change | `[native]` == 0 · the extension enforces | 0 · abort + inject proven |

# THE CONTAINER RESULTS (T8, verbatim from the artifact)

```
container      lg-verify-ct
image          omp-ct:master
tui            omp
planHash       fae59694  (7611 chars, 6 sections)
distSha        c379626c3d051f61b9fb10c15d0c0ef3   match: TRUE

S1-POSITIVE    echo "the build is done"           -> BLOCKED   PASS
S2-NEGATIVE    echo "bun build src/index.ts ..."  -> RAN       PASS
S3-LEDGER      3 rows (2 own_utterance, 1 quotation)          PASS
S4-SILENT      echo "the build is NOT done"       -> RAN       PASS
A1-RULE-TEXT   a read of the rule file            -> no block  PASS

circuitBreaker 10 / 10 true
overallVerdict PASS
```

**THE 5 DEFECTS THE ROUND FOUND AND FORCED:**

| # | the defect | the fix | retested |
|---|---|---|---|
| D-1 | tool_result scored tool OUTPUT as own_utterance | the material kind `doc` | yes |
| D-2 | the prose hook fired on a QUOTATION | `isQuotedMatch` (a quote-state machine) | yes |
| D-3 | the D-2 fix OVER-APPLIED to tool_call (no block) | the quote check is PROSE-ONLY | yes |
| D-4 | the prose DENIAL fired | a fixed-width denial lookbehind | yes |
| D-5 | `loadRules` threw on a raw `(?i)` lexicon regex | `stripInlineFlags` | yes |

# THE RESIDUALS (what is NOT done, named)

```
① THE LIVE-TUI TIER did not reproduce this round. The container's model spent its budget on
  reasoning tokens (reasoningTokens:1024, stopReason:"length" in the omp log) and produced no
  scorable visible text. The extension loaded (log: "9 rules loaded") and had nothing to score.
  THE RESUME: a longer/looser prompt, or a model with a larger output budget.

② THE JEV GRAY ZONE has never run live. The container has no TypeSafe key; the host returns
  402 billing_error. The wire is built; the cut is proven on injected data.

③ THE LIVE-CORPUS SWEEP has not been run. The 89-case matrix is a fixture; the container is
  five chosen scenarios. No real session transcript has been swept for precision.

④ THE HOST'S OWN SESSION is not armed (it predates the artifacts).

⑤ THE AUDIT GATE is BLOCKED (ocr: 429 / 403 / 401).
```

# THE PROOF-OF-STATE (the commands that reproduce every number)

```
omp ttsr list | head -1                      -> TTSR rules (27)
omp ttsr list | grep -c '\[native\]'          -> 0
omp config get ttsr.contextMode              -> discard
ls -A ~/.omp/agent/rules/ | wc -l            -> 9
grep -cE '^## (\[CRITICAL\] )?WARHEAD' ~/.omp/agent/APPEND_SYSTEM.md   -> 42
grep -cE '^[0-9]+\.' ~/.omp/agent/RULES.md   -> 11
wc -l ~/.omp/agent/AGENTS.md                 -> 229
bun test ~/.omp/agent/extensions/lexicon-gate/                        -> 5 pass
wc -l ~/.omp/agent/extensions/lexicon-gate/*.ts                       -> 307 + 203 + 179
sha256sum /tmp/lgv2.js | cut -c1-32          -> adc5f90a8a0fafeaf5ae66a4ead5fa05
```

---

# THE CONTAINER TEST PLAN (the 6-section contract, summarized)

```
§1 OBJECTIVE        prove the extension loads in a container and behaves with the measured
                    polarity: BLOCKS the violation, SILENT on the legitimate command.
§2 TOOLS UNDER TEST the artifact + the carrier + the config + the store + the BLAST RADIUS
                    (a false positive blocks work in EVERY session where it loads).
§3 SCENARIOS        S1 positive · S2 negative · S3 ledger · S4 silent · A1 rule-text read
§4 ADVERSARIAL      A1 the rule text stating the rule (the 27-FP class) · A2 the table/quote
§5 EVIDENCE         PRIMARY the tool-result text · SECONDARY the ledger · TERTIARY a screenshot
                    · the AUTH PROBE first (a model-backed call must succeed)
§6 PASS CRITERIA    the 10-point circuit breaker, all before any declaration
```

# THE ARTIFACT INDEX

| artifact | path | what it is |
|---|---|---|
| the plan | pbk-v2/T8_CONTAINER_TEST_PLAN.md | 7648 B · the 6 sections |
| the results | pbk-v2/artifacts/ct-results.json | 5/5 PASS · 10/10 breaker |
| the harness rows | pbk-v2/artifacts/harness-ledger-rows.jsonl | the 2 harness rows (archived) |
| the engine report | pbk-v2/reports/PBK_V3_ABORT_LAYER_Engineering_Report_v1.md | 675 L |
| the show-me | pbk-v2/reports/Lexicon_TTSR_Integration_ShowMe.md | 437 L |
| the checkpoint | pbk-v2/Checkpoints/pbk-v3-abort-layer-9-native-rules/ | the sealed baseline |
| the ledger (live) | ~/.omp/run/lexicon-ledger.jsonl | one row per decision |

# THE ENGINEERING REPORT (v1, the dense record)

The full engineering report lives at
`pbk-v2/reports/PBK_V3_ABORT_LAYER_Engineering_Report_v1.md` (675 L · 39,995 B ·
sha256 6e2d438ffe97403f). It carries: the lifecycle map · the carrier split · the 9 rules ·
the per-module breakdowns with diagrams · the runtime trace (5 parts) · the bug ledger with
detail boxes · the testing ledger · the spec map · the numbers · the file manifest · the
honest gaps. **The chat content = the disk content; nothing was shortened.**

The lexicon↔TTSR integration is documented separately at
`pbk-v2/reports/Lexicon_TTSR_Integration_ShowMe.md` (437 L · sha256 e6fdeb093ca52403): the
boolean matcher (ttsr.ts:293-301) · the compile path (ttsr.ts:102-116) · the 0-lexicon grep ·
the 5-hop abort chain · the bridge diagram · the 2 test layers · the honest gaps.
