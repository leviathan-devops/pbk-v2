# CHECKPOINT_MANIFEST — pbk-v3-abort-layer-9-native-rules

**Sealed:** 2026-09-22 21:42 UTC
**Wave:** PBK v3, THE ABORT LAYER (W0-W5 COMPLETE · W6 pending the operator restart)
**HONEST_CLASS:** `wiring_only` — enforcement wiring onto the native OMP carriers.
**THE TOKEN:** `pbk-v3-abort-layer-9-native-rules` (no spaces)

---

## WHAT IS IN THE SEAL

```
src/                        660 K   the PBK source (the 11 gates + the L1 judge + the middleware)
dist/                       200 K   the built extension
dist-index.js               sha256 7d166b81f658d0d1e48741228910da03
scripts/                    124 K   the project scripts
context_management/         248 K   THE 11 CANON DOCS (updated this wave)
tests/                              the project tests
.abide/                             the abide rubric
package.json · bun.lock · tsconfig.json

BUILD_REPORT.md · DEBUG_LOG.md · FAILURE_LOG.md · SPEC_VIOLATION_LOG.md
TESTING_LOG.md · THEATRICALITY_LOG.md          THE 6 SHIP DOCS

enforcement/                       ★ THE ENFORCEMENT LAYER (lives OUTSIDE the repo)
  rules/                    9 files   the TTSR abort carrier (verbatim copies)
  lexicon-gate/             3 files   index.ts · lib.ts · lib.test.ts
  scripts/dist-content-gate.sh        the F-95 deploy gate
  AGENTS.md                 229 L     the artifact boundary

TOTAL: 2.6 M · 147 files
```

## THE VERIFIED STATE AT THE SEAL

```
omp ttsr list | head -1                TTSR rules (36)
the container round (T8)               5/5 PASS · artifacts/ct-results.json
omp ttsr list | grep -c '[native]'     9          ← THE GOAL'S PRIMARY CONDITION
omp config get ttsr.contextMode        discard
ls -A ~/.omp/agent/rules | wc -l       9
warheads (APPEND_SYSTEM.md)            42
RULES.md numbered                      11
AGENTS.md                              229 L
bun test (lexicon-gate)                4 pass / 0 fail
the matrix (omp ttsr test)             35/35 positives · 0 FP · 54/54 negatives
the deploy gate                        the F-95 shape REJECTED · a good bundle accepted
```

## THE HONEST GAPS (written here, not hidden)

```
★ T5/T6 ON THIS HOST'S OWN SESSION are NOT OBSERVED. TTSR binds at SESSION CONSTRUCTION and the
  extension loads at session start; both were written after this session began. The CONTAINER
  (T8) has observed the firing + the silence on the same artifacts. THE RESUME CONDITION:
  restart the omp TUI, then follow NEXT_STEPS.md's observation protocol.
★ T4's LIVE CALL IS BLOCKED: 402 billing_error — the TypeSafe org has no API credits. The wire
  SHAPE is proven (a structured API response, not a shape error). The SEPARATION is proven on the
  blueprint §7 measured response, LABELED injected.
★ T8 THE CONTAINER ROUND: **PASS** (lg-verify-ct, 5/5 scenarios, artifacts/ct-results.json).
  The round found and forced 5 defects (D-1..D-5), each fixed and retested. The container proves
  the SAME artifacts load into a fresh omp (native 9), BLOCK on the violation, and stay SILENT on
  the legitimate command + the negation.
★ THE AUDIT GATE IS BLOCKED: `ocr scan` failed on 3 lanes (429 rate limit · 403 blacklisted by
  the go-session-proxy firewall · 401 model unsupported). NO sg-ocr artifact was produced.
  Recorded BLOCKED in TESTING_LOG, never upgraded.
★ THE LEDGER (~/.omp/run/lexicon-ledger.jsonl) does not exist yet — it is created on the first
  ARMED decision, i.e. after the restart.
★ THE DOC-DENSITY GATE v2 CLASSIFIER DEFECT is logged (plan -> SPEC, floor 3000) but NOT fixed;
  it is a PBK v3 work item, not part of this wave.
```

## THE REPRODUCTION

```bash
# the enforcement layer (the 9 rules + the extension) is NOT in the repo — it lives in ~/.omp/agent.
# restore from this checkpoint's enforcement/ dir:
cp enforcement/rules/*.md            ~/.omp/agent/rules/
cp -r enforcement/lexicon-gate       ~/.omp/agent/extensions/
cp enforcement/scripts/dist-content-gate.sh ~/.omp/agent/scripts/
cp enforcement/AGENTS.md             ~/.omp/agent/

# then verify
omp ttsr list | grep -c '\[native\]'     # -> 9
bun test ~/.omp/agent/extensions/lexicon-gate/   # -> 4 pass
```

## THE SEAL MODE

```
MANIFEST + FULL TREE COPY (this dir). NO `chattr +i` LOCK was applied — the operator has not
authorized it, and a lock that fights the operator's own sessions is worse than no lock.
The checkpoint is a COPY, not a lock; the live artifacts remain editable at their real paths.
```
