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
    expect(r).toContain("DISPATCH TEMPLATE GATE v2");
  });

  test("ADVERSARIAL: an EXTENSION-origin dispatch with the same prompt is EXEMPT (the v1 law)", async () => {
    const r = await drive({ task: "do the thing", agent: "scout" }, false);
    expect(r).toBe("allow");
  });

  test("CONTROL: an agent-origin dispatch carrying a COMPLETE template is allowed", async () => {
    const r = await drive({ task: templated, agent: "scout" }, true);
    expect(r).toBe("allow");
  });

  test("the evaluator itself names the missing fingerprint and the remedy", () => {
    const e = evaluateDispatchTemplate({ task: "a bare prompt" });
    expect(e.verdict).toBe("block");
    expect(e.reasons[0]).toContain("NO ct dispatch template fingerprint");
    expect(e.reasons[0]).toContain("Remedy:");
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
