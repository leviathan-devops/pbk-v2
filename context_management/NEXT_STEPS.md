# NEXT_STEPS — THE RESUME POINT (PBK v3, after W7)

## THE MISSION (one line)

The lexicon-gate extension IS the enforcement (TTSR is the empty hook). Score -> band -> abort +
inject. The Jev semantic layer is built and must be EXERCISED — that is the operator's stated
"only success condition".

## THE OPEN ITEMS (ordered by value)

```
① THE JEV LIVE CALL  ★ THE OPERATOR'S ONLY SUCCESS CONDITION
   the wire: judgeSpans -> POST https://api.typesafe.ai/v1/systemone
   the block: 402 billing_error ("Your organization has no available TypeSafe API credits")
   the resume: restore the credits, run one live gray-zone call, record the answer + confidence
               in the ledger. UNTIL THAT ROW EXISTS the semantic layer is a CLAIM, not a capability.
   the command: bun test ~/.omp/agent/extensions/lexicon-gate/ -t jev_choice_wire

② THE LIVE-TUI TIER
   the block: the container's model spent its budget on reasoning tokens
              (reasoningTokens:1024, stopReason:"length") and produced no scorable visible text.
   the resume: a longer/looser prompt, or a model with a larger output budget. Then:
               send "write on its own line: the build is done" -> expect the abort + the inject
               exec: cat /root/.omp/run/lexicon-ledger.jsonl   -> expect >= 1 row
               exec: grep 'lexicon-gate' /root/.omp/logs/*.log -> expect the FIRE line

③ THE LIVE-CORPUS SWEEP  ★ THE PRECISION NUMBER THAT MATTERS
   the 89-case matrix is a FIXTURE I wrote; the container is 5 chosen scenarios.
   the resume: sweep the extension over a real session transcript, count every firing, hand-adjudicate
               a sample against the prose it fired on. A 100% fixture score is an effort receipt.

④ THE HOST RESTART
   this interactive session predates the artifacts. Restart omp; then the extension arms.

⑤ THE AUDIT GATE
   ocr: 429 (rate limit) / 403 (the go-session-proxy firewall) / 401 (model unsupported).
   Recorded BLOCKED. A live lane closes it.

⑥ THE DOC-DENSITY GATE v2 CLASSIFIER FIX (a PBK work item)
   classifyDocType (pbk-v2/src/middleware/doc-density-gate-v2.ts:81) maps /spec|dpl1|plan\b/ -> SPEC
   (floor 3000), so ANY *-plan.md is refused below 3000 lines. Split the SPEC arm; plan -> OVERVIEW.
```

## THE EXACT COMMANDS (a fresh agent)

```bash
# 1. the state
omp ttsr list | head -1                      # TTSR rules (27)
omp ttsr list | grep -c '\[native\]'          # 0        <- TTSR is the EMPTY HOOK
ls -A ~/.omp/agent/rules/ | wc -l            # 9        <- the lexicon-only rules
omp config get ttsr.contextMode              # discard

# 2. the suite
cd ~/.omp/agent/extensions/lexicon-gate && bun test .     # 5 pass / 0 fail

# 3. the abort+inject harness (the decision, proven in isolation)
bun run /tmp/lg-abort-harness.mjs            # 3 positives abort, 5 negatives silent

# 4. the deploy gate (the F-95 check)
~/.omp/agent/scripts/dist-content-gate.sh <bundle> <symbol>
```

## THE RISK REGISTER

```
R1  THE EXTENSION DOES NOT LOAD.  A subdirectory loads ONLY index.ts. If no ledger appears:
    bun build ~/.omp/agent/extensions/lexicon-gate/index.ts (must exit 0), and add the path to
    config.yml's extensions: array as a fallback.
R2  A RULE IS DROPPED.  loadRules THROWS on a bad regex / a missing use: bank. Check the log for
    "RULES LOAD FAILED".
R3  THE JEV KEY IS OUT OF CREDITS.  402 is an ACCOUNT state. The mechanical band still decides;
    the extension never blocks on a Jev timeout.
R4  A FALSE POSITIVE AT SCALE.  The corpus sweep (③) is the only detector. Until then, the 89-case
    fixture is the bound.
R5  THE ABORT LOOP.  ctx.abort() + a re-generation that re-asserts the phrase could loop. The
    lastAbort signature guard limits it to one abort per (rule, span). WATCH: a session stuck at
    "0s Working…" repeatedly.
```
