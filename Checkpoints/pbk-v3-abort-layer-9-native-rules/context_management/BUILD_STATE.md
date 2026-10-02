# BUILD_STATE

**As of:** 2026-09-23 · **Wave:** PBK v3 W0-W5

## THE ARTIFACTS

```
~/.omp/agent/rules/*.md                       9 files · the TTSR abort carrier
~/.omp/agent/extensions/lexicon-gate/         index.ts 6.1K · lib.ts 10.0K · lib.test.ts 7.4K
~/.omp/agent/APPEND_SYSTEM.md                 42 warheads
~/.omp/agent/RULES.md                         11 invariants
~/.omp/agent/AGENTS.md                        229 L
~/.omp/agent/scripts/dist-content-gate.sh     1.1K · mode 755
~/.omp/agent/config.yml                       ttsr.contextMode: discard
```

## THE BUILD COMMANDS

```
# the extension (a subdirectory package — only index.ts loads)
bun build ~/.omp/agent/extensions/lexicon-gate/index.ts --target=bun --outfile=/tmp/lg.js

# the rules (verified by the engine itself, not by a source read)
omp ttsr list | grep -c '\[native\]'          # -> 9
omp ttsr list | head -1                          # -> TTSR rules (36)

# the suite
bun test ~/.omp/agent/extensions/lexicon-gate/

# the deploy gate
~/.omp/agent/scripts/dist-content-gate.sh <bundle> <symbol> [<symbol>...]
```

## THE BASELINE (before this wave)

```
ttsr          27 rules · 0 native · contextMode keep
rules/        0 files
warheads      35 (32 '## WARHEAD' + 3 '## [CRITICAL] WARHEAD')
RULES.md      9 numbered
AGENTS.md     ABSENT
```

## THE DELTA

```
ttsr          27 -> 36 rules · 0 -> 9 native · contextMode keep -> discard
rules/        0 -> 9 files
warheads      35 -> 42
RULES.md      9 -> 11
AGENTS.md     ABSENT -> 229 L
```

## THE ENVIRONMENT FACTS (load-bearing, measured)

```
bun           1.4.2 (Bun.YAML.parse is available — no yaml dependency needed)
the Jev SDK   @typesafe-ai/sdk@0.6.0 is in the bun cache but does NOT resolve from the
              lexicon-gate/ subdirectory -> the wire is a raw fetch to /v1/systemone
the key       ~/.config/typesafe/key (107 B) + ~/.abide/.env (TYPESAFE_AI_API_KEY)
the guard     omp-ct-ext-guard.timer re-adds the omp-ct/dist.js config line every 2 min;
              it NEVER touches the ttsr: block (verified by reading the guard script)
```
