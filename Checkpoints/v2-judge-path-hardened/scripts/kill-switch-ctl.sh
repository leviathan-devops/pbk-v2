#!/usr/bin/env bash
# kill-switch-ctl.sh — RETIRED by the v6 verbatim port (spec OMP_CT_STTGF_VERBATIM_PORT).
#
# v6 production HAS NO kill-switch (PWM grep: 0 hits for any *_DISABLED env;
# FIREWALL_CONFIG is enabled:true at semantic-smoke-firewall.ts:463). The
# former disable envs were a port invention, now REMOVED from every gate
# (spec §4 delete list, criterion: grep == 0).
#
# This script is kept as a tombstone so old runbooks fail LOUD, not silent:
# any arm/disarm/status invocation exits non-zero with the explanation.
set -u
ACTION="${1:-status}"
echo "RETIRED: the v6 verbatim port removed all kill-switches." >&2
echo "Gates are unconditional (v6 posture). Action '$ACTION' is a no-op." >&2
exit 3
