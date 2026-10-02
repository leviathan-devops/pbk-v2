/**
 * CT-only tool registry. The 15-tool plugin block is gone.
 * Registers container-testing (records both "container-testing" and
 * "ct-sandbox-test" so the sttgf escape hatch (:2531) still clears).
 */
import type { ExtensionAPI } from "../types/omp";
import type { EngineHost } from "../host";
import type { RecordedRunSet } from "../middleware/phantom-gate";
import { buildContainerTestingTool } from "./container-testing";

export interface CtRegistryDeps {
  host: EngineHost;
  recordedRuns: RecordedRunSet;
}

export function registerPbkTools(pi: ExtensionAPI, deps: CtRegistryDeps): string[] {
  pi.registerTool(buildContainerTestingTool(pi, deps));
  const names = ["container-testing"];
  console.log("[pbk] registered " + names.join(", "));
  return names;
}
