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

export const CLAIM_NEGATION_RE =
  /(not|cannot|can't|won't|refuse[sd]?|refus(ing|ed)|decline[sd]?|never|no\s+|without|unverified|unsubstantiated|fail(ed|ing|s)?|failing|yet|pending|attempt|trying|will\s+verify|should\s+verify|needs?\s+verification|will\s+confirm|about\s+to\s+(confirm|verify|test|run)|need[s]?\s+to\s+(confirm|verify|test))/i;

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
  const sentences = text.split(/[.!?]+/);
  for (const raw of sentences) {
    const s = raw.trim();
    if (!s) continue;
    if (CLAIM_NEGATION_RE.test(s)) continue; // "not verified" / "needs verification"
    if (CLAIM_STRONG_PHRASE_RE.test(s)) return true; // "tests pass"
    if (CLAIM_WORD_RE.test(s) && CLAIM_WORK_ENTITY_RE.test(s)) {
      if (CLAIM_AUDIT_REMEDY_RE.test(s)) continue; // an audit is not a container test
      return true;
    }
  }
  return false;
}
