# KERNEL DEFECT EVIDENCE — the lexical use/mention blindness (pre-Abide baseline)

Captured 2026-09-20, live, while documenting the six TTSR kernels at ~/.agent/rules/.
This is the mechanical evidence base for the intelligence upgrade. Every claim below has its
probe or its interrupt attached; nothing here is inferred.

## THE SIX KERNELS (as they exist at capture)

| kernel | scope | detector | body |
|---|---|---|---|
| anti-scope-shrink | text, thinking | 1 regex (4 alternatives) | 1 line |
| anti-theatrical | text, thinking | 1 regex (4 alternatives) | 2 lines |
| basic-logic-check | thinking | 1 regex (4 alternatives) | 1 line |
| graph-before-structural-edit | tool:edit, tool:write | 2 literals | 2 lines |
| red-team-default | text, thinking | 1 regex (3 alternatives) | 2 lines |
| verification-before-declaration | text, thinking | 1 regex (5 alternatives) | 1 line |

Total: 61 lines across 6 files. Every detector is LEXICAL: it matches a token, not an act.
Each is `repeatMode: once`, `contextMode: discard`.

## PROBE 1 — MENTION FIRES THE RULE (use/mention blindness) — CONFIRMED

`omp ttsr test` on the verification kernel:

```
$ omp ttsr test "the task is done" --source text -r ~/.agent/rules/verification-before-declaration.md
Triggered (1)
  check verification-before-declaration  condition: /\b(?:done|complete|fixed|verified|it works)\b/
```

## PROBE 2 — NEGATION/POLARITY IS INVISIBLE — CONFIRMED

```
$ omp ttsr test "the manifest records what is not verified" --source text -r <same rule>
Triggered (1)      <- fires on a GAP RECORD that says the opposite
```

## PROBE 3 — a substring that does NOT fire (the boundary is accidental)

```
$ omp ttsr test "### bg_25 [bash] - completed" --source text -r <same rule>
No rules triggered. (evaluated 1)     <- \bcomplete\b does not match "completed"
```

So the kernel is not even catching the past-tense form: it fires on the word in the wrong
context and misses it in the right one. The match is incidental, not semantic.

## PROBE 4 — QUOTING A KERNEL'S OWN PATTERN FIRES THREE KERNELS AT ONCE — CONFIRMED

A report documenting the detectors was interrupted mid-message by three kernels simultaneously
(`anti-scope-shrink`, `anti-theatrical`, `red-team-default`), because the documentation quoted
each kernel's trigger alternatives verbatim — including the fragments "too complex",
"I'll skip the test", and "happy path". The agent was DOCUMENTING the rules, not committing the acts.

## THE MECHANISM, STATED ONCE

```
┌──────────────────────────────────────────────────────────────┐
│ token in stream  ──►  regex match  ──►  interrupt            │
│                                              │               │
│   no polarity test       (is the act negated or affirmed?)   │
│   no use/mention test    (performed, or quoted/reported?)    │
│   no speaker-role test   (agent asserting, or user asking?)  │
│   no evidence-state test (claim true, false, or uncheckable?)│
│   no repeat/trend test   (first offence or a standing habit?)│
└──────────────────────────────────────────────────────────────┘
```

## WHAT THE UPGRADE MUST DECIDE (the design target)

1. POLARITY — affirm vs deny vs instruct.
2. USE vs MENTION — performed vs quoted/documented/analyzed.
3. ROLE — agent assertion vs user text vs tool output vs doc content.
4. EVIDENCE STATE — does the session already hold the run that proves this claim?
5. TREND — one slip vs a pattern (feeds escalation rather than a bare interrupt).

## HONEST GAPS

- Probes 1-3 ran through `omp ttsr test` (the CLIs detector path). Probe 4 is an observed live
  interrupt set, captured from the session, not a CLI reproduction.
- Only the verification kernel was probed directly; the other five share the mechanism
  (1 lexical regex + a canned body) but were not each probed.
- No measurement yet of false-positive RATE in live sessions — probes establish the class, not the frequency.
