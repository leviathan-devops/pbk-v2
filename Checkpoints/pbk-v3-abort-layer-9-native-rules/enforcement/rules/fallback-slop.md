---
description: 'Catches proposing or accepting a SILENT FALLBACK. An ACTION frame, never a mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(fallback|fall ?back|graceful(ly)? (degrade|fail)|best[- ]effort|good enough)\b[^.]{0,40}\b(instead|substitute|otherwise|if (it|that) fails)\b'
  - '(?i)\b(cancel\s*[:=]\s*false|allow\b.{0,20}\bwhen (no|missing))\b[^.]{0,30}\b(ok|fine|normal|expected)\b'
  - '(?i)\b(regex|simple (scan|parser|indexer)|native[- ]?ast)\s+(fallback|instead|as a fallback)\b'
lexicon:
  descriptive:
    - '\b(named|LOUD|refusal|throws?|rejects?)\b'
  suggestive:
    - '\b(fallback|fall ?back|graceful(ly)? (degrade|fail)|best[- ]effort|good enough)\b[^.]{0,40}\b(instead|substitute|otherwise|if (it|that) fails)\b'
    - '\b(regex|simple (scan|parser|indexer)|native[- ]?ast)\s+(fallback|instead|as a fallback)\b'
  use:
    - '\b(named|LOUD|refusal|error|reject|GI_[A-Z_]+)\b'
    - '\b(have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim|am not|is not|was not)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE FALLBACK LAW. A missing substrate returns a NAMED, LOUD refusal — never an ALLOW. A fallback producing a DIFFERENT artifact marked READY is false success and is banned.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 3 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.4   kills: R19,R37,R13
POSITIVE scores: [0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
