# GUARDRAIL_SPEC — the mechanical laws (not advice)

> every guardrail names the command that ENFORCES it and the exit code that FAILS the build
> ★ THE TEST OF A GUARDRAIL: does it exit NONZERO when the property is violated? If not, it is a wish.

## G-0 · THE REACHABILITY LAW (the one that would have caught the whole build)
```
A COMPONENT IS VALID IFF consumers >= 1 AND decisionsInfluenced >= 1.
ELSE  →  UNREACHABLE_<name>   exit 1
```
ENFORCED BY: `grep -rl "<name>" src/ | grep -v "<name>.ts" | wc -l` — must be ≥ 1
**THE INSTANCE:** `evidenceMachine` · `ClaimGate` · `workflowMachine` · `mpse-discharge` — all four
have tests, all four have **zero callers**. The build shipped a tested library and called it a system.

## G-1 · THE DOC-CURRENTNESS LAW
```
FOR each claim in a ship doc that names a COUNT or a STATE:
  the tree must satisfy it, and the count must equal the tree's count.
ELSE → DOC_STALE_CLAIM  exit 1
```
ENFORCED BY: a claims table in CI; the 4 contradicted claims are the seed set
**THE INSTANCE:** "9 files, NO `condition:` key" (9/9 have one) · "TTSR rules (27)" (none registered)
· "abort carrier: wire, not throw" (0/11 gates abort) · "the kernel is pure" (929 judge lines)

## G-2 · THE DOC:RATIO CEILING
```
docs_lines / code_lines <= 0.30
ELSE → DOC_MASS  exit 1
```
ENFORCED BY: `cat **/*.md | wc -l` vs `find src -name '*.ts' | xargs wc -l`
**THE INSTANCE: 0.54 — nearly 2× the ceiling, on a build that fired zero times.**

## G-3 · THE CALL-IS-NOT-THE-ANSWER LAW
```
A recorded decision counts ONLY if its judgment field is non-null.
decisions_resolved / decisions_recorded >= 0.95
ELSE → RITUAL_ONLY  exit 1
```
ENFORCED BY: `grep -vc '"jev":null' ledger.jsonl` over the total rows
**THE INSTANCE: 0 / 1245.** The system records abundantly and resolves never.

## G-4 · THE DEPLOYED≠SOURCE LAW
```
A fix is LIVE only if the deployed bundle's mtime > the source's, and the symbol is present
in the DEPLOYED file.
ELSE → NOT_DEPLOYED  exit 1
```
ENFORCED BY: `stat -c %Y dist/*.js` vs `src/*.ts`, plus a symbol grep on the DIST
**THE INSTANCE:** the gate is a no-op; the source "fix" lives in a checkpoint dir, never deployed.

## G-5 · THE CONVERGENCE LAW
```
findings(t+1) < findings(t)     else → CONVERGENT_SCAN  exit 1
```
ENFORCED BY: the ledger's own row count, per wave, recorded
**THE INSTANCE:** the gate was disarmed; findings could not fall; the docs grew instead.

## G-6 · ★ THE VACUOUS-KERNEL LAW (the one that did not exist)
```
A MUTATION that is total, terminating, law-checkable, --verdict-green, and WRONG ABOUT THE
WORLD must be REFUSED by the correctness firewall.
ELSE → CORRECTNESS_UNPROVEN  exit 1
```
ENFORCED BY: the reversed corpus gate (Blob→actionable, Prose→inert)
**THE INSTANCE:** it passes EVERY prior check in this project. Only an independent oracle sees it.

## G-7 · THE CLAIM-NAMES-ITS-LAW LAW
```
A refusal MUST name the law/rule it refused for. An exit code alone is insufficient.
ELSE → REFUSAL_UNATTRIBUTED  exit 1
```
**THE INSTANCE:** the harness caught 3 refusals that were "no such file" — a missing import sold
as a verdict.

## G-8 · THE INSTRUMENT-CONTROL LAW
```
EVERY measurement runs against a known-answer control first.
ELSE → INSTRUMENT_UNVALIDATED  exit 1
```
**THE INSTANCE:** the isolation probe "refused" — until the control proved the probe CAN succeed,
the refusal proved nothing. (A failing probe is indistinguishable from a broken probe.)

## G-9 · THE AUTHORING-BOUNDARY LAW
```
experiment work lands OUTSIDE the product tree (a sandbox), never in the repo root.
ELSE → POLLUTION  exit 1
```
**THE INSTANCE:** 39 files in the root; 2 foreign reports swept into a commit.

## THE ONE-LINE SUMMARY
```
A build is INTELLIGENT when its decisions are (a) REACHABLE from a live path, (b) RESOLVED
(not merely recorded), (c) PROVEN against an oracle independent of the system being graded, and
(d) REFUSED when a lawful-but-wrong mutation is substituted in.
PBK today: (a) FAIL · (b) FAIL · (c) not measured · (d) the check does not exist.
```
