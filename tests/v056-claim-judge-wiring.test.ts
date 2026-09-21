/**
 * v056-claim-judge-wiring.test.ts — V-056: the live claim path never supplied a JUDGE.
 *
 * FOUND while auditing the key-blocked items. The live call site was:
 *
 *     bindAtoms(atoms, ring, { currentTurn: … });          // <- no `judge`
 *
 * and claim-bind's own contract is explicit:
 *
 *     span from THIS TURN + no judge supplied -> atom unbound (FAIL_CLOSED)
 *
 * So the **bound-claim PASS** — one of the two items the goal's legal stop names — was unreachable BY
 * CONSTRUCTION, key or no key. This is the V-048 class exactly: the seam exists, the machinery exists,
 * and the live path omits the piece that makes it work. The key was never the only blocker.
 *
 * THE FIX has three parts, each pinned here:
 *   1. `judgeClaimViaTypeSafe` — the real judge, ASYNC, returning null without a key (so the old
 *      fail-closed behaviour is preserved byte for byte when no key is present).
 *   2. the live site PRE-RESOLVES the verdicts (JudgeFn is synchronous by contract: "wrap it and resolve
 *      BEFORE calling") and hands bindAtoms a sync lookup.
 *   3. the wiring itself — a SOURCE-level pin, because a behavioural test cannot see a judge that was
 *      never passed (the same reasoning as V-048's l0-wiring pin).
 *
 * ADVERSARIAL FIRST: the no-key path must stay fail-closed, then the pass path must be reachable.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  bindAtoms, parseClaimAtoms, judgeClaimViaTypeSafe, claimJudgeKey, textMatchesAtom,
  type RingSpan,
} from "../src/ext/claim-bind";

const ROOT = join(import.meta.dir, "..");
const ENTRY = readFileSync(join(ROOT, "src", "index.ts"), "utf8");
const TURN = "2026-09-21T10:00:00.000Z";
const span = (text: string, ts: string = TURN): RingSpan => ({ text, ts, source: "test" });

describe("V-056 the live claim path supplies a judge", () => {
  // ── the wiring: a behavioural test cannot see this ──
  test("ADVERSARIAL (wiring): the entry imports the judge AND passes it into bindAtoms", () => {
    expect(ENTRY).toContain("judgeClaimViaTypeSafe");
    expect(ENTRY).toContain("textMatchesAtom");
    expect(ENTRY).toContain("claimJudgeKey");
    const call = ENTRY.indexOf("bindAtoms(atoms, ring, {");
    expect(call).toBeGreaterThan(-1);
    const body = ENTRY.slice(call, call + 320);
    expect(body).toContain("judge:");                       // the judge IS supplied
    expect(body).toContain("currentTurn");
  });

  test("ADVERSARIAL (wiring): the pre-resolution happens BEFORE bindAtoms is called", () => {
    const pre = ENTRY.indexOf("await judgeClaimViaTypeSafe(");
    const call = ENTRY.indexOf("bindAtoms(atoms, ring, {");
    expect(pre).toBeGreaterThan(-1);
    expect(call).toBeGreaterThan(-1);
    expect(pre).toBeLessThan(call);                         // resolve first, then bind
  });

  // ── the judge's own contract ──
  test("ADVERSARIAL: WITHOUT a key the judge returns null (fail-closed preserved exactly)", async () => {
    const r = await judgeClaimViaTypeSafe({ kind: "status", text: "the daemon is running" } as never, span("daemon running"), undefined);
    expect(r).toBeNull();
  });

  test("with a BOGUS key it fails closed (null), never a false support", async () => {
    const r = await judgeClaimViaTypeSafe(
      { kind: "status", text: "the daemon is running" } as never, span("daemon running"), "bogus-key-not-real",
    );
    expect(r).toBeNull();
  });

  // ── the pass path, reachable once a verdict exists ──
  test("a PRE-RESOLVED support verdict lets the atom PASS (the path the key gates)", () => {
    const atoms = parseClaimAtoms("the daemon is running");
    expect(atoms.length).toBeGreaterThan(0);
    const ring = [span("the daemon is running")];
    const key = claimJudgeKey(atoms[0], ring[0]);
    const pre = new Map([[key, { verdict: "support" as const, probability: 0.97 } as never]]);
    const res = bindAtoms(atoms, ring, {
      currentTurn: TURN,
      judge: (a, s) => (pre.get(claimJudgeKey(a, s)) ?? null) as never,
    });
    expect(res.verdict).toBe("PASS");
  });

  test("CONTROL: with NO judge the same atom is unbound / FAIL_CLOSED (the old behaviour)", () => {
    const atoms = parseClaimAtoms("the daemon is running");
    const ring = [span("the daemon is running")];
    const res = bindAtoms(atoms, ring, { currentTurn: TURN });
    expect(res.verdict).not.toBe("PASS");
  });

  test("the matcher is exported (the pre-resolution needs the same span rule as bindAtoms)", () => {
    const atoms = parseClaimAtoms("the daemon is running");
    expect(textMatchesAtom(atoms[0], "the daemon is running")).toBe(true);
    expect(textMatchesAtom(atoms[0], "an unrelated line about something else entirely")).toBe(false);
  });
});
