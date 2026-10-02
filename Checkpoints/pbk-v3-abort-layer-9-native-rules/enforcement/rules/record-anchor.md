---
description: 'Catches an unanchored claim, a symptom-in-place-of-mechanism, and a lookup-as-analysis. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(the (problem|issue|root cause|reason) is)\b[^.]{0,60}(?!.{0,60}\b(because|mechanism|\.ts|\.md|line [0-9]))'
  - '(?i)\b(i (found|discovered|noticed|see) that)\b(?!.{0,60}\b(\.ts:|\.md:|line [0-9]|exit|sha))'
  - '(?i)\b(it (looks|seems|appears) (like|that))\b(?!.{0,60}\b(because|the code|\.ts:|line [0-9]))'
lexicon:
  descriptive:
    - '\b(\.ts:|\.md:|line \d+|exit \d|sha256)\b'
  suggestive:
    - '\b(the (problem|issue|root cause|reason) is)\b'
    - '\b(i (found|discovered|noticed|see) that)\b'
    - '\b(it (looks|seems|appears) (like|that))\b'
  use:
    - '\b(because|mechanism|\.ts|\.md|line [0-9]|exit|sha)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE RECORD LAW. Anchor every claim to an artifact. Name the MECHANISM, never a symptom list. Quote the root cause VERBATIM.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 3 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.9   kills: R18,R24,R34,R51
POSITIVE scores: [0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
