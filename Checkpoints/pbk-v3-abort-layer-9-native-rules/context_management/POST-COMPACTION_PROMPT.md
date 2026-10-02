# POST-COMPACTION_PROMPT — read this FIRST

## WHERE YOU ARE

The PBK v3 ABORT LAYER is LANDED (waves W0-W5 complete). The abort carrier is ON:
`omp ttsr list | grep -c '[native]'` -> 9 (was 0). The one open item is the OPERATOR RESTART
(TTSR binds at session construction; the extension loads at session start).

## THE READ ORDER

```
1  context_management/CURRENT_STATE.md      the one-screen state
2  context_management/NEXT_STEPS.md         the open item + the exact restart + the protocol
3  context_management/EVIDENCE_STATE.md     the proof chain + the honest gaps
4  context_management/DECISION_CHAIN.md     the 8 decisions (D101-D108)
5  context_management/BUILD_STATE.md        the artifacts + the commands
```

## THE FIVE FACTS A FRESH AGENT MUST NOT RE-DERIVE

```
F1  THE CARRIER SPLIT. TTSR owns the PROSE abort. An extension CANNOT abort prose
    (message_update has no result type) and CANNOT cancel a TTSR trigger (notification-only).
    The extension owns tool_call (block) + tool_result (repair).
F2  THE RULE CARRIES BOTH CARRIERS. `condition:` (TTSR) + `lexicon:`/`band:` (the extension).
    The engine drops the extra keys at parse, so the extension reads the rule FILES from disk.
F3  THE BAND IS DERIVED PER RULE. 0.30/0.62 for all 9, from min(positive) 0.667 > max(negative) 0.000.
    Never inherit a band — it is fabricated if you do.
F4  THE `use:` BANK IS MANDATORY. A rule without one throws at load. That is the 27-FP guard.
F5  THE RESTART IS OPERATOR-OWNED. State the command; never run it silently.
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
omp ttsr list | head -1                  # TTSR rules (36)?
omp ttsr list | grep -c '\[native\]'     # 9?
omp config get ttsr.contextMode          # discard?
```
