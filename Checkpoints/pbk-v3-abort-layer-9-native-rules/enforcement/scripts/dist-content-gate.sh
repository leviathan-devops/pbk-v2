#!/usr/bin/env bash
# dist-content-gate.sh — the deploy gate.
#
# WHY: F-95. A session rebuilt an extension and deployed a bundle containing ZERO of the
# symbols the build added. The artifact was sha-perfect, every file-level check passed, and
# the runtime ran the old code. This gate greps the BUNDLE for the symbols the build claims.
#
# USAGE:  dist-content-gate.sh <bundle> <symbol> [<symbol>...]
# EXIT:   0 = every symbol present;  1 = at least one absent (UNBUILT);  2 = usage
set -uo pipefail

[ "$#" -ge 2 ] || { echo "usage: $0 <bundle> <symbol> [<symbol>...]" >&2; exit 2; }
bundle="$1"; shift
[ -f "$bundle" ] || { echo "REJECT: bundle absent: $bundle" >&2; exit 1; }

missing=0
for sym in "$@"; do
  if grep -qF -- "$sym" "$bundle"; then
    printf '  OK      %s\n' "$sym"
  else
    printf '  REJECT  %s absent — UNBUILT\n' "$sym" >&2
    missing=$((missing + 1))
  fi
done

if [ "$missing" -gt 0 ]; then
  echo "REJECT: $missing of $# symbols absent from $bundle" >&2
  exit 1
fi
echo "OK: all $# symbols present in $bundle ($(stat -c%s "$bundle") B)"
