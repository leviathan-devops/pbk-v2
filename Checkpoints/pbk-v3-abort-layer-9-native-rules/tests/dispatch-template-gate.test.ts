/**
 * dispatch-template-gate.test.ts — V-081, the inverted polarity, pinned.
 *
 * FOUND by an ocr CRITICAL and confirmed against the live sibling: the gate exempted with
 * `if (ctx.isAgentOrigin) return undefined` where `dispatch-gate.ts:75` exempts with
 * `if (!ctx.isAgentOrigin)`. The chain defaults the field to TRUE, so the inverted form exempted EVERY
 * REAL CALL — a gate that is dead in the direction that LOOKS alive (it returns cleanly; every probe
 * "passes").
 *
 * ADVERSARIAL FIRST: the block case, then the exemption, then the well-templated control.
 */
import { describe, expect, test } from "bun:test";
import { dispatchTemplateGate, evaluateDispatchTemplate, TEMPLATE_FINGERPRINTS, matchTemplate } from "../src/middleware/dispatch-template-gate";
import type { BeforeContext } from "../src/middleware/chain";

const ctx = (input: Record<string, unknown>, isAgentOrigin = true): BeforeContext =>
  ({ toolName: "task", input, scope: "main", isAgentOrigin, toolCallId: "c", sessionId: "s" }) as never;

const drive = async (input: Record<string, unknown>, isAgentOrigin = true) => {
  const v = await dispatchTemplateGate(undefined)(ctx(input, isAgentOrigin));
  return v === undefined ? "allow" : JSON.stringify(v).slice(0, 400);
};
const fired = (s: string) => s !== "allow";

/** A prompt carrying the E1 fingerprint COMPLETELY (opener + every sentinel + the minimum lines). */
const E1 = TEMPLATE_FINGERPRINTS[0];
const templated = (() => {
  const sentinels = E1.requiredSentinels.map((r) => `## ${r.source.match(/[A-Za-z ]{6,}/)?.[0]?.trim() ?? "SECTION"}`).join("\n");
  // the sentinels are regexes over the text; build lines that MATCH them
  const body = [
    "EXECUTE THE FOLLOWING FORENSIC CONTEXT EXTRACTION VERBATIM",
    "═══ THE EXECUTION LAW (this block is binding; it is identical in every task) ═══",
    "THE RETURN FORMAT:",
    "THE READING ORDER (READ BEFORE ANY EXECUTION",
    "THE CONSTRAINTS:",
    "Every claim in your return carries a file:line anchor",
    "READ-ONLY",
  ];
  while (body.length < E1.minLines + 2) body.push("a body line carrying real content");
  return body.join("\n");
})();

describe("V-081 the dispatch-template gate's polarity", () => {
  test("ADVERSARIAL: an AGENT-origin dispatch with a bare prompt is BLOCKED", async () => {
    const r = await drive({ task: "do the thing", agent: "scout" }, true);
    expect(fired(r)).toBe(true);
    expect(r).toContain("dispatch-template-v2");
    expect(r).toContain("DISPATCH TEMPLATE GATE");
  });

  test("ADVERSARIAL: an EXTENSION-origin dispatch with the same prompt is EXEMPT (the v1 law)", async () => {
    const r = await drive({ task: "do the thing", agent: "scout" }, false);
    expect(r).toBe("allow");
  });

  test("CONTROL: an agent-origin dispatch carrying a COMPLETE template is allowed", async () => {
    const r = await drive({ task: templated, agent: "scout" }, true);
    expect(r).toBe("allow");
  });

  test("F-04: the evaluator names the missing sentinel by its TEXT, never by its index", () => {
    // THE DEFECT THIS PINS (the operator's bricked session, 2026-09-22): the old evaluator said
    // "missing sentinel[0] of E3" — an INDEX the agent could not act on. The fix prints the literal.
    const e = evaluateDispatchTemplate({
      task: "EXECUTE THE FOLLOWING RESEARCH TASK VERBATIM\n" + "x\n".repeat(90),
    });
    expect(e.verdict).toBe("block");
    expect(e.reasons[0]).toContain("THE EXECUTION LAW (this block is binding; it is identical in every task)");
    expect(e.reasons[0]).not.toContain("sentinel[0]");
  });

  test("F-04: a bare prompt is named as 'no dispatch template', not as an index", () => {
    const e = evaluateDispatchTemplate({ task: "a bare prompt" });
    expect(e.verdict).toBe("block");
    expect(e.reasons[0]).toContain("no dispatch template");
    expect(e.reasons[0]).not.toContain("sentinel[");
  });

  test("F-04 ESCAPE HATCH: PBK_DISPATCH_TEMPLATE_GATE=off makes the gate inert", async () => {
    const prev = process.env.PBK_DISPATCH_TEMPLATE_GATE;
    process.env.PBK_DISPATCH_TEMPLATE_GATE = "off";
    try {
      const v = await dispatchTemplateGate(undefined)(ctx({ task: "a bare prompt", agent: "scout" }));
      expect(v).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.PBK_DISPATCH_TEMPLATE_GATE;
      else process.env.PBK_DISPATCH_TEMPLATE_GATE = prev;
    }
  });

  test("F-04 ESCAPE HATCH: PBK_DISPATCH_TEMPLATE_GATE=warn observes but never blocks", async () => {
    const prev = process.env.PBK_DISPATCH_TEMPLATE_GATE;
    process.env.PBK_DISPATCH_TEMPLATE_GATE = "warn";
    try {
      const v = await dispatchTemplateGate(undefined)(ctx({ task: "a bare prompt", agent: "scout" }));
      expect(v).toBeUndefined(); // observed in the log, NOT blocked
    } finally {
      if (prev === undefined) delete process.env.PBK_DISPATCH_TEMPLATE_GATE;
      else process.env.PBK_DISPATCH_TEMPLATE_GATE = prev;
    }
  });

  test("the fingerprint detector recognises a complete template", () => {
    const m = matchTemplate(templated);
    expect(m.matched).toBe(true);
  });

  test("a NON-task tool is never gated", async () => {
    const v = await dispatchTemplateGate(undefined)({ ...ctx({}), toolName: "bash" } as never);
    expect(v).toBeUndefined();
  });
});
