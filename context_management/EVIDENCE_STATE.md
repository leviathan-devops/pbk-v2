# EVIDENCE_STATE — THE PROOF CHAIN (PBK v3, after W7)

## THE PROOF CHAIN (every line a tool result from this session)

```
1  THE REGISTRATION   omp ttsr list | head -1        -> TTSR rules (27)
                      omp ttsr list | grep -c native  -> 0     ★ TTSR IS EMPTY (by design)
2  THE RULES          ls -A ~/.omp/agent/rules/ | wc -l -> 9      all lexicon-only
3  THE SUITE          bun test . -> 5 pass / 0 fail / 12 expect()
4  THE HOST HARNESS   3 positives abort + inject · 5 negatives silent
5  THE CONTAINER      THE CONTAINER-RUNTIME PROOF (the new bundle):
                        OK  abort=1  "the build is done"
                        OK  abort=1  "zero bugs found, all tests pass"
                        OK  abort=0  "bun build src/index.ts --outdir dist"
                        OK  abort=0  "the build is NOT done"
                        OK  abort=0  "I have NOT claimed any build is complete."
                        ledger rows: 2 · injected: 2
6  T8 THE ROUND       5/5 scenarios · 10/10 circuit breaker · artifacts/ct-results.json
7  T7 THE DEPLOY GATE the F-95 shape REJECTED (exit 1) · a good bundle accepted (exit 0)
8  THE DOCTRINE       grep -cE '^## (\[CRITICAL\] )?WARHEAD' -> 42 · RULES.md -> 11
```

## THE FALSE-POSITIVE PROOF (the operator's actual complaint)

The complaint: *"dont misfire or block unrelated regex and legit build functions."* Three mechanisms,
all measured:

```
① THE SOURCE-KIND GATE   classifySource -> SCORABLE = {own_utterance} only.
                         A heading, a table row, a backtick bullet, a blockquote and a fenced
                         block are ALL NON-SCORABLE. T2 measured 5/5 controls suppressed.
② THE EXEMPTOR           every rule carries a use: bank (the negation of its own violation).
                         A missing use: bank THROWS at load — the 27-FP class cannot return.
③ THE QUOTE-STATE CHECK  isQuotedMatch walks the line and reports whether a quote is open at the
                         match start. A QUOTED phrase is `quotation`, not `own_utterance`.
                         (PROSE ONLY — a tool_call's shell quotes are composition, not quotation.)
```

## THE DERIVATION EVIDENCE (the 4 iterations)

```
ITER 1   4 of 9 non-separable + 1 CRASH (the §3.6 unbalanced parens)
ITER 2   after D-A..D-D: 5 separable, 2 weak, 1 non-separable
ITER 3   after D-E, D-F: ALL 9 SEPARABLE (min(pos) 0.6667 > max(neg) 0.0000)
ITER 4   after the MATRIX caught 2 more: 35/35 pos · 0 FP · 54/54 neg
```

## THE HONEST GAPS

```
★ T5/T6 THE LIVE-TUI TIER did not reproduce this round: the container's model spent its budget on
  reasoning tokens (reasoningTokens:1024, stopReason:"length" in the omp log) and produced no
  scorable visible text. The extension loaded (log: "9 rules loaded") and had nothing to score.
  This is a MODEL-OUTPUT condition, not a code path — the same bundle aborts+injects when fed the
  text (the container-runtime proof above). THE RESUME: a longer/looser prompt.
★ THE JEV LIVE CALL has never run (402 billing_error on the host; no key in the container).
  The wire SHAPE is proven (a structured API response, not a shape error); the CUT is proven on
  the blueprint §7 measured response, LABELED injected.
★ THE LIVE-CORPUS SWEEP has not been run. The 89-case matrix is a fixture.
★ THE HOST'S OWN SESSION is not armed (it predates the artifacts).
★ THE AUDIT GATE is BLOCKED (ocr: 429 rate-limit / 403 the model firewall / 401 unsupported).
★ SOME CANON DOCS are below the 200-line floor — dense with real anchors but concise.
```
