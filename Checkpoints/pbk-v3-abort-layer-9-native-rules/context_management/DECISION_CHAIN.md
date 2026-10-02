# DECISION_CHAIN

## [2026-09-23] — PBK v3, THE ABORT LAYER

```
D101  THE CARRIER SPLIT IS MEASURED, NOT ASSUMED. An extension CANNOT abort prose
      (MessageUpdateEvent carries no result type) and CANNOT cancel a TTSR trigger
      (TtsrTriggeredEvent is notification-only). Therefore TTSR owns the prose abort and
      the extension owns the tool channels (tool_call block, tool_result repair).
      Evidence: types.ts:708-712 · shared-events.ts:274-277,295-330.
D102  THE RULE CARRIES BOTH CARRIERS. One frontmatter block holds `condition:` (what TTSR
      tests) AND `lexicon:`/`band:` (what the extension scores). The engine IGNORES the extra
      keys, so the extension reads the rule FILES from disk — never `getActiveRules()`, which
      drops them at parse (capability/rule.ts:208-238).
D103  THE BAND IS DERIVED PER RULE, never inherited. Sweep the rule's own positives against the
      corpus §4.1 negative set; pick the band where min(positive) > max(negative).
      The measured result: every rule 0.667 vs 0.000 -> band 0.30/0.62.
D104  THE `use:` BANK IS MANDATORY. A rule without one THROWS at load. The 27-FP class cannot
      return through a missing exemptor.
D105  THE SOURCE-KIND GATE RUNS FIRST AND COSTS $0. SCORABLE = {own_utterance} only.
      A heading, a table row, a quoted bullet, a blockquote and a fence are non-scorable.
D106  THE JEV WIRE IS DEPENDENCY-FREE. @typesafe-ai/sdk does not resolve from the
      lexicon-gate/ subdirectory, so judgeSpans POSTs to /v1/systemone directly (the SDK's own
      path + body, read from its dist). The SDK is a fast path when it happens to resolve.
D107  THE EXTENSION IS A SUBDIRECTORY PACKAGE. A `*.test.ts` placed directly in extensions/
      would be LOADED AS AN EXTENSION (loader.ts:562). The package is extensions/lexicon-gate/
      with index.ts as the only entry.
D108  THE RESTART IS OPERATOR-OWNED. TTSR binds at session construction; the deploy and the
      restart are the operator's per the pin's HARD STOPS. State the command, never run it silently.
```
