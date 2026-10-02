---
description: 'Catches CLAIMING a build/feature complete with no artifact evidence, and the explicit skip-the-build frame. An ACTION frame, never a noun mention.'
scope: [text, thinking]
interruptMode: always
condition:
  - '(?i)\b(?<!\b(?:have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim)\b[^.]{0,30})\b(build|feature|module|kernel|layer|implementation)\b(?:(?!\b(?:not|isn.?t|never|no)\b)[^.]){0,40}\b(?:is )?(done|complete|completed|finished|shipped|ready|working)\b'
  - '(?i)\b(no need to|skip|don.?t need to)\s+(rebuild|redeploy|build|deploy)\b'
  - '(?i)\b(just|only|let.?s)\s+(build|do|wire)\s+(the\s+)?(first|2|two|3|three|partial|subset|core)\b'
lexicon:
  descriptive:
    - '\b(bun build|npm run|yarn build|bunx tsc|tsc |compile)\b'
  suggestive:
    - '(?i)\b(?<!\b(?:have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim)\b[^.]{0,30})\b(build|feature|module|kernel|layer|implementation)\b(?:(?!\b(?:not|isn.?t|never|no)\b)[^.]){0,40}\b(?:is )?(done|complete|completed|finished|shipped|ready|working)\b'
    - '\b(no need to|skip|don.?t need to)\s+(rebuild|redeploy|build|deploy)\b'
    - '\b(just|only|let.?s)\s+(build|do|wire)\s+(the\s+)?(first|2|two|3|three|partial|subset|core)\b'
  use:
    - '\b(exit 0|RC=0|sha256|distSha|PASS)\b'
    - '\b(have not|haven.t|did not|didn.t|has not|hasn.t|not claimed|no build|no claim|am not|is not|was not)\b'
threshold: 0.3
band: { low: 0.3, high: 0.62 }
---

THE ARTIFACT LAW. A completion claim without the artifact's hash AND a symbol grep is VOID. Run `sha256sum <the deployed bundle>` and `grep -c <the symbols this change added> <the bundle>` — a zero on any symbol is an UNBUILT change. The exemption is a TOOL RESULT, never a typed hash: a stated sha is a claim, the disk's sha is evidence. State the scope verbatim.

<!--
THE DERIVED BAND — computed this turn, never inherited.
corpus: 5 positives + 6 negatives (the corpus §4.1 set).
min(positive) = 0.6667   max(negative) = 0.0   SEPARABLE = True
band = 0.3/0.62   (low = max(neg)+0.05, floored at 0.30; high = min(pos)-0.05)
source: the corpus §3.1   kills: R2,R11,R15,R46
POSITIVE scores: [0.6667, 0.6667, 0.6667, 0.6667, 0.6667]
NEGATIVE scores: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
-->
