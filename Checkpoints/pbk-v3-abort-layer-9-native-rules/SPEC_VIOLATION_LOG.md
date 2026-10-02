# SPEC_VIOLATION_LOG — PBK v3, THE ABORT LAYER

**The spec-section mapping.** Every deviation from the DPL1 spec, with its section + the reason.
**As of:** 2026-09-22 21:41 UTC

---

## V-1 · THE EXTENSION IS A SUBDIRECTORY, NOT `extensions/lexicon-gate.ts`

**THE SPEC SAID** (W0/W2): `extensions/lexicon-gate.ts`.
**THE DELIVERY IS:** `extensions/lexicon-gate/{index.ts, lib.ts, lib.test.ts}`.

**THE REASON (measured, loader.ts:562).** A `*.ts` directly inside `extensions/` IS LOADED AS AN
EXTENSION. A `lib.test.ts` placed there would execute as an extension on every session start. The
subdirectory form loads ONLY `index.ts` — the test file is inert.

**THE VERDICT.** A CORRECTION to the spec, not a violation. The spec's own W0/W2 region-split
(the `FROZEN INTERFACE` marker) is preserved inside `lib.ts`.

---

## V-2 · THE JEV WIRE IS A RAW FETCH, NOT THE `@typesafe-ai/sdk`

**THE SPEC SAID** (Step 4): `createTypeSafeAi({apiKey}).evaluationModel("jev-latest")` /
`@typesafe-ai/sdk`.
**THE DELIVERY IS:** a raw `POST https://api.typesafe.ai/v1/systemone` with the SDK's own body shape,
SDK-as-fast-path when it resolves.

**THE REASON (measured).** `@typesafe-ai/sdk` resolves from `~/.omp/agent` but NOT from
`extensions/lexicon-gate/`. The spec assumed a resolution that does not hold at the extension's own
path. (DEBUG_LOG EN-4.)

**THE VERDICT.** A CORRECTION forced by measurement. The wire CONTRACT is unchanged — same path,
same body, same response field (`answers.where.probabilities`).

---

## V-3 · THE `lexicon:` BLOCK IS READ FROM DISK, NOT FROM THE RESOLVED RULE

**THE SPEC SAID** (Step 2/3): the rule carries `condition:` + `lexicon:`; the extension scores the
lexicon.
**THE DELIVERY IS:** the same, BUT the extension parses the rule FILES itself.

**THE REASON (measured, rule.ts:208-238).** `parseRuleConditionAndScope` returns only
`{condition, astCondition, scope}`. The `lexicon:` key is ACCEPTED by the frontmatter type but
DROPPED at parse — it never reaches the resolved `Rule`. Reading `getActiveRules()` would score
nothing.

**THE VERDICT.** A CORRECTION the spec did not anticipate. The delivery is strictly more correct:
it reads the same file the engine reads, minus the engine's lossy projection.

---

## V-4 · THE BAND IS 0.30/0.62, NOT THE REFERENCE 0.55/0.70

**THE SPEC SAID** (Step 2): the measured reference band is 0.55/0.70.
**THE DELIVERY IS:** 0.30/0.62 for all 9 rules.

**THE REASON.** The spec's own law: "THE DERIVED BAND. Every rule's `band` comes from ITS OWN sweep.
An inherited band is fabricated." The sweep produced min(positive)=0.667, max(negative)=0.000 for
every rule → `low = 0 + 0.05` floored at 0.30, `high = 0.667 - 0.05 = 0.617 ≈ 0.62`.

**THE VERDICT.** COMPLIANCE with the spec's law, over the spec's illustrative number. The 0.55/0.70
was the REFERENCE measurement on a different corpus; this corpus derives its own.

---

## V-5 · T5/T6 (THE LIVE PROOF) ARE NOT YET OBSERVED

**THE SPEC SAID** (Step 7): restart, then observe a MECHANICAL firing + a SILENT case.
**THE STATE IS:** the restart has not happened (this session predates the artifacts).

**THE REASON.** TTSR binds at SESSION CONSTRUCTION; the extension loads at session start. The
headless route is CLOSED (the STTGF gate blocks `omp -p`). The restart is operator-owned per the
pin's HARD STOPS.

**THE VERDICT.** PENDING, not violated. The exact command + the observation protocol are in
NEXT_STEPS.md.
