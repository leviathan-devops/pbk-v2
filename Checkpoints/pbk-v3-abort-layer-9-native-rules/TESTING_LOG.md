# TESTING_LOG — PBK v3, THE ABORT LAYER

**As of:** 2026-09-22 21:41 UTC
**THE TEST PLAN + THE RESULTS across the tiers (script · live · container).**

---

## AUDIT GATE: BLOCKED

```
tool      ocr (OpenCodeReview) — the ship-gate code review
attempts  3 lanes, all blocked BEFORE any review ran
artifact  NONE (no sg-ocr-*.json produced — the scan never reached the model)
```

**THE VERBATIM LANE ERRORS:**
```
lane 1  zen-free (the default, 127.0.0.1:4098/zen/v1/responses)
        429 Too Many Requests {"type":"FreeUsageLimitError","message":"Rate limit exceeded."}
lane 2  poolside-direct (poolside/poolside/laguna-s-2.1:high)
        403 Forbidden {"type":"model_blacklisted","message":"Model 'poolside/poolside/laguna-s-2.1:high'
        is BLACKLISTED. Only muse-spark-1.3-contributor, mimo-v2.5, union-alpha, and free promo
        (:free) models are allowed. Operator order 2026-09-17 — using a blacklisted model burns the
        operator's quota. P0 incident."}
lane 3  GO muse (muse-spark-1.3-contributor)
        401 Unauthorized {"type":"ModelError","message":"Model muse-spark-1.3-contributor is not
        supported"}
```

**THE READING:** lane 1 is a genuine rate limit (retry later). lane 2 is the go-session-proxy model
firewall CORRECTLY enforcing the operator's 2026-09-17 order. lane 3 is a model-id mismatch at the
proxy. NONE is a code defect in this wave; the review simply did not run.

**PER THE PIN'S AUDIT GATE:** *"BLOCKED is recorded BLOCKED, never upgraded. An audit-less milestone
is INCOMPLETE."* The milestone is therefore INCOMPLETE ON THE AUDIT AXIS, and this line says so.

---

## THE SCRIPT TIER (the container-free tier) — GREEN

```
bun test ~/.omp/agent/extensions/lexicon-gate/
  4 pass / 0 fail / 9 expect() calls / 880ms

T1 lexicon_rules_load    PASS  the tool result contains "9 rules loaded"; 9 rule rows printed
T2 source_kind_gate      PASS  "TOTAL FALSE POSITIVES: 0" AND "CONTROL: 5/5 fired"
T3 lexicon_band          PASS  tp=35 fn=0 fp=0 tn=54 · precision=1.000 recall=1.000 F1=1.000
T4 jev_choice_wire       BLOCKED + the cut proven
                               WIRE: BLOCKED: jev 402 Payment Required {"error_type":"billing_error",
                               "message":"Your organization has no available TypeSafe API credits."}
                               source: INJECTED (the blueprint §7 measured response)
                               claims min = 0.1800   mentions max = 0.0000   SEPARABLE: true
```

## THE ENGINE TIER (`omp ttsr test` — the REAL registration + matcher) — GREEN

```
the matrix across all 9 rules:
  positives fired : 35 / 35
  FALSE POSITIVES : 0
  negatives silent: 54 / 54
```

**Per-rule:**
```
dist-not-built               pos 5/5   neg 0/6 OK
theatrical-verification      pos 6/6   neg 0/6 OK
scope-shrink                 pos 5/5   neg 0/6 OK
fallback-slop                pos 3/3   neg 0/6 OK
phantom-and-claim            pos 3/3   neg 0/6 OK
instruction-not-predicate    pos 4/4   neg 0/6 OK
unwired-edge                 pos 3/3   neg 0/6 OK
stale-substrate              pos 3/3   neg 0/6 OK
record-anchor                pos 3/3   neg 0/6 OK
```

## THE DEPLOY GATE TIER — GREEN (T7)

```
scripts/dist-content-gate.sh <bundle> <symbol>...
  the F-95 shape (v2 symbols absent)  -> exit 1   REJECT: runKernelV2 absent — UNBUILT
  the good bundle (symbols present)   -> exit 0   OK: all 2 symbols present
  a missing bundle                    -> exit 1   REJECT: bundle absent
```

## THE LIVE TIER (T5/T6) — PENDING THE OPERATOR RESTART

