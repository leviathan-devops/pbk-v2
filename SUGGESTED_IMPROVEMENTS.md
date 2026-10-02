# SUGGESTED_IMPROVEMENTS — the ranked problems, and the fix for each

> the ROI order is by (defects found this build) / (tokens). G-0 found 4; G-1 found 4; G-6 found 1.

## P0 · THE REACHABILITY LAW  (found: 4 unwired components)
```
┌──────────────────────────────────────────────────────────────────────┐
│  a component is BUILT  ──►  wired into the live path  ──►  fired      │
│       ✓ 4 of 4 machines   ✗ 0 of 4   ✗ 0 times                        │
│                                                                      │
│  the gap: the build optimised the LEFT side of that chain             │
└──────────────────────────────────────────────────────────────────────┘
```
**WHY IT IS WORTH THE TOKENS:** it converts a tested library into a system. **This is the single
highest-value guardrail in the spec — the other nine defend against mistakes; this one finds the
mistake that was already made.**
**THE STEPS:** write a must-fail mutation per machine (a machine that must refuse a bad transition);
a machine with no test is a library.
**IF WRONG:** one machine is wired that should not be. Cost: one revert.
**EFFECT IF OMITTED:** the build repeats — a fifth unwired machine, and more documentation.

## P0 · THE CORRECTNESS ORACLE  (found: a real kernel defect, 69 FNs)
```
┌──────────────────────────────────────────────────────────────────────┐
│  THE TRAP: a checker-only verdict. ALL PROOFS CHECK + 4/4 mutants +   │
│            6/6 container scenarios  →  and still wrong about the world │
│                                                                      │
│  THE FIX: an oracle INDEPENDENT of the system, on REAL data, scored  │
│          against the TRIVIAL BASELINE (93.3% vs 74.6% today)          │
│  ★ AND the vacuous-kernel mutant — lawful everywhere, wrong in the    │
│    world — must be REFUSED. Nothing else catches it.                 │
└──────────────────────────────────────────────────────────────────────┘
```
**WHY:** "it passed" and "it is right" are different claims, and only one of them was ever tested.
**IF WRONG:** the oracle over-reports. Cost: re-adjudication of 84 rows — hours, not rebuilds.
**EFFECT IF OMITTED:** the build ships a gate that is green and wrong. **This is the defect class
the operator named as "the only thing that matters."**

## P1 · THE DOC-CURRENTNESS LAW  (found: 4 contradicted claims)
```
the doc says:  "9 files, NO condition: key"   |  the tree says: 9/9 have one
the doc says:  "TTSR rules (27)"             |  the tree says: none registered
the doc says:  "the kernel is pure"          |  the tree says: 929 judge lines
```
**WHY:** a stale doc is worse than no doc — it is a false oracle that the next agent trusts.
**IF WRONG:** a claim is flagged that is true. Cost: one edit.
**EFFECT IF OMITTED:** every future session inherits four lies as canon.

## P1 · THE VACUOUS-KERNEL LAW  (found: 1, and it is the class itself)
```
a kernel that inverts its corpus gate:
   Blob → actionable · Prose → inert
  → typechecks · terminates · proves every law · --verdict green
  → passes every container scenario
  → scores ~26% against a 74.6% baseline
★ ONLY THE ORACLE SEES IT. This is the "correct-looking decisions about nothing" defect,
  in its purest form, and it is a TYPE-SYSTEM-CLEAN break.
```

## P2 · THE INSTRUMENT-CONTROL LAW  (found: 3 false greens)
```
the isolation probe "refused" — until the control proved it CAN succeed.
a mutation "passed" — until the harness proved the diff was non-empty.
a refusal "named a law" — until the harness proved it was a missing import.
★ EVERY measurement needs a known-answer control, or its silence is ambiguous.
```

## P3 · THE REPAIR-RATIO CEILING  (19 fix : 4 feat)
```
42 commits: 19 fix · 6 test · 4 feat
★ 68% of typed commits are REPAIRS. The build is in a recovery loop,
  and documentation is the loop's output, not its product.
  THE CEILING: repairs <= 2x features, enforced per wave. Above it, the wave is a recovery.
```

## THE ONE-LINE ORDER
```
BUILD THE MACHINE (P0) → THEN THE ORACLE (P0) → THEN MAKE THE DOCS TRUE (P1)
→ THEN CLAIM IT IS RIGHT (P1)
★ IN THAT ORDER. Building the oracle first, before the machine is reachable,
  produces a beautiful measurement of a library — which is what this build did.
```
