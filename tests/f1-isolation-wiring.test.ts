/**
 * f1-isolation-wiring.test.ts — V-060: the F1 isolation gate is STRUCTURALLY INERT.
 *
 * FOUND by continuing the coverage sweep into `hooks/guardian-hook.ts` (80L, live, untested) — the gate
 * whose header says "the plugin-specific tools cannot be called by a non-ct agent". Following its two
 * dependencies produced the finding:
 *
 *   `isOwnedAgent(agentName)` is a STUB that returns **false for every name** ("none after the CT-only
 *   debrand"). Therefore `trackSessionEvent` takes its refusal branch for EVERY agent, `setCurrentAgent`
 *   is never called, `getCurrentAgent` always returns undefined, and `guardianGate`'s first guard
 *   (`if (!sessionAgent) return undefined`) always returns early.
 *
 * THE GATE LOGIC IS CORRECT — the WIRING is dead. That is V-048's class a FOURTH time, and the disposition
 * follows V-050: an inert guard is DOCUMENTED and PINNED rather than silently left looking active. **A
 * security gate believed active and structurally inert is worse than no gate at all.**
 *
 * THE PIN'S PURPOSE: if `isOwnedAgent` ever starts returning true — i.e. the gate is re-armed — the first
 * test here FAILS and says so, instead of the change landing unnoticed.
 *
 * ADVERSARIAL FIRST: the live path (untracked, always allows) before the forced-tracking path.
 */
import { describe, expect, test, beforeEach } from "bun:test";
import { guardianGate } from "../src/hooks/guardian-hook";
import { getCurrentAgent, setCurrentAgent, clearCurrentAgent } from "../src/hooks/agent-state";
import { trackSessionEvent } from "../src/hooks/session-hook";
import { isOwnedAgent } from "../src/agent-identity";

const gate = guardianGate();
const ctx = (toolName: string, sessionId: string) => ({ toolName, input: {}, scope: "main" as const, isAgentOrigin: true, toolCallId: "c", sessionId });

describe("V-060 the F1 isolation gate's wiring", () => {
  // ── the live path: the only state production can reach ──
  test("ADVERSARIAL: the live path ALWAYS ALLOWS (because no session can be tracked)", async () => {
    for (const tool of ["code-audit", "poseidon-tool", "ct-gate"]) {
      const r = await gate(ctx(tool, "live-" + tool) as never);
      expect(r).toBeUndefined();
    }
  });

  test("ADVERSARIAL: the tracking REFUSES a named agent (isOwnedAgent is a stub)", () => {
    expect(isOwnedAgent("build")).toBe(false);
    expect(isOwnedAgent("plan")).toBe(false);
    expect(isOwnedAgent("ct")).toBe(false);
    expect(trackSessionEvent({ type: "session.created", sessionId: "T-refuse", agent: "build" }, undefined)).toBe(false);
    expect(getCurrentAgent("T-refuse")).toBeUndefined();
  });

  // ── the gate LOGIC, which is correct once tracking is forced ──
  test("CONTROL: with tracking FORCED, the gate blocks an owned tool for a named agent", async () => {
    setCurrentAgent("build", "T-forced");
    try {
      const r = await gate(ctx("code-audit", "T-forced") as never);
      expect(r).toBeDefined();
      expect((r as { action?: string }).action).toBe("block");
      expect(String((r as { reason?: string }).reason)).toContain("[F1 BLOCKED]");
    } finally {
      clearCurrentAgent("T-forced");
    }
  });

  test("CONTROL: with tracking FORCED, a NON-owned tool still passes (no over-block)", async () => {
    setCurrentAgent("build", "T-forced2");
    try {
      expect(await gate(ctx("container-testing", "T-forced2") as never)).toBeUndefined();
    } finally {
      clearCurrentAgent("T-forced2");
    }
  });

  test("THE PIN: if isOwnedAgent is ever re-armed, this test is the one that fails first", () => {
    // This assertion is the finding written as a test: the gate's inertness RESTS on this stub.
    expect(isOwnedAgent("anything-at-all")).toBe(false);
  });
});
