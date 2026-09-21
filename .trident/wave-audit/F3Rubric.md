# wave F3Rubric audit — 2026-09-21T05:12

## hunks
| file:line | WHAT (verified on disk?) | WHY (holds against the spec?) | VERDICT |
|---|---|---|---|
| `scripts/compile-rubric.sh` (38L) | EXISTS, 38L as claimed | the regenerator entry point | **CORRECT** |
| `scripts/compile-rubric.mjs` (460L) | EXISTS, 460L as claimed | the compiler: sources + the rule table | **CORRECT** |
| `.abide/rubric.json` (1398L) | EXISTS (restored, see the incident) | the upstream schema: version, compiledAt, sources, thresholds, rules | **CORRECT** |

## mechanical re-run (MY runs)
```
npx -y @coldtea/abide@latest rubric validate   -> exit 0; its table lists rules by bucket
python3 json.load(.abide/rubric.json)          -> dict keys [version, compiledAt, compiledBy, sources, thresholds, rules]
CTX-01 occurrences:         0   (the exclusion holds)
VERIFY_INSPECT occurrences: 0   (the exclusion holds)
thresholds:                 present (act 0.8 / flag 0.5)
bucket census (measured):   {"model": 31, "lint": 43, "unenforceable": 5, "deferred": 1}
```

## INCIDENT — cross-front deletion (measured, not inferred)
`git status` in the fork showed ` D .abide/rubric.json` (deleted, unstaged) AFTER I had measured it at
1398 lines. F3 had committed it into the fork's own `git init` repo (`8c6cae23`, 04:54:24), so the file
was recoverable — restored with `git checkout -- .abide/rubric.json` and re-validated (exit 0).
Cause: another front's cleanup removed a file it did not own. CLASS: cross-front spillover (AP19's
cousin) — a cleanup is an EDIT like any other and needs the same ownership discipline.

## the structural side effect (needs a decision)
F3 ran `git init` in the fork to anchor abide's repo-root discovery. The parent repo now sees
`omp-ct-v2/` as a NESTED repository. Keep it (the fork as its own repo) or remove it (track in the
parent) — an explicit decision, recorded, not a side effect left standing.

## verdicts
all three files — **CORRECT** (the rubric's disappearance was not the front's error alone; it is the
cross-front class). The gate numbers reproduce.

## what ships
F3's three files are accepted. Two flags: the nested `.git`, and the cross-front cleanup hazard.
