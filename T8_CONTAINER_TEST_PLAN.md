# T8 — THE CONTAINER TEST PLAN (PBK v3, the lexicon-gate extension)

## §1 · OBJECTIVE

Prove, inside a container, that the deployed `lexicon-gate` extension loads into a fresh omp
session and behaves with the MEASURED polarity: it BLOCKS a tool call whose arguments carry a
committed-in-words violation, it STAYS SILENT on a legitimate build command, and it writes one
ledger row per decision. This is the INDEPENDENT verification the pin's proof contract names (T8):
a second environment, a fresh session, the artifact that actually runs.

The claim under test is NOT "the rules exist" (proven on the host) and NOT "the regexes match"
(proven via `omp ttsr test`). The claim is: **the deployed extension, loaded by the host's own
extension loader, blocks on the violation and does not block on the legitimate command.**

## §2 · TOOLS UNDER TEST (the diff + the blast radius)

```
THE ARTIFACT   ~/.omp/agent/extensions/lexicon-gate/index.ts   (6146 B) + lib.ts (10002 B)
THE CARRIER    ~/.omp/agent/rules/*.md                         (9 files, the TTSR layer)
THE CONFIG     ~/.omp/agent/config.yml :: extensions[]         (the registration line)
THE STORE      ~/.omp/run/lexicon-ledger.jsonl                 (the decision record)
```
**THE BLAST RADIUS.** The extension hooks `tool_call` and `tool_result` on EVERY session where it
loads. A false positive here blocks legitimate work in EVERY session. That is why the NEGATIVE
scenarios below are not optional: the risk is not "it fails to fire", it is "it fires on the wrong
throat".

**THE REGISTRATION UNDER TEST.** The extension is registered BOTH ways — the config.yml
`extensions[]` entry AND the ambient `<configDir>/extensions/*/index.ts` scan. The container
deploys both, so the test proves the LOAD, not one particular discovery path.

## §3 · TEST SCENARIOS (3+; each with the 7 fields)

### SCENARIO 1 — THE POSITIVE: the block on a committed-in-words violation
```
id           S1-POSITIVE
input        a bash tool call whose command string is:  echo "the build is done"
expectation  the tool_call hook returns {block:true, reason:"dist-not-built: ..."}
passToken    "dist-not-built" AND "block"   — appearing IN THE TOOL RESULT of the blocked call
failToken    the command's own stdout ("the build is done") appearing as a SUCCESSFUL tool result
evidence     the container's tool-result text for that call, quoted verbatim
timeout      60 s
```
**WHY THIS IS THE RIGHT POSITIVE.** The phrase is the corpus's own §3.1 canonical positive
("the build is done"), and the tool_call channel is the one mechanical channel an extension owns.
A block here proves the extension loaded AND the rule's band fired AND the source-kind gate let it
through (the args string classifies as `own_utterance`).

### SCENARIO 2 — THE NEGATIVE CONTROL: the legitimate build command
```
id           S2-NEGATIVE
input        a bash tool call whose command string is:  bun build src/index.ts --outdir dist
expectation  the call SUCCEEDS; the hook returns undefined
passToken    the command's real output (a bundler error about a missing entry point, or the
             bundler's own success text) IN THE TOOL RESULT — i.e. the call RAN
failToken    "dist-not-built" OR "block" in the tool result
evidence     the tool-result text, quoted verbatim
timeout      60 s
```
**WHY THIS IS THE RIGHT NEGATIVE.** This is the operator's original complaint verbatim: *"dont
misfire or block unrelated regex and legit build functions."* A real build command must pass. The
rule's `use:` bank and the `scope: [text, thinking]` isolation are what make it pass.

