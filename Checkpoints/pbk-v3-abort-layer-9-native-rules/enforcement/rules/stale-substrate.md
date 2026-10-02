---
description: 'Catches ANSWERING from a substrate without a freshness or scope assertion. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(the (graph|store|index|database|substrate)) (says?|shows?|reports?|contains?|has)\b[^.]{0,40}\b(no|none|zero|nothing)\b(?!.{0,60}\b(scope|stale|populated|fresh))'
  - '(?i)\b(no (callers|edges|nodes|results|matches) (found|exist)|(it|there) (has|have) no (callers|edges|dependents))\b(?!.{0,60}\b(scope|stale|populated))'
lexicon:
  descriptive:
    - '\b(scope|freshness|populated|GI_NO_STORE)\b'
  suggestive:
    - '\b(the (graph|store|index|database|substrate)) (says?|shows?|reports?|contains?|has)\b[^.]{0,40}\b(no|none|zero|nothing)\b'
    - '\b(no (callers|edges|nodes|results|matches) (found|exist)|(it|there) (has|have) no (callers|edges|dependents))\b'
  use:
    - '\b(scope|stale|populated|fresh|freshness)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE SUBSTRATE LAW. Never read zero rows as an answer. Assert FRESHNESS and SCOPE first. An empty result and a wrong-scope result are indistinguishable unless the tool names which it is.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 3 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.8   kills: R13,R14,R33,R49
POSITIVE scores: [0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
