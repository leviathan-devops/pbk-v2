// Verify the exact false-positive scenario is dead with the FIXED gate
import { describe, expect, test } from "bun:test";
import { theatricalGate, TheatricalStateTracker, isTheatricalSuggestion } from "../../src/middleware/theatrical-gate";

describe("theatrical false-positive regression (the TASK_QUEUE doc)", () => {
  test("the exact §5+§8.2 doc content no longer fires (newlines preserved)", async () => {
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    const doc = `## 5. BLOCKED ITEMS
| The claim gate's Phase B demand | fires on verification claims without container evidence | run the container battery — the escape hatch |
## 8.2 The VERIFY gate
A host-only audit is NOT the VERIFY gate.
The container-side RPC stream is the sanctioned channel.`;
    const verdict = await gate({
      toolName: "write", input: { path: "x.md", content: doc },
      scope: "main", isAgentOrigin: true, toolCallId: "c", sessionId: "s1",
    });
    expect(verdict).toBeUndefined();
    expect(tracker.pending("s1")).toBe(false);
  });

  test("the REAL same-line substitute-frame still fires", async () => {
    const tracker = new TheatricalStateTracker();
    const gate = theatricalGate(tracker);
    await gate({
      toolName: "write", input: { path: "x.md", content: "just skip the container test on the host" },
      scope: "main", isAgentOrigin: true, toolCallId: "c", sessionId: "s2",
    });
    expect(tracker.pending("s2")).toBe(true);
  });

  test("lexicon intent matches reality", () => {
    expect(isTheatricalSuggestion("just mock the result")).toBe(true);
    expect(isTheatricalSuggestion("jest.mock(../db)")).toBe(false);
    expect(isTheatricalSuggestion("mock server on port 3000")).toBe(false);
    expect(isTheatricalSuggestion("pretend the test passed")).toBe(true);
    expect(isTheatricalSuggestion("install mock library via bun add")).toBe(false);
  });
});
