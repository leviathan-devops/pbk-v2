// D3 — the timestamped, evidence-bound recordedRuns: a sandbox run clears a
// claim ONLY if it happened AFTER the claim (v4.4.2 containerTestTimestamp >
// claimTimestamp ordering). A pre-claim run does NOT suppress the demand.
import { describe, expect, test } from "bun:test";
import { RecordedRunSet } from "../../src/middleware/phantom-gate";

describe("RecordedRunSet — the claim-ordering evidence (D3)", () => {
  test("hasAfter: a run at/after the timestamp is evidence", () => {
    const runs = new RecordedRunSet();
    const claimAt = 1000;
    runs.record("ct-sandbox-test", 2000);
    expect(runs.hasAfter(claimAt, "ct-sandbox-test")).toBe(true);
  });

  test("a PRE-claim run does NOT clear (the ordering is load-bearing)", () => {
    const runs = new RecordedRunSet();
    const claimAt = 2000;
    runs.record("ct-sandbox-test", 1000); // ran BEFORE the claim
    expect(runs.hasAfter(claimAt, "ct-sandbox-test")).toBe(false);
  });

  test("the same-instant run clears (>= semantics)", () => {
    const runs = new RecordedRunSet();
    runs.record("ct-sandbox-test", 1000);
    expect(runs.hasAfter(1000, "ct-sandbox-test")).toBe(true);
  });

  test("no run → no evidence", () => {
    const runs = new RecordedRunSet();
    expect(runs.hasAfter(0, "ct-sandbox-test")).toBe(false);
  });

  test("record is monotonic per tool (latest timestamp wins)", () => {
    const runs = new RecordedRunSet();
    runs.record("ct-sandbox-test", 3000);
    runs.record("ct-sandbox-test", 1000); // older — must not regress
    expect(runs.hasAfter(2500, "ct-sandbox-test")).toBe(true);
  });

  test("snapshot/rehydrate preserves the evidence set", () => {
    const runs = new RecordedRunSet();
    runs.record("ct-sandbox-test", 5000);
    const names = runs.snapshot();
    const restored = new RecordedRunSet();
    restored.rehydrate(names);
    expect(restored.has("ct-sandbox-test")).toBe(true);
  });
});
