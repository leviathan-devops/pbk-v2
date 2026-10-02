---
description: 'Catches delivering a module as a FILE rather than an EDGE, and claiming a layer UP by existence. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(wave|task) (delivers?|produces?|creates?)\s+(the\s+)?(file|module|adapter|class)\b(?!.{0,60}\b(consumed|wired|imported|the edge))'
  - '(?i)\b(the )?(layer|component|module) is (up|ready|available|registered)\b(?!.{0,60}\b(consumed|read by|wired|used by))'
  - '(?i)\b(registered|declared) (the )?(layer|component|module)s?\b(?!.{0,60}\b(consumed|wired|imported))'
lexicon:
  descriptive:
    - '\b(consumed|wired|imported|consumers?)\b'
  suggestive:
    - '\b(wave|task) (delivers?|produces?|creates?)\s+(the\s+)?(file|module|adapter|class)\b'
    - '\b(the )?(layer|component|module) is (up|ready|available|registered)\b'
    - '\b(registered|declared) (the )?(layer|component|module)s?\b'
  use:
    - '\b(consumed|wired|imported|the edge|read by|used by|consumers?)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE EDGE LAW. A wave's deliverable is an EDGE, never a file. A layer counts as live iff its fact changed a verdict — consumers >= 1 AND decisions-influenced >= 1, else UNCONSUMED.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 3 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.7   kills: R1,R5,R10,R12,R16
POSITIVE scores: [0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
