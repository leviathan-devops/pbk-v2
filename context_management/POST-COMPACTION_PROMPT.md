# POST-COMPACTION_PROMPT — READ THIS FIRST

## WHERE YOU ARE

**PBK v3 THE ABORT LAYER.** The lexicon-gate EXTENSION is the enforcement; TTSR is the EMPTY HOOK
(0 native rules). The lexicon scores the prose, the band decides, `ctx.abort()` + `pi.sendUserMessage`
interrupt in place with the violation quoted and the correction injected.

**THE ARCHITECTURE WAS REBUILT (W7)** after the operator's critique that TTSR reads no lexicon —
measured: `grep -rn "lexicon" src/export/ttsr.ts` -> **0**. A design where TTSR fired made the lexicon
claim decoration. TTSR now registers 0 rules.

## THE READ ORDER

```
1  context_management/CURRENT_STATE.md      the one-screen state + the score
2  context_management/NEXT_STEPS.md         the open items + the exact commands
3  context_management/DECISION_CHAIN.md     D101-D111 (D109 is THE architecture change)
4  context_management/EVIDENCE_STATE.md     the proof chain + the honest gaps
5  context_management/BUILD_STATE.md        the SHAs + the module inventory
6  pbk-v2/reports/PBK_V3_ABORT_LAYER_Engineering_Report_v1.md   the dense record (675 L)
7  pbk-v2/reports/Lexicon_TTSR_Integration_ShowMe.md           the wiring (437 L)
```

## THE FACTS A FRESH AGENT MUST NOT RE-DERIVE

```
F1  TTSR IS THE EMPTY HOOK. omp ttsr list | grep -c '[native]' -> 0. The 9 rule FILES exist but
    carry NO condition: key — they are the EXTENSION's lexicon source, not TTSR rules.
F2  AN EXTENSION CANNOT ADD A TTSR RULE. ReadonlySessionManager (session-manager.ts:327-350) is a
    Pick of 20 methods with NO ttsrManager; export/ttsr is not exported; ResourcesDiscoverResult has
    no rulePaths; TtsrTriggeredEvent has no cancel.
F3  AN EXTENSION CAN ABORT PROSE. ctx.abort() (types.ts:441) -> runner.ts:859 -> :543 ->
    agent-session.ts:5518 -> :8372. Every handler gets (event, ctx).
F4  THE BAND IS DERIVED PER RULE. 0.30/0.62 for all 9, from min(pos) 0.6667 > max(neg) 0.0000.
F5  THE use: BANK IS MANDATORY. A rule without one THROWS at load. That is the 27-FP guard.
F6  THE QUOTE CHECK IS PROSE-ONLY. tool_call passes quoteCheck=false (a command is composition).
F7  THE REWIND IS UNAVAILABLE. The extension surface has 0 hits for replaceMessages. Stop + inject,
    never erase.
```

## THE HARD STOPS STILL IN FORCE

```
- NO SECRETS in the repo, the chat, or the ledger rows. Reference the key PATH only.
- THE RIG CAN NEVER BE THE SHIP. A container verdict is evidence, not a ship.
- A DEAD CARRIER IS NAMED (RIPWIRE_MISSING · OPENGROK_DOWN · GI_NO_STORE) — say it, never fall back.
- OPERATOR-OWNED: the omp restart and the deploy.
- NO UNLISTED MODEL.
```

## THE FIRST THREE COMMANDS

```bash
omp ttsr list | grep -c '\[native\]'          # 0    <- TTSR is EMPTY
ls -A ~/.omp/agent/rules/ | wc -l            # 9    <- the lexicon-only rules
cd ~/.omp/agent/extensions/lexicon-gate && bun test .   # 5 pass
```
