#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# compile-rubric.sh — Compiles our rules into the upstream Abide rubric schema
#
# Sources:
#   1. ~/.omp/agent/identity/trident/WARHEADS.md           (22 warhead laws)
#   2. ~/.agent/rules.parked-20260920/*.md                  (6 parked kernels)
#   3. src/firewalls/smoke-lexicon.ts                       (claim-detection families)
#   4. src/firewalls/memory-read-lexicon.ts                 (RAM_BOMB/OUTPUT_BOMB/BUNDLE_EXEC)
#   5. src/firewalls/dispatch-input-lexicon.ts              (PATH/PROMPT/MIXED)
#   6. src/firewalls/ct-anti-derailment.ts                  (CTX-02..CTX-08)
#   7. src/firewalls/surgical-mutator.ts                    (fail-path markers)
#   8. src/firewalls/evidence-tracker.ts                    (verdict states)
#
# Bucket discipline (the cost law):
#   lint          — deterministic; linter decides exactly; 0 cost
#   model         — semantic acts requiring Jev judgment
#   deferred      — needs surrounding context to judge
#   unenforceable — cannot be judged mechanically / about process
#
# Exclusions (measured, do not inherit):
#   CTX-01        — disabled as broken (2026-08-14)
#   VERIFY_INSPECT — 209/325 blocks were false positives; disabled
###############################################################################

FORK_DIR="/home/leviathan/JARVIS_WORKSPACE/OMP/pbk-v2"
OUT_DIR="${FORK_DIR}/.abide"
OUT_FILE="${OUT_DIR}/rubric.json"

mkdir -p "${OUT_DIR}"

# Delegate to the compiled Node module
node "${FORK_DIR}/scripts/compile-rubric.mjs"

echo ""
echo "=== Compiled rubric at ${OUT_FILE} ==="
