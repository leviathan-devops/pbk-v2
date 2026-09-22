/**
 * dispatch-gate — the DPL1 dispatch standard enforced on the task tool:
 * validation (block) + input rewrite for thin prompts.
 * (port of hook-chain.ts:1409-1552 + the PROMPTING LAW criteria)
 */
import { BeforeGate } from "./chain";

export const DPL1_SECTIONS = [
  "mission",
  "acceptance",
  "reading-order",
  "per-task",
  "constraints",
  "verification",
  "return-format",
  "grounding",
] as const;

export const DPL1_MIN_LINES = 150;

export interface Dpl1Task {
  name?: string;
  agent?: string;
  task: string;
  [k: string]: unknown;
}

export function validateDpl1(taskText: string): string[] {
  const missing: string[] = [];
  const lower = taskText.toLowerCase();
  for (const s of DPL1_SECTIONS) {
    if (!lower.includes(`# ${s}`) && !lower.includes(`## ${s}`) && !lower.includes(`#${s}`)) missing.push(s);
  }
  const hasAbsPath = /\n\/(home|tmp|abs)\//.test(taskText) || /\/home\/leviathan\//.test(taskText);
  if (!hasAbsPath) missing.push("absolute-paths");
  if (taskText.split("\n").length < DPL1_MIN_LINES) missing.push(`density-floor(${DPL1_MIN_LINES} lines)`);
  return missing;
}

export const DPL1_SCAFFOLD = `# Mission
<state the precise task, once>

# Acceptance
<checkable done-conditions>

# Reading order
<absolute paths, one per line>

# Per-task
<WHAT / HOW / WHY / EXPECTED for each task>

# Constraints
<do-not-touch list>

# Verification
<concrete commands with pass conditions>

# Return format
<report contract>

# Grounding
<every claim carries file:line; unknown values are PROPOSED, never invented>
`;

export function wrapWithDpl1(thin: string): string {
  return `${DPL1_SCAFFOLD}\n# Model draft (expand into the sections above)\n${thin}`;
}

export const OWNED_AGENT_ALLOWLIST = new Set(["ct-build", "ct-scout", "scout", "task", "sonic", "reviewer", "security-reviewer", "librarian", "designer"]);

export function dispatchGate(host?: unknown): BeforeGate {
  void host;
  return async (ctx) => {
    if (ctx.toolName !== "task") return undefined;
    if (!ctx.isAgentOrigin) return undefined; // extension-origin calls exempt
    // agent-type allowlist (the v4.4.2 subagent gate)
    const items: Dpl1Task[] = Array.isArray(ctx.input.tasks)
      ? (ctx.input.tasks as Dpl1Task[])
      : typeof ctx.input.task === "string"
        ? [{ task: ctx.input.task as string, agent: ctx.input.agent as string | undefined }]
        : [];
    if (items.length === 0) return undefined;
    const badAgents = items
      .map((it) => it.agent)
      .filter((a): a is string => typeof a === "string" && a.length > 0 && !OWNED_AGENT_ALLOWLIST.has(a));
    if (badAgents.length > 0) {
      return {
        action: "block",
        gate: "dispatch",
        reason: `[PBK DISPATCH GATE] agent type not allowed: ${[...new Set(badAgents)].join(", ")}`,
      };
    }
    const thin = items.flatMap((it) => validateDpl1(String(it.task ?? "")));
    if (thin.length > 0) {
      const missing = [...new Set(thin)].join(", ");
      if (ctx.isAgentOrigin) {
        // REWRITE path: wrap the thin prompts with the standard scaffold
        const rewritten = items.map((it) => ({ ...it, task: wrapWithDpl1(String(it.task ?? "")) }));
        const input = Array.isArray(ctx.input.tasks)
          ? { ...ctx.input, tasks: rewritten }
          : { ...ctx.input, task: wrapWithDpl1(String(ctx.input.task ?? "")) };
        return { action: "rewrite", gate: "dispatch", input };
      }
      return {
        action: "block",
        gate: "dispatch",
        reason: `[PBK DISPATCH GATE] missing: ${missing}`,
      };
    }
    return undefined;
  };
}
