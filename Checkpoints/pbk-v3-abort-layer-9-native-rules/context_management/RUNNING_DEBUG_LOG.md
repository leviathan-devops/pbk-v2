# RUNNING_DEBUG_LOG

## 2026-09-19 — Janitor process
- Symptom: Graph_Intelligence/node_modules wiped 3x, OMP_WORKSPACE symlink removed
- Impact: trident-omp build fails (xstate unresolvable)
- Suspect: unidentified (cron, systemd timer, or another session's cleanup)
- Workaround: cd GI && bun install (works, gets re-wiped)
- Status: OPEN

## 2026-09-19 — Chain test drift
- 2 tests in firewall.test.ts fail on chain semantics
- Both files date to Sep 9 git snapshot, silently diverged
- Fix: read chain.ts as truth, update 2 assertions
- Status: QUEUED

## 2026-09-19 — RPC battery missing image
- 4 tests expect trident-omp-master image, only pbk:master/mimo-ct:master exist
- Fix: retarget to pbk:master (spec §9.3 default)
- Status: QUEUED

## 2026-09-19 06:50 — Janitor wipe #4 (during terminal verification)
- Symptom: GI node_modules/xstate wiped again mid-verification; build RED
- Protocol per goal HARD STOP: bun install → rebuild → redeploy → this entry
- Build recovered: 528 modules, dist redeployed

## 2026-09-19 07:20 — session note: ST script authoring took 3 repair cycles
- Lesson: line-anchored edits on a freshly written 200-line file drifted repeatedly (stale anchors) — repaired via read-then-cut, final state verified by execution (17/17, exit 0)
- No production code touched; script-only

## 2026-09-19 07:35 — Janitor hunt (W0 residual): 5 surfaces CLEARED, tripwire armed
- Cleared (grep/journal evidence): cron pin-agents.sh (CPU pinning only), cron tdai-health-check, systemd opencode-container-cleanup (docker-only, journal-verified 00:00 run touched nothing but containers), jgm-daemon (observe-only; plan-clean.ts is a ZERO-mutation dry-run preview), mimocode-git-snapshot.sh (no rm ops), manager-machine atomic.ts (tmp-write safety only)
- Negative sweep: NO script in ~/.local/bin, OPENCODE_WORKSPACE/scripts, systemd user units references OMP_WORKSPACE or Graph_Intelligence/node_modules
- Remaining suspect class: live interactive agent sessions (e.g. AO scratch-2 grok worker, auto-permission, up since 02:45) running ad-hoc cleanup — unproven
- ACTION: janitor-tripwire hub process ARMED (persistent, 60s poll on GI node_modules/xstate) — logs transition timestamps + processes whose cwd sits under Shared_Workspace at the moment of the wipe to .janitor-watch/janitor.log
- Resume condition: read .janitor-watch/janitor.log after the next wipe → identify PID/command → operator decides kill vs reconfigure

## 2026-09-19 06:22 — Tripwire SELF-TEST passed (instrumentation proven)
- Simulated wipe (mv xstate away): detected in 17s, TRANSITION logged with timestamp + full Shared_Workspace cwd process capture
- Restored: xstate back, deps PRESENT, suite re-verified 186/0fail
- Note: capture lists ALL Shared_Workspace-cwd processes at transition (~90 live: many omp sessions, MCP servers, AO) — a real wipe's culprit needs correlation, but the moment + surface are now mechanically recorded

## [2026-09-22 21:38 UTC] EN: THE CORPUS §3.6 REGEX HAS UNBALANCED PARENS — the rule would never have fired

FINDING: `\b(add a (check|warning|reminder|note|comment) (that|to)\b` — one unclosed group.
ROOT CAUSE: the corpus wrote `(that|to)\b` where `(that|to))\b` was meant. The paren that opens
`(that|to)` is never closed.
IMPACT: `new RegExp(pattern)` THROWS at compile. TTSR's loader catches and SILENTLY DROPS the rule
(upstream #4796 — the exact class the corpus itself documents). The rule would appear in NO list
and would never fire; nothing would report it.
FIX: `\b(add a (check|warning|reminder|note|comment) (that|to))\b`.
VERIFICATION: the compile check now runs every pattern of every rule at LOAD (loadRules throws);
`omp ttsr list | grep -c '[native]'` reads 9 (a dropped rule would read 8).
LESSON: a corpus regex is DATA, not code — it must be COMPILED as part of the derivation, never
copied on trust. The compile check belongs in `loadRules`, not in a review.

## [2026-09-22 21:38 UTC] EN: THE NEGATION FIRED — "the build is NOT done" tripped the rule

FINDING: `dist-not-built` arm 1 fired on the negation (negative #5 of the corpus §4.1 set).
ROOT CAUSE: `[^.]{0,40}` matches ANY 40 chars including "NOT"; the completion predicate then
matched downstream of it. The bound is a sentence barrier, not a negation barrier.
FIX: a TEMPERED negation — `(?:(?!\b(?:not|isn.?t|never|no)\b)[^.]){0,40}` — every char between
the noun and the completion must not START a negation.
FOLLOW-ON: substituting the tempered form DROPPED the arm's `(?i)` prefix, so the guard was
case-sensitive and uppercase "NOT" slipped through (caught by the matrix as 1 FP). The prefix was
restored.
LESSON: a lookahead is not a negation guard; a tempered char class is. And a substitution that
rewrites a regex must carry the original's flags.

## [2026-09-22 21:38 UTC] EN: THE DOC-DENSITY GATE v2 CLASSIFIED A PLAN AS A SPEC

FINDING: a `write` of `pbk-v3-abort-layer-plan.md` (346 L) was BLOCKED:
`SPEC finalize under-specified: 346 lines (min 3000 — the SPEC floor)`.
ROOT CAUSE: `classifyDocType` — `if (/spec|dpl1|plan\b/.test(lower)) return "SPEC";`
(doc-density-gate-v2.ts:81). ANY `*-plan.md` is a SPEC, floor 3000. The file is a plan, not a spec.
SECOND INSTANCE: `/spec|plan|post-compaction/` at line 70 — `POST-COMPACTION_PROMPT.md` -> SPEC.
FIX (a PBK v3 work item): split the SPEC arm; `plan` -> OVERVIEW (300) or a new PLAN class.
LESSON: a filename-token classifier over-fires. The class detection is a DETECTOR; the FLOOR is
the decision. A detector that maps two artifact classes to one floor is a gate that blocks the
operator's real work.

## [2026-09-22 22:15 UTC] EN: THE tool_result HOOK SCORED TOOL OUTPUT AS THE AGENT'S OWN UTTERANCE

FINDING: the container's first run wrote 3 spurious rows - one on a RULE FILE'S OWN BODY
(confidence 0.2857). The rule text was being scored as the agent's assertion.
ROOT CAUSE: the `tool_result` hook called `decide(text, "", false)` with an EMPTY fileKind, so
`classifySource` fell through to `own_utterance`. Tool output is material the agent is READING.
FIX: pass the material kind `doc`. `classifySource` then returns `doc` for any non-heading line
-> non-scorable.
VERIFICATION: the suite's `quoted_match_gate` asserts `tool output classified: doc`.
LESSON: a hook that reads a tool RESULT is reading MATERIAL, never the agent's voice.

## [2026-09-22 22:15 UTC] EN: THE QUOTE FIX OVER-APPLIED AND SILENTLY DISABLED THE BLOCK (D-3)

FINDING: after adding the quotation check, the S1 tool_call was classified `quotation` and
STOPPED BLOCKING. The ledger row read `"source_kind":"quotation"` for the echo command.
ROOT CAUSE: the check was applied to ALL paths. A tool_call's args are the agent's own
COMPOSITION - `echo "the build is done"` is a command the agent WROTE, and the quotes are shell
syntax, not a quotation of someone else's material.
FIX: the quote check is PROSE-ONLY (`decide(..., quoteCheck=false)` for the tool_call path).
VERIFICATION: the container re-run - S1 BLOCKED again (the tool result IS the gate message).
LESSON: THE WORST CLASS - a fix that breaks the primary function while every unit test stays
green. Only the ROUND caught it. A unit test asserts a function's contract; only the live run
asserts the SYSTEM's behaviour.

## [2026-09-22 22:15 UTC] EN: THE PROSE DENIAL FIRED - the negation PRECEDES the noun

FINDING: `I have NOT claimed any build is complete.` fired dist-not-built.
ROOT CAUSE: the tempered guard examines only the span BETWEEN the noun and the completion. Here
the negation sits BEFORE the noun, so the guard never sees it.
FIX: a fixed-width denial lookbehind on the condition arm + the lexicon suggestive bank. NOTE:
this is a VARIABLE-LENGTH lookbehind - V8/Bun supports it, Python's `re` does not, so the
Python-side verifiers report it as broken while the REAL engine compiles it
(`omp ttsr list | grep -c '[native]'` reads 9).
VERIFICATION: `omp ttsr test "I have NOT claimed any build is complete."` -> No rules triggered.
LESSON: a negation guard must consider both sides of the noun. Verify a regex with the ENGINE
that will run it, never with a different implementation.

## [2026-09-22 22:15 UTC] EN: loadRules THREW ON A RAW (?i) LEXICON REGEX (D-5)

FINDING: after the D-4 fix added the `(?i)`-prefixed arm to the lexicon `suggestive` bank, the
suite failed at `loadRules` - the whole extension would fail to load.
ROOT CAUSE: `loadRules` validated with `new RegExp(p, "i")` on the RAW pattern. JS `RegExp`
REJECTS a leading `(?i)` group. The engine side already handles this (`compileRuleCondition`,
capability/rule.ts:257-264) but the lexicon side did not.
FIX: `stripInlineFlags` + `compileLexiconPattern`, used by loadRules AND scoreSignals.
VERIFICATION: the suite 5/5.
LESSON: the same trap exists on BOTH sides of the dual-carrier rule.
