---
description: 'Catches THEATRICAL verification — a PASS/verified claim naming no artifact, and the always-theatrical tells. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(verified|validated|tested|confirmed|proven)\b[^.]{0,30}\b(works?|passing|passes|green|correct)\b(?!.{0,60}(exit 0|RC=0|tool result|artifact|the deployed))'
  - '(?i)\b(the )?(tests?|suite|battery|container|host)\b[^.]{0,30}\b(all )?(pass|passed|passing|green)\b(?!.{0,60}\b(against|on|with)\b.{0,20}\b(the deployed|the artifact))'
  - '(?i)\b(structural(ly)? (pass|green)|pass by design|source[- ]inspection|asserted the behavior|it should work|trust me)\b'
  - '(?i)\b(no bugs? found|zero (bugs?|defects?|issues?))\b'
  - '(?i)\b(looks (correct|right|good)|seems (correct|fine|right))\b'
lexicon:
  descriptive:
    - '\b(bun test|npm test|\d+/\d+|imports the deployed)\b'
  suggestive:
    - '\b(verified|validated|tested|confirmed|proven)\b[^.]{0,30}\b(works?|passing|passes|green|correct)\b'
    - '\b(the )?(tests?|suite|battery|container|host)\b[^.]{0,30}\b(all )?(pass|passed|passing|green)\b'
  substitute:
    - '\b(structural(ly)? (pass|green)|pass by design|source[- ]inspection|asserted the behavior|it should work|trust me)\b'
    - '\b(no bugs? found|zero (bugs?|defects?|issues?))\b'
    - '\b(looks (correct|right|good)|seems (correct|fine|right))\b'
  use:
    - '\b(exit 0|RC=0|tool result|the deployed|against|the artifact)\b'
    - '\b(have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim|am not|is not|was not)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE SUBJECT LAW. State WHAT ran, WHAT passed, WHAT failed, WHAT was blocked — with the command and its output. A green claim is about the SOURCE unless the suite imports the deployed bundle. The structural-pass, design-pass, inspection-only, looks-correct and zero-bugs families are theatrical tells — an empty bug ledger is a RED FLAG, not an achievement.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 6 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.2   kills: R3,R21,R25,R30,R50
POSITIVE scores: [0.6667, 0.6667, 0.6667, 0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
