---
description: 'Catches a PREVENTION stated as an instruction or a warning instead of a predicate. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(we (should|must|need to)|i.?ll|let.?s|let me) (just )?(make sure|ensure|remember to|be careful|always|never)\b'
  - '(?i)\b(the (fix|solution|plan) is to|to (fix|prevent|solve) (this|it),? (we )?(just )?(need to|must|should))\b'
  - '(?i)\b(add a (check|warning|reminder|note|comment) (that|to))\b'
  - '(?i)\b(be (more )?careful|pay attention to|watch out for|keep in mind)\b'
lexicon:
  descriptive:
    - '\b(exit 1|nonzero|asserts?|throws)\b'
  suggestive:
    - '\b(we (should|must|need to)|i.?ll|let.?s|let me) (just )?(make sure|ensure|remember to|be careful|always|never)\b'
    - '\b(add a (check|warning|reminder|note|comment) (that|to))\b'
    - '\b(be (more )?careful|pay attention to|watch out for|keep in mind)\b'
  use:
    - '\b(exit|predicate|nonzero|throws?|fails?|asserts?)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE PREDICATE LAW. A prevention is a MECHANICAL PREDICATE, never an instruction. THE EXIT TEST: does something exit NONZERO when this is violated? If nothing fails, it is documentation.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 4 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.6   kills: R11,R36
POSITIVE scores: [0.6667, 0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
