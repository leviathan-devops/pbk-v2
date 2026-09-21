/**
 * claim-lexicon — the SSTF completion-claim detector (v4.4.2 port, ADAPTED for
 * the omp runtime — 2026-08-10, the operator's finding: "a bunch of false
 * positives firing").
 *
 * "A tool result NEVER arms the claim" (hook-chain.ts:888-891). The claim
 * arms ONLY from the agent's COMPLETED message via isCompletionClaim — a
 * test summary or subagent report with "passed" must NOT arm the gate (that
 * was the false-positive loop v4.4.2 killed: "agents learned to treat the
 * gate as noise", hook-chain.ts:883-887).
 *
 * THE OMP ADAPTATION: the v4.4.2 CLAIM_WORD_RE carried WORK-STATE verbs
 * (`working`, `complete`, `completed`, `done`, `fixed`) that describe the
 * WORK, not the VERIFICATION. On the omp runtime the agent's natural prose
 * ("I am working on the extension", "the build is complete", "I fixed the
 * tool") armed the gate — 8 false positives in a 13-message corpus. Those
 * verbs are REMOVED. The real verification claims are captured by the
 * VERIFICATION verbs (verified/passes/succeeded/confirmed) + the strong
 * phrases (all tests pass / verified the build / it works / all green). The
 * intent is unchanged: no "tested" without sandbox evidence.
 */
export const CLAIM_WORD_RE =
  /\b(verified|verifies|verifying|confirm[sd]?|confirming|proven|proves?|it\s+works|all\s+pass(es|ed)?|passes|passing|succeeded|succeeds|resolved|cleared|green)\b/i;

/**
 * V-083 THE NEGATION GUARD OVER-SUPPRESSED — measured, two defects in one line:
 *
 * (1) THE POSITIVE-LOADED TOKENS. The set carried `no\s+` and `fail(ed|ing|s)?|failing` and `yet` —
 *     tokens that appear in POSITIVE statements. `"There are no failures, all tests pass"` matched `no `
 *     and was discarded; `"0 failures"` matched `fail` and was discarded — **and `0 failures` /
 *     `zero failures` are two of CLAIM_STRONG_PHRASE_RE's OWN patterns, killed by this guard: DEAD BY
 *     CONSTRUCTION.** A failure WORD is not a negation of a pass-claim: the claim regexes never arm on
 *     "fail" in the first place, so the token removed only ever killed true positives.
 * (2) THE SENTENCE SCOPE. `continue` discarded the ENTIRE sentence, so a negation in one clause killed a
 *     claim in another: `"Not verified before, but now all tests pass"` never armed.
 *
 * THE FIX: the negation set carries only GENUINE negations of a verification claim, and the guard is
 * applied PER CLAUSE (the clause split lives in isCompletionClaim below).
 */
export const CLAIM_NEGATION_RE =
  /\b(not|cannot|can't|won't|refuse[sd]?|refus(ing|ed)|decline[sd]?|never|without|unverified|unsubstantiated|pending|attempt(ing)?|trying|will\s+verify|should\s+verify|needs?\s+verification|will\s+confirm|about\s+to\s+(confirm|verify|test|run)|need[s]?\s+to\s+(confirm|verify|test))\b/i;

export const CLAIM_WORK_ENTITY_RE =
  /\b(tests?|suite|battery|build|bundle|dist|extension|plugin|hook[s]?|gate[s]?|chain|engine[s]?|tool[s]?|function[s]?|module[s]?|package[s]?|feature[s]?|component[s]?|pipeline|runner|sandbox|container|vm|integration)\b/i;

export const CLAIM_STRONG_PHRASE_RE =
  /(all\s+(tests?|checks?|scenarios?|suites?|the\s+battery)\s+pass|tests?\s+pass|suite\s+passes|battery\s+passes|verified\s+(the\s+)?(build|bundle|dist|extension)|it\s+works|everything\s+works|all\s+green|0\s+failures?|zero\s+failures?)/i;

export const CLAIM_AUDIT_REMEDY_RE =
  /\b(audit|review|analysis|inspection|source\s+read|code\s+read|static\s+check)\b/i;

/**
 * Decide whether a completed message is a verification claim.
 * Sentence-split verdict (hook-chain.ts:851-859):
 *   - a negation guard kills a naive word match ("not verified");
 *   - a strong phrase ("tests pass") is a claim outright;
 *   - a claim word + a work entity is a claim, UNLESS the sentence is an
 *     audit/review remedy (an audit is not a container test).
 */
export function isCompletionClaim(text: string): boolean {
  if (!text) return false;
  for (const raw of text.split(/[.!?]+/)) {
    // V-083: THE CLAUSE SPLIT. A negation kills only the clause it appears in — a negation in one clause
    // must not silence a true claim in the next ("Not verified before, but now all tests pass").
    for (const clause of raw.split(/,|;|\bbut\b|\bhowever\b|\byet\b/i)) {
      const s = clause.trim();
      if (!s) continue;
      const neg = CLAIM_NEGATION_RE.exec(s);
      /** A negation is fatal only when it PRECEDES the claim it would negate. */
      const negates = (m: RegExpExecArray | null): boolean =>
        Boolean(neg && m && (neg.index ?? 0) < (m.index ?? 0));

      // V-090 THE AUDIT EXCLUSION WAS UNREACHABLE FOR THE STRONG-PHRASE PATH.
      // The module's own comment states the law — "an audit is not a container test" — and the code
      // applied it only INSIDE the word+entity branch, AFTER the strong-phrase branch had already
      // returned true. So "the audit verified the build" armed the gate (CLAIM_STRONG_PHRASE_RE matches
      // `verified (the )?build`), contradicting the module's stated intent. The exclusion now applies to
      // the CLAUSE, before either branch — which is the shape the comment describes.
      if (CLAIM_AUDIT_REMEDY_RE.test(s)) continue; // an audit is not a container test

      const strong = CLAIM_STRONG_PHRASE_RE.exec(s);
      if (strong) {
        if (!negates(strong)) return true; // "tests pass" / "0 failures" — the strong phrase arms it
        continue; // "not all tests pass"
      }
      const word = CLAIM_WORD_RE.exec(s);
      if (word && CLAIM_WORK_ENTITY_RE.test(s)) {
        if (negates(word)) continue; // "not verified" / "needs verification"
        return true; // "verified the build"
      }
    }
  }
  return false;
}
