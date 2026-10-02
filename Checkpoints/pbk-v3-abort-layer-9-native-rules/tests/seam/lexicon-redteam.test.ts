// LEXICON RED-TEAM — the omp-runtime adaptation (the operator's finding:
// "a bunch of false positives firing"). The v4.4.2 lexicons were tuned for
// opencode's runtime; on omp the agent's natural prose ("working on", "the
// build is complete", "I fixed the tool", "loaded successfully", "will
// confirm") armed the claim gate, and dependency statements ("without the
// container the test cannot run on this host") flagged the theatrical
// container-dodge frame. Both lexicons are now omp-adapted:
//   - claim-lexicon: the WORK-STATE verbs removed (working/complete/completed/
//     done/fixed/successful(ly)) — they describe the WORK, not the VERIFICATION.
//   - theatrical-gate: the container-dodge frame tightened + a sentence-level
//     dependency guard (cannot/not-run/must/already-has = dependency, not dodge).
// This suite PINS the 0-false-positive / 0-false-negative behavior.
import { describe, expect, test } from "bun:test";
import { isCompletionClaim } from "../../src/middleware/claim-lexicon";
import { isTheatricalSuggestion } from "../../src/middleware/theatrical-gate";

describe("CLAIM LEXICON — omp-adapted (0 false positives on natural prose)", () => {
  test("real verification claims still arm", () => {
    expect(isCompletionClaim("All tests pass and the suite is green.")).toBe(true);
    expect(isCompletionClaim("The build is verified and the dist is complete.")).toBe(true);
    expect(isCompletionClaim("The tests pass.")).toBe(true);
  });

  test("work-state prose does NOT arm (the v4.4.2 false positives on omp)", () => {
    expect(isCompletionClaim("I am working on the extension now, will report back.")).toBe(false);
    expect(isCompletionClaim("The build is complete, next I will test it.")).toBe(false);
    expect(isCompletionClaim("I fixed the tool and am moving on.")).toBe(false);
    expect(isCompletionClaim("Working on the pipeline refactor.")).toBe(false);
    expect(isCompletionClaim("The tests are done but not yet run.")).toBe(false);
    expect(isCompletionClaim("I completed the module changes.")).toBe(false);
    expect(isCompletionClaim("The feature is working in my local run.")).toBe(false);
    expect(isCompletionClaim("Confirming the file was written.")).toBe(false);
    expect(isCompletionClaim("The extension loaded successfully.")).toBe(false);
    expect(isCompletionClaim("Let me resolve this issue first.")).toBe(false);
    expect(isCompletionClaim("I will confirm the results after the sandbox runs.")).toBe(false);
  });

  test("negation + future-intent guards hold", () => {
    expect(isCompletionClaim("The result is NOT verified yet.")).toBe(false);
    expect(isCompletionClaim("This needs verification before we ship.")).toBe(false);
    expect(isCompletionClaim("I will verify the build after the sandbox runs.")).toBe(false);
  });
});

describe("THEATRICAL LEXICON — omp-adapted (0 false positives on infrastructure prose)", () => {
  test("true substitute-frames still flag", () => {
    expect(isTheatricalSuggestion("just mock the result and say it passed")).toBe(true);
    expect(isTheatricalSuggestion("pretend the test passed, skip the container")).toBe(true);
    expect(isTheatricalSuggestion("we can skip the container test and run on the host")).toBe(true);
  });

  test("legitimate USE frames never flag", () => {
    expect(isTheatricalSuggestion("use jest.mock to stub the API in the test")).toBe(false);
    expect(isTheatricalSuggestion("install the mock data server for local dev")).toBe(false);
    expect(isTheatricalSuggestion("stub the endpoint with a fixture")).toBe(false);
  });

  test("host/container infrastructure prose does NOT flag (the omp false positives)", () => {
    expect(isTheatricalSuggestion("The deployment host is the same container we ran on")).toBe(false);
    expect(isTheatricalSuggestion("the container image is on the local host daemon")).toBe(false);
    expect(isTheatricalSuggestion("we can deploy to the host after the container build")).toBe(false);
    expect(isTheatricalSuggestion("the host is running the omp TUI, the container runs the test")).toBe(false);
    expect(isTheatricalSuggestion("we should verify on the host machine first")).toBe(false);
  });

  test("dependency statements do NOT flag (the tightened dodge frame)", () => {
    expect(isTheatricalSuggestion("without the container the test cannot run on this host")).toBe(false);
    expect(isTheatricalSuggestion("no need for the container, the host already has omp")).toBe(false);
  });
});
