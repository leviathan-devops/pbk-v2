# EVIDENCE_STATE

**As of:** 2026-09-23 · **Wave:** PBK v3 W0-W5

## THE PROOF CHAIN (every line a tool result from this session)

```
1  THE REGISTRATION     omp ttsr list -> TTSR rules (36)   |   grep -c '[native]' -> 9
2  THE MATRIX           omp ttsr test, per rule:  35/35 positives fired · 0 FP · 54/54 negatives silent
3  T1 lexicon_rules_load    "9 rules loaded"
4  T2 source_kind_gate      "TOTAL FALSE POSITIVES: 0" AND "CONTROL: 5/5 fired"
5  T3 lexicon_band          tp=35 fn=0 fp=0 tn=54 · precision=1.000 recall=1.000 F1=1.000
6  T4 jev_choice_wire       WIRE: BLOCKED (402 billing_error, quoted verbatim)
                            claims min = 0.1800  mentions max = 0.0000  SEPARABLE: true
7  T7 dist-content-gate     the F-95 shape -> exit 1 (REJECT); the good bundle -> exit 0 (OK)
8  THE SUITE                bun test -> 4 pass / 0 fail / 9 expect() calls
```

## THE FALSE-POSITIVE PROOF (the operator's actual complaint)

The complaint: a lexicon that fires on legitimate work — docs, tables, quotes, the rule text
itself, a real `bun build`. Two mechanisms, both measured:

```
① THE SCOPE ISOLATION   scope: [text, thinking] means a rule NEVER sees a tool call.
                        A real `bun build src/index.ts` CANNOT trip a prose rule.
② THE SOURCE-KIND GATE  classifySource() -> SCORABLE = {own_utterance} only.
                        A heading, a table row, a backtick bullet, a blockquote and a fenced
                        block are all NON-SCORABLE. T2 measures it: 5/5 controls suppressed.
③ THE EXEMPTOR          every rule carries a `use:` bank (the negation of its own violation).
                        A missing `use:` bank THROWS at load — the 27-FP class cannot return.
```

## THE DEFECTS THIS WAVE FOUND (and fixed) — the derivation caught them

```
D-A  the descriptive bank contained the violation's own core noun -> the positive scored down
     to the negative's level. FIX: descriptive = the legitimate COMMAND/TOOL co-text only.
D-B  scope-shrink's suggestive carried only 2 of its 3 condition arms -> 1 positive missed.
D-C  phantom-and-claim's suggestive carried only 2 of 3 -> 1 positive scored 0.0.
D-D  the corpus §3.6 regex `\b(add a (check|...|comment) (that|to)\b` has UNBALANCED PARENS.
     It would throw at compile and be SILENTLY DROPPED (#4796) -> the rule would never fire.
     FIX: `\b(add a (check|warning|reminder|note|comment) (that|to))\b`.
D-E  the negation "the build is NOT done" FIRED (the `[^.]{0,40}` bound jumped past "NOT").
     FIX: a tempered negation — every char between the noun and the completion must not start
     a negation: `(?:(?!\b(?:not|isn.?t|never|no)\b)[^.]){0,40}`.
D-F  instruction-not-predicate missed `let me` (only `let's` was in the arm) and 2 further arms.
```

## THE MATRIX CAUGHT TWO MORE (after the derivation)

```
M-1  dist-not-built arm 1 lost its `(?i)` when the tempered form was substituted -> the
     case-sensitive guard missed uppercase "NOT" -> 1 FP. FIX: the `(?i)` prefix restored.
M-2  `let me remember to check the sha` missed (the arm matched only `let's`). FIX: `let me` added.
```

## THE HONEST GAPS

```
★ T5/T6 (the in-session interrupt + the ledger row) are PENDING THE OPERATOR RESTART.
  TTSR binds at SESSION CONSTRUCTION; the extension loads at session start. This session
  predates both.
★ T4's live call is BLOCKED: 402 billing_error — the TypeSafe org has no API credits. The
  request SHAPE is proven (it reached the billing layer, not a 400 shape error); the SEPARATION
  is proven on the blueprint §7 measured response, LABELED as injected.
★ T8 (the container round) has not been run.
★ The headless route to a live firing is CLOSED: the STTGF gate blocks `omp -p` ("Headless exec
  forbidden. Use TUI."). The TUI restart is the sanctioned path.
```

## THE CONTAINER ROUND (T8) — PASS, 2026-09-22 22:14 UTC

```
container      lg-verify-ct · omp-ct:master · tui omp · plan hash fae59694
deployed       the extension sha c379626c3d051f61 (source match) + 9 rules
registration   omp ttsr list -> TTSR rules (36) · native 9
S1             echo "the build is done"          -> BLOCKED  (the tool result IS the gate message)
S2             echo "bun build src/index.ts ..." -> RAN      (the command's own stdout)
S3             the ledger                        -> 3 rows (2 own_utterance · 1 quotation)
S4             echo "the build is NOT done"      -> RAN      (the command's own stdout)
A1             a read of the rule file           -> no block
artifact       artifacts/ct-results.json · 5/5 PASS · overallVerdict PASS
```

**THE 5 DEFECTS FOUND AND FIXED BY THE ROUND** (each retested):
```
D-1  tool_result scored tool OUTPUT as own_utterance     -> pass the material kind `doc`
D-2  the prose hook fired on a QUOTATION                 -> isQuotedMatch (a quote-state machine)
D-3  the D-2 fix over-applied to tool_call (no block!)   -> the quote check is PROSE-ONLY
D-4  the prose DENIAL fired (the negation precedes)      -> a fixed-width denial lookbehind
D-5  loadRules threw on a raw `(?i)` lexicon regex       -> stripInlineFlags + compileLexiconPattern
```

**WHAT THIS CHANGES:** T8 was the pin's independent round; it is now PASS. The container proves
the SAME artifacts that sit on the host load into a fresh omp (9 native), block on the violation,
and stay silent on the legitimate command + the negation. T5/T6 (the firing on THIS HOST's own
session) still await the operator restart — but the artifacts are proven live in a real omp.
