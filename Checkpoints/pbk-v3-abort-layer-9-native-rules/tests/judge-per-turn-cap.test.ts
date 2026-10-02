/**
 * judge-per-turn-cap.test.ts — V-040.
 *
 * PROBED 2026-09-21: MAX_ACT_APPENDS_PER_RULE_PER_TURN is documented as PER TURN, but the ring key was
 * derived from the CONSTRUCTOR opts (`opts.sessionId ?? 'default'`, `opts.turnId ?? 'turn'`), and the
 * omp tool_result payload carries NO session/turn ids (measured). In production the key was therefore
 * constant for the whole process, so the cap degenerated into a PERMANENT one: after 2 `act` appends a
 * rule went flag-only FOREVER and the repair channel — this layer's entire purpose — fell silent.
 *
 * FIX: the ring key follows a mutable turn counter advanced by the host at the turn boundary
 * (agent_end -> setTurn()), and judgeWithBands prefers the EVENT's ids when a host supplies them.
 *
 * ADVERSARIAL FIRST: the first test drives 4 edits that all want `act`, asserts the cap holds at 2,
 * then advances the turn and asserts the rule can act AGAIN — which is the behaviour that was broken.
 */
import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { kernelJudge, MAX_ACT_APPENDS_PER_RULE_PER_TURN, type RubricRule } from "../src/ext/kernel-judge";

function tempRubric(): string {
  const dir = mkdtempSync(join(tmpdir(), "caprule-"));
  const path = join(dir, "rubric.json");
  const rule: RubricRule = {
    id: "cap-rule",
    text: "a capped rule",
    when: "edit",
    status: "active",
    check: { type: "model", question: { type: "boolean", instructions: "q" } },
  } as RubricRule;
  writeFileSync(path, JSON.stringify({ version: "1", thresholds: { act: 0.8, flag: 0.5 }, rules: [rule] }));
  return path;
}

const ev = (i: number) => ({
  type: "tool_result",
  toolName: "write",
  toolCallId: "cap" + i,
  content: [{ type: "text", text: "wrote src/x.ts" }],
  input: { file_path: "src/x.ts", content: "export const a=1;\n" },
  details: {},
  isError: false,
});

describe("V-040 the act cap is PER TURN (not permanent)", () => {
  test("ADVERSARIAL: 4 acts in one turn cap at 2, and the NEXT turn can act again", async () => {
    const rubricPath = tempRubric();
    try {
      const j = kernelJudge({ judge: async (rs) => Object.fromEntries(rs.map((r) => [r.id, 0.95])), rubricPath });
      let actsTurn1 = 0;
      for (let i = 0; i < 4; i++) actsTurn1 += (await j.judge(ev(i))).actAppends;
      expect(actsTurn1).toBe(MAX_ACT_APPENDS_PER_RULE_PER_TURN); // the cap holds

      j.setTurn(1); // the host's turn boundary
      let actsTurn2 = 0;
      for (let i = 0; i < 4; i++) actsTurn2 += (await j.judge(ev(10 + i))).actAppends;
      // before the fix this was 0 FOREVER — the rule was silenced for the process lifetime
      expect(actsTurn2).toBe(MAX_ACT_APPENDS_PER_RULE_PER_TURN);
    } finally {
      rmSync(join(rubricPath, ".."), { recursive: true, force: true });
    }
  });
});

// ═══ V-051: THE TURN IDENTITY IS LOAD-BEARING — AND IT WAS BEING ROTATED BY A MESSAGE ══════════════
// PROBED 2026-09-21 (extending V-040's work). The two host events are unambiguous:
//   agent_end   -> messages: AgentMessage[]   (PLURAL, the whole loop)   = the TURN boundary
//   message_end -> message:  AgentMessage     (SINGULAR, one record)     = a MESSAGE
// and message_end is emitted PER RECORD (session/agent-session.ts:946-952). The settled handler advanced
// `turnCounter` on EVERY registered event, so a turn with N messages rotated the judge's turn identity
// N+1 times — and the ring key is `sessionId::T<currentTurn>` (kernel-judge.ts:734), so each rotation
// handed the rule a FRESH EMPTY RING. V-040's cap was undone one layer up.
//
// This test pins the MECHANISM (the cap's total dependence on the turn identity). The wiring pin — that
// the handler advances only on a turn-carrying event — is in v051-turn-identity.test.ts.
describe("V-051 the cap is only as good as the turn identity", () => {
  test("ADVERSARIAL: rotating the turn between edits DEFEATS the cap (the damage V-051 caused)", async () => {
    const rubricPath = tempRubric();
    try {
      const j = kernelJudge({ judge: async (rs) => Object.fromEntries(rs.map((r) => [r.id, 0.95])), rubricPath });
      let actRounds = 0;
      for (let i = 0; i < 5; i++) {
        j.setTurn(1000 + i);                 // exactly what a per-MESSAGE rotation did
        if ((await j.judge(ev(i))).actAppends > 0) actRounds += 1;
      }
      expect(actRounds).toBe(5);             // 5 rotations -> 5 acts: the cap cannot hold
    } finally {
      rmSync(join(rubricPath, ".."), { recursive: true, force: true });
    }
  });

  test("CONTROL: the SAME five edits inside ONE turn cap at 2 (the cap works when the identity is right)", async () => {
    const rubricPath = tempRubric();
    try {
      const j = kernelJudge({ judge: async (rs) => Object.fromEntries(rs.map((r) => [r.id, 0.95])), rubricPath });
      j.setTurn(7);
      let actRounds = 0;
      for (let i = 0; i < 5; i++) if ((await j.judge(ev(20 + i))).actAppends > 0) actRounds += 1;
      expect(actRounds).toBe(MAX_ACT_APPENDS_PER_RULE_PER_TURN);
    } finally {
      rmSync(join(rubricPath, ".."), { recursive: true, force: true });
    }
  });
});
