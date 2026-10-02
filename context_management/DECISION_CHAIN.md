# DECISION_CHAIN — THE OPERATOR'S RULINGS (verbatim)

## [2026-09-23] — PBK v3, THE ABORT LAYER

```
D101  THE CARRIER SPLIT (v1). TTSR owns the prose abort via condition:; the extension owns the
      tool channels. Evidence: MessageUpdateEvent carries no result type (types.ts:708-712);
      TtsrTriggeredEvent is notification-only (shared-events.ts:274-277).
      ★ SUPERSEDED BY D109.

D102  THE RULE CARRIES BOTH CARRIERS. One frontmatter block holds condition: (TTSR) AND
      lexicon:/band: (the extension). The engine IGNORES the extra keys, so the extension reads
      the rule FILES from disk — never getActiveRules(), which drops them at parse
      (capability/rule.ts:208-238).
      ★ THE condition: KEY WAS REMOVED IN D109.

D103  THE BAND IS DERIVED PER RULE, never inherited. Sweep the rule's own positives against the
      corpus §4.1 negative set; pick the band where min(positive) > max(negative).
      The measured result: every rule 0.667 vs 0.000 -> band 0.30/0.62.

D104  THE use: BANK IS MANDATORY. A rule without one THROWS at load. The 27-FP class cannot
      return through a missing exemptor.

D105  THE SOURCE-KIND GATE RUNS FIRST AND COSTS $0. SCORABLE = {own_utterance} only.

D106  THE JEV WIRE IS DEPENDENCY-FREE. @typesafe-ai/sdk does not resolve from the
      lexicon-gate/ subdirectory, so judgeSpans POSTs to /v1/systemone directly.

D107  THE EXTENSION IS A SUBDIRECTORY PACKAGE. A *.test.ts placed directly in extensions/ would
      be LOADED AS AN EXTENSION (loader.ts:562).

D108  THE RESTART IS OPERATOR-OWNED. TTSR binds at session construction.

D109  ★ THE ARCHITECTURE CHANGE — TTSR EMPTY, THE EXTENSION IS THE ENFORCEMENT.
      THE OPERATOR'S RULING (verbatim):
        "SO PUSH THE FUCKING TRUE/FALSE VAL DIRECTLY THEN MFER DO EVERYTHING OUTSIDE OF TTSR
         AND TTSR IS JUST THE HOOK."
        "WHY NOT KEEP TTSR EMPTY AND JUST USE IT AS A HOOK. PUSH THE BOOLEAN VAL INTO IT USE IT
         AS A HOOK SURFACE AND RUN ALL THE LEXICON/JEV BASED TTSR IN THE EXTENSION"
        "how is ttsr actually matching the lexicons and not just blind regex matching whatever
         you typed that will never appear in that syntax in a reasoning stream and makes this
         whole theatrical"
      THE MEASURED BASIS: grep -rn "lexicon" src/export/ttsr.ts src/session/ttsr-coordinator.ts
        src/capability/rule.ts -> 0. TTSR matches a FLAT REGEX; it reads NO lexicon. So a design
        where TTSR fired made the lexicon claim DECORATION.
      THE DELIVERY: the condition: key REMOVED from all 9 rules (TTSR registers 0). The extension
        scores -> bands -> gates -> ctx.abort() + pi.sendUserMessage(steer).
      THE "BOOLEAN PUSH": there is no input slot on TTSR's condition matcher (measured: it takes
        two args and the condition is a RegExp). The enforcement ACTION IS the boolean.
      THE ACCEPTED COST: the rewind (replaceMessages) is unavailable to an extension; the operator
        accepted this ("this really isnt that important") in favour of IN-PLACE interruption with
        the violation quoted + the correction injected.

D110  THE CAPABILITY CLAIM MUST BE MEASURED, NOT REASONED. v1 asserted "an extension CANNOT abort
      prose" in a comment. Half-wrong: MessageUpdateEvent has no RESULT type (true), but
      ctx.abort() exists (types.ts:441). Evidence: the 5-hop chain
      types.ts:441 -> runner.ts:859 -> runner.ts:543 -> agent-session.ts:5518 -> :8372.
      THE RULE: before designing around a limit, grep the type surface for an IMPERATIVE API.

D111  THE ENFORCEMENT ACTION IS THE BOOLEAN. TTSR's contract is a bit; the extension's is a score.
      Rather than force a score into a bit-shaped API, the score DECIDES and the ACTION is the bit:
      abort (stop) + inject (correct). One decision-maker.
```
