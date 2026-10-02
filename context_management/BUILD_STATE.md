# BUILD_STATE — PBK v3 THE ABORT LAYER

**As of:** 2026-09-23 · **Waves:** W0-W7

## THE ARTIFACTS + THEIR SHAs

```
~/.omp/agent/rules/*.md                       9 files · 296 L · NO condition: key
~/.omp/agent/extensions/lexicon-gate/
  lib.ts                                      307 L
  index.ts                                    203 L
  lib.test.ts                                 179 L
  the bundle (built)                          sha256 adc5f90a8a0fafeaf5ae66a4ead5fa05 (12.74 KB)
~/.omp/agent/APPEND_SYSTEM.md                 791 L · 42 warheads
~/.omp/agent/RULES.md                         49 L · 11 invariants
~/.omp/agent/AGENTS.md                        229 L
~/.omp/agent/scripts/dist-content-gate.sh     1073 B · mode 755 · sha 2d836640d4a70ce0
~/.omp/agent/config.yml                       ttsr.contextMode: discard + the lexicon-gate entry
```

## THE BUILD COMMANDS

```
# the extension (a subdirectory package — only index.ts loads)
bun build ~/.omp/agent/extensions/lexicon-gate/index.ts \
  --target=bun --format=esm --outfile=/tmp/lgv2.js

# the registration (TTSR must read 0 native)
omp ttsr list | head -1                      # -> TTSR rules (27)
omp ttsr list | grep -c '\[native\]'          # -> 0

# the suite
cd ~/.omp/agent/extensions/lexicon-gate && bun test .

# the deploy gate
~/.omp/agent/scripts/dist-content-gate.sh <bundle> <symbol> [<symbol>...]
```

## THE BASELINE (before the whole wave)

```
ttsr          27 rules · 0 native · contextMode keep
rules/        0 files
warheads      35 (32 '## WARHEAD' + 3 '## [CRITICAL] WARHEAD')
RULES.md      9 numbered
AGENTS.md     ABSENT
the extension ABSENT
```

## THE DELTA (W0-W5, then W7)

```
W0-W5   ttsr 27 -> 36 rules · native 0 -> 9 · contextMode keep -> discard
        rules/ 0 -> 9 files
        warheads 35 -> 42 · RULES.md 9 -> 11 · AGENTS.md ABSENT -> 229 L
        the extension ABSENT -> 3 files · the deploy gate ABSENT -> 1073 B
W7      ttsr 36 -> 27 rules · native 9 -> 0   ★ THE ARCHITECTURE CHANGE
        the 9 rules lost their condition: key (lexicon-only)
        the extension gained ctx.abort() + the inject
```

## THE ENVIRONMENT FACTS (load-bearing, measured)

```
bun           1.4.2 (Bun.YAML.parse is available — no yaml dependency)
the Jev SDK   @typesafe-ai/sdk@0.6.0 resolves from ~/.omp/agent but NOT from
              extensions/lexicon-gate/ -> the wire is a raw fetch to /v1/systemone
the key       ~/.config/typesafe/key (107 B) + ~/.abide/.env (TYPESAFE_AI_API_KEY)
              the SDK reads TYPESAFE_API_KEY (a DIFFERENT name) -> always pass apiKey explicitly
the guard     omp-ct-ext-guard.timer re-adds the omp-ct/dist.js config line every 2 min;
              it NEVER touches the ttsr: block (verified by reading the guard script)
the engine    TTSR binds at SESSION CONSTRUCTION (sdk.ts:1530-1547) -> a restart arms a new rule
              an extension CANNOT add a TTSR rule (ReadonlySessionManager has no ttsrManager)
              an extension CAN abort prose (ctx.abort(), types.ts:441)
```

## THE FROZEN LIST (do not touch)

```
~/.omp/agent/rules/*.md          the lexicon carrier — edit ONLY via the derivation + the matrix
the FROZEN marker in lib.ts      the W0/W2 region split
~/.omp/agent/config.yml          the ttsr: block (the guard watches the extensions array only)
```

---

## THE SHA CHAIN

```
the bundle (built, host)      adc5f90a8a0fafeaf5ae66a4ead5fa05   12.74 KB
the bundle (deployed, ct)     adc5f90a8a0fafeaf5ae66a4ead5fa05   MATCH
the previous bundle           c379626c3d051f61b9fb10c15d0c0ef3   (the TTSR-carrier build)
the first bundle              1a99a103c1daa6b87b3645e3b33bcc0e   (the W2 build)
the dist-content gate         2d836640d4a70ce0                   (the F-95 gate)
lib.ts (host)                 228d2fc1e06dc0ee                   (pre-W7)
```

## THE MODULE INVENTORY

```
┌────────────────────────────────┬────────┬──────────────────────────────────────┐
│ FILE                           │ LINES  │ WHAT IT IS                           │
├────────────────────────────────┼────────┼──────────────────────────────────────┤
│ extensions/lexicon-gate/lib.ts │ 307    │ the frozen interface + the pure fns  │
│ extensions/lexicon-gate/index.ts│ 203   │ the 6 hooks (the enforcement)        │
│ extensions/lexicon-gate/lib.test.ts│ 179│ the 5 selectors                      │
│ rules/dist-not-built.md        │ 30     │ the lexicon + the correction body    │
│ rules/theatrical-verification.md│ 37    │ "                                    │
│ rules/scope-shrink.md          │ 31     │ "                                    │
│ rules/fallback-slop.md         │ 30     │ "                                    │
│ rules/phantom-and-claim.md     │ 31     │ "                                    │
│ rules/instruction-not-predicate.md│ 32  │ "                                    │
│ rules/unwired-edge.md          │ 31     │ "                                    │
│ rules/stale-substrate.md       │ 29     │ "                                    │
│ rules/record-anchor.md         │ 31     │ "                                    │
│ scripts/dist-content-gate.sh   │ 31     │ the F-95 deploy gate                 │
│ AGENTS.md                      │ 229    │ the terrain                          │
└────────────────────────────────┴────────┴──────────────────────────────────────┘
```

## THE REBUILD RECIPE (a fresh agent, zero context)

```
1  the rules      restore from the checkpoint's enforcement/rules/ (9 files)
2  the extension  restore from enforcement/lexicon-gate/ ; bun build index.ts
3  the doctrine   the warheads + the invariants are in the checkpoint's enforcement/
4  verify         omp ttsr list | grep -c '[native]'  -> 0
                  bun test ~/.omp/agent/extensions/lexicon-gate/  -> 5 pass
                  the harness: 2 positives abort + inject, 3 negatives silent
5  restart omp    TTSR binds at construction; the extension loads at session start
```
