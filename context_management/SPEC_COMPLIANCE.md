# SPEC_COMPLIANCE

**Spec:** OMP_ENFORCEMENT_KNOWLEDGE/PBK_V3_DPL1_SPEC.md + PBK_V3_WAVE_PLAN.md (WAVES: 6)
**As of:** 2026-09-22 21:38 UTC · **Waves:** W0-W5 COMPLETE · W6 PENDING THE OPERATOR RESTART

## THE WAVE-BY-WAVE COMPLIANCE

```
W0  the INTERFACE (alone)     extensions/lexicon-gate/lib.ts (types)   MET · the frozen marker present
W1  the 9 RULES               rules/*.md (9 new)                       MET · ls -A | wc -l == 9
W2  the EXTENSION             extensions/lexicon-gate/{lib,index,test}.ts  MET · bun test -t source_kind_gate
W3  the DOCTRINE              APPEND_SYSTEM.md + RULES.md              MET · 42 warheads · 11 invariants
W4  the BOUNDARY              AGENTS.md (CREATE)                       MET · 229 L, paths only
W5  INTEGRATION (serial)      config.yml + scripts/                    MET · contextMode == discard
W6  THE LIVE PROOF (serial)   the runtime seat                         PENDING · the operator restart
```

## THE SPEC's OWN LAWS vs THE DELIVERY

```
RIPWIRE FIRST-CLASS         NOT APPLICABLE this wave (no structural edit to an existing codebase;
                            the work is net-new files in ~/.omp/agent)
THE BUILD PACKAGE AUTHORITY MET · the spec + the wave plan + the master blueprint drove every step
THE DERIVED BAND            MET · all 9 derived (0.667 vs 0.000 -> 0.30/0.62), tables in the files
THE SOURCE-KIND GATE FIRST  MET · SCORABLE = {own_utterance}; T2 measures 0 FP / 5-5 control
EVERY SKIP IS NAMED         MET · loadRules THROWS; a Jev failure logs + ledgers with jev:null
THE LEDGER IS THE PRODUCT   MET · ~/.omp/run/lexicon-ledger.jsonl, one row per decision
AUTOMATIC-FAIL              MET · the negative matrix ran for every rule (54/54 silent)
ONE WRITER PER FILE         MET · W0/W2 region-split on lib.ts (the frozen marker)
```

## THE HONEST GAPS

```
T5/T6   PENDING THE OPERATOR RESTART (TTSR binds at session construction)
T4 live BLOCKED (402 billing_error) — the wire shape proven, the separation proven on injected data
T8      NOT RUN (the container round)
```