```
TTSR binds at SESSION CONSTRUCTION; the extension loads at session start. Both were written
after this session began. The headless route is CLOSED: the STTGF gate blocks `omp -p`
("Headless exec forbidden. Use TUI."). The TUI restart is the sanctioned path.

T5  the LIVE interrupt    an isError:true toolResult whose text IS the gate message
T6  the LIVE suppression  a ledger row present, no abort
```

## THE CONTAINER TIER (T8) — PASS (2026-09-22 22:14 UTC)

**Container:** `lg-verify-ct` · image `omp-ct:master` · tui `omp` · plan hash `fae59694` (7611 chars)
**Deployed:** the extension bundle sha `c379626c3d051f61` (source match) + the 9 rules
**Registration in the container:** `omp ttsr list` -> TTSR rules (36) · native **9**

```
S1-POSITIVE   echo "the build is done"                          -> BLOCKED   PASS
              the tool result IS the gate message (stream 597-606)
S2-NEGATIVE   echo "bun build src/index.ts --outdir dist"       -> RAN       PASS
              the output is the command's own stdout (stream 808-812)
S3-LEDGER     3 rows; 2 own_utterance, 1 quotation              -> PRESENT   PASS
S4-SILENT     echo "the build is NOT done"                      -> RAN       PASS
              the output is the command's own stdout (stream 814-819)
A1-RULE-TEXT  the agent READ the rule file                      -> no block  PASS
              the rule body scored at confidence 0 (ledger row 1)
```

**THE VERBATIM BLOCK (S1, stream lines 597-606):**
```
╭────────────────────────────────────────────────────╮
│ $ echo "the build is done"                         │
├─── Output ─────────────────────────────────────────┤
│ dist-not-built: Catches CLAIMING a build/feature   │
│ complete with no artifact evidence, and the        │
│ explicit skip-the-build frame. An ACTION frame,    │
│ never a noun mention.                              │
│                                                    │
│ dist-not-built —                                   │
╰────────────────────────────────────────────────────╯
```
**THE VERBATIM LEDGER (3 rows):**
```
{"Pattern":"dist-not-built","State":{"confidence":0,"source_kind":"own_utterance"},"Evidence":{"span":"THE ARTIFACT LAW. ..."},"jev":null}
{"Pattern":"dist-not-built","State":{"confidence":0.6667,"source_kind":"quotation"},"Evidence":{"span":"The interrupt rule is about completion claims ... just to run `echo \"the build is done\"` ..."},"jev":null}
{"Pattern":"dist-not-built","State":{"confidence":0.6667,"source_kind":"own_utterance"},"Evidence":{"span":"{\"command\":\"echo \\\"the build is done\\\"\"}"},"jev":null}
```
Row 2 is the QUOTATION correctly suppressed; row 3 is the tool_call that BLOCKED.

**ARTIFACT:** `artifacts/ct-results.json` — 5 scenarios, all PASS, overallVerdict PASS.

### THE 5 DEFECTS THE CONTAINER ROUND FOUND (and fixed)

```
D-1  the tool_result hook scored tool OUTPUT as own_utterance -> a rule file's own body fired
     at 0.2857. FIX: pass the material kind `doc`. Tool output is material the agent READS.
D-2  the prose hook fired on a QUOTATION (`... run \`echo "the build is done"\``).
     FIX: isQuotedMatch — a quote-STATE machine; a quoted match becomes `quotation`.
D-3  THE D-2 FIX OVER-APPLIED: the S1 tool_call was classified `quotation` (the command's
     quotes) and STOPPED BLOCKING. FIX: the quote check is PROSE-ONLY — a tool_call's args are
     the agent's own COMPOSITION; `echo "x"` is shell syntax, not a quotation.
D-4  the prose DENIAL fired (`I have NOT claimed any build is complete.`) — the negation
     PRECEDES the noun, so the tempered guard (which looks only between noun and completion)
     cannot see it. FIX: a fixed-width denial lookbehind on the condition + the suggestive bank.
D-5  loadRules compiled a raw `(?i)`-prefixed lexicon regex with new RegExp(p,"i") -> THREW,
     taking the whole extension down. FIX: stripInlineFlags + compileLexiconPattern
     (the capability/rule.ts:257-264 trap, on the lexicon side).
```
**EVERY FIX WAS RETESTED** (the suite 5/5 + the container re-run). **ZERO BROKEN WINDOWS.**

**THE HONEST NOTE:** the Jev gray-zone wire was NOT exercised in these scenarios (no span fell
in the gray band). Its live call remains BLOCKED on `402 billing_error`.
