---
description: 'Catches SHRINKING the operator''s scope — fewer components, a smaller target, a named ceiling. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(let.?s |we (should|could|can) |i.?ll )?(just |only )?(build|do|wire|implement|focus on) (the )?(first|2|two|3|three|partial|subset|core|minimal)\b'
  - '(?i)\b(start (with|small)|smaller scope|reduce the scope|narrow (the |it )?(scope|down)|scope (is )?too (big|large)|too ambitious)\b'
  - '(?i)\b(honest ceiling|the choice:|the realistic (version|scope)|what we can actually)\b'
lexicon:
  descriptive:
    - '\b(verbatim|the full scope|every component)\b'
  suggestive:
    - '\b(let.?s |we (should|could|can) |i.?ll )?(just |only )?(build|do|wire|implement|focus on) (the )?(first|2|two|3|three|partial|subset|core|minimal)\b'
    - '\b(start (with|small)|smaller scope|reduce the scope|narrow (the |it )?(scope|down)|scope (is )?too (big|large)|too ambitious)\b'
    - '\b(honest ceiling|the choice:|the realistic (version|scope)|what we can actually)\b'
  use:
    - '\b(full scope|verbatim|every component|all components|the whole|no reduction)\b'
    - '\b(have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim|am not|is not|was not)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE SCOPE LAW. The scope is the operator's. A build delivering fewer components is a FAILED build, not a reduced one. State the scope VERBATIM and build it. If something is blocked, name the block and the remedy — never re-specify a lesser target and call it the plan.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 5 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.3   kills: R15,R46
POSITIVE scores: [0.6667, 0.6667, 0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