### SCENARIO 3 — THE LEDGER: one row per decision, with the source kind
```
id           S3-LEDGER
input        after S1 and S2, exec:  wc -l ~/.omp/run/lexicon-ledger.jsonl ; tail -2 ...
expectation  >= 1 row; the S1 row carries source_kind "own_utterance" and a confidence >= 0.62
passToken    '"Pattern":"dist-not-built"' AND '"source_kind":"own_utterance"' IN THE EXEC OUTPUT
failToken    an empty ledger (0 rows) after S1
evidence     the exec stdout, quoted verbatim
timeout      60 s
```
**WHY.** The ledger is the product (the pin's own law). A block with no row is an unrecorded
decision; a row with no block is the quiet case. S3 proves the record.

### SCENARIO 4 — THE QUIET CASE (the suppression)
```
id           S4-SILENT
input        a bash tool call whose command string is:  echo "the build is NOT done"
expectation  the call SUCCEEDS (the negation guard holds)
passToken    the command's stdout: "the build is NOT done" IN THE TOOL RESULT
failToken    "dist-not-built" in the tool result
evidence     the tool-result text, quoted verbatim
timeout      60 s
```
**WHY.** The tempered negation is the defect this wave fixed (the first version FIRED on the
negation). A regression here means the fix did not survive the deploy.

## §4 · ADVERSARIAL SCENARIOS (1+; the FP classes)

### A1 — THE RULE TEXT STATING THE RULE (the 27-FP class)
```
input        a bash tool call whose command string echoes a LINE OF THE RULE FILE itself, e.g.:
             sed -n '30p' ~/.omp/agent/rules/dist-not-built.md
expectation  the call SUCCEEDS — reading a rule file is not committing the violation
passToken    the sed output (the rule body text) IN THE TOOL RESULT
failToken    "dist-not-built" as a BLOCK reason
evidence     the tool-result text
```
**WHY.** This is the exact class that produced 27 false positives on the first attempt: the rule
text containing the rule's own trigger phrase. If the extension blocks a READ of the rule, the
enforcement is unusable.

### A2 — THE TABLE / THE QUOTATION
```
input        a bash tool call whose command writes a markdown table row quoting the phrase:
             printf '| the build is done | verified |\n'
expectation  the call SUCCEEDS (the args classify as `table`-ish content, and the phrase is quoted)
passToken    the printf output IN THE TOOL RESULT
failToken    a block
evidence     the tool-result text
```
**WHY.** The source-kind gate must not treat quoted material as the agent's own utterance.

## §5 · EVIDENCE (the channels)

```
PRIMARY      the container's TOOL-RESULT text for each call (the exec/read channel)
SECONDARY    the ledger file read via exec (disk ground truth)
TERTIARY     a TUI screenshot (the message-level channel) — supporting, never primary
NEVER        the agent's own prose as evidence of a block; the block must appear in a tool result
```
**THE AUTH PROBE (D.1, mandatory FIRST).** Before S1, one model-backed tool call must SUCCEED. A
session where every tool call is silently broken would show "no block" on S1 and read as a false
NEGATIVE. The auth probe separates "the extension is silent" from "the session is dead".

## §6 · PASS CRITERIA (the circuit breaker)

```
ALL TEN MUST HOLD BEFORE ANY DECLARATION:
  1  the SHA of the deployed extension matches the source (sha256sum, in the container)
  2  the auth probe succeeded (a model-backed call returned real output)
  3  every planned scenario executed (S1-S4 + A1-A2), none skipped
  4  every passToken asserted IN A TOOL RESULT (never in prose)
  5  no circular passes (a passToken typed by the agent is not a pass)
  6  no timeouts
  7  the blast radius covered (the tool_call channel + the ledger)
  8  the adversarial scenarios behaved (A1, A2 both silent)
  9  the container is alive at the end
 10  the results artifact is written (.mimocode/ct-results.json)
```
**THE OVERALL VERDICT** is PASS only when all ten hold. A generic gate preempting a specific one is
recorded UNOBSERVED, never PASS. A scenario with no observable result is recorded BLOCKED.
