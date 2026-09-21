/**
 * doc-density-gate — per-type .md floors on write/edit, DRAFT vs FINALIZE,
 * post-state reconstruction for edits. (port of hook-chain.ts:925-1110)
 */
import { BeforeGate } from "./chain";
import type { EngineHost } from "../host";

export type DocType = "spec" | "completion" | "arch" | "report" | "audit" | "log" | "readme" | "generic";

export const DOC_FLOORS: Record<DocType, number> = {
  spec: 3000,
  completion: 2000,
  arch: 1000,
  report: 500,
  audit: 100,
  log: 100,
  readme: 300,
  generic: 200,
};

export const EXEMPT_PATHS = [
  "GENERATED_ARTIFACTS",
  "god-loop/canon",
  ".ct/checkpoints",
  "wave-audit",
  "container-test-results",
];

export function classifyDocType(path: string): DocType {
  const name = path.split("/").pop() ?? path;
  const lower = name.toLowerCase();
  if (/spec/.test(lower) && /(l2|spec|detailed)/.test(lower)) return "spec";
  if (/completion/.test(lower)) return "completion";
  if (/architect/.test(lower) || /macro/.test(lower)) return "arch";
  if (/report/.test(lower) || /build_report/.test(lower)) return "report";
  if (/audit/.test(lower) || /zero_trust/.test(lower)) return "audit";
  if (/log/.test(lower) || /changelog/.test(lower) || /debug/.test(lower)) return "log";
  if (/readme|index|overview/.test(lower)) return "readme";
  return "generic";
}

export function countLines(content: string): number {
  if (content.length === 0) return 0;
  return content.split("\n").length;
}

export function isDraft(content: string): boolean {
  const head = content.slice(0, 200);
  return head.startsWith("DRAFT") || head.includes("<!-- DRAFT -->");
}

export function docDensityGate(host: EngineHost): BeforeGate {
  return async (ctx) => {
    if (!["write", "edit", "create"].includes(ctx.toolName)) return undefined;
    const path = String(ctx.input.path ?? ctx.input.filePath ?? "");
    if (!path.endsWith(".md")) return undefined;
    if (EXEMPT_PATHS.some((e) => path.includes(e))) return undefined;
    const type = classifyDocType(path);
    const floor = DOC_FLOORS[type];
    const content = String(ctx.input.content ?? "");
    const existing = host.readFileSync(path);

    // DRAFT semantics: an existing draft or a DRAFT marker relaxes the floor
    if (isDraft(content) || (existing !== null && isDraft(existing))) return undefined;

    // Edit: evaluate the POST state (reconstruction: new content merged over existing)
    const finalContent = content.length > 0 ? content : existing ?? "";
    const lines = countLines(finalContent);
    if (lines < floor) {
      return {
        action: "block",
        gate: "doc-density",
        reason: `[CT DOC-DENSITY] ${type.toUpperCase()} requires >= ${floor} lines; got ${lines}`,
      };
    }
    return undefined;
  };
}
