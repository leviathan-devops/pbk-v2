/**
 * guardian-hook — F1 isolation, OMP port. (Port of v6
 * src/hooks/guardian-hook.ts per CT_PORT_DPL1_SPEC.md item 11: the
 * plugin-specific tools cannot be called by a non-ct agent. The
 * import surface is swapped to the OMP tree — isOwnedAgent resolves from
 * src/identity-source/agent-identity.js, FirewallAudit from
 * src/shared/firewall-audit.js (ported verbatim). The v6
 * tool.execute.before caller shape is adapted to the OMP chain as
 * guardianGate(): the session agent resolves through the per-session
 * tracking this port owns (hooks/agent-state.js).)
 */
import { isOwnedAgent } from "../agent-identity.js";
import { getCurrentAgent } from "./agent-state.js";
import { FirewallAudit } from "../shared/firewall-audit.js";
import type { BeforeGate } from "../middleware/chain";

const audit = new FirewallAudit();

/** Returns the singleton FirewallAudit instance */
export function getFirewallAudit(): FirewallAudit {
  return audit;
}

const OWNED_TOOLS: Set<string> = new Set([
  "code-audit", "deep-planning", "problem-solving",
  "context-synthesis", "poseidon-tool", "ct-gate", "ct-status", "ct-vision", "ct-help",
]);

export function checkF1Isolation(toolName: string, sessionAgent: string | undefined): void {
  if (!isOwnedAgent(sessionAgent) && OWNED_TOOLS.has(toolName)) {
    throw new Error('[F1 BLOCKED] Tool "' + toolName + '" is plugin-specific and cannot be called by agent "' + sessionAgent + '".');
  }
}

// L5 theatrical firewalls removed — not needed for audit-only agent (v6 law)
export function checkTaskDispatch(_toolName: string, _input: Record<string, unknown>, _mode: string): void {
  // task is allowed unconditionally — the BLOCKED_TOOLS list and
  // ALLOWLIST in hook-chain.ts handle security for this tool.
  // This layer was causing false blocks and is intentionally passthrough.
  return;
}

export function checkGuardian(
  toolName: string,
  command: string | null,
  sessionAgent: string | undefined,
  currentGate: string,
  mode?: string,
  input?: Record<string, unknown>,
): void {
  if (!sessionAgent) return;
  const isCT = isOwnedAgent(sessionAgent);
  if (!isCT && OWNED_TOOLS.has(toolName)) {
    checkF1Isolation(toolName, sessionAgent);
  }
  if (isCT && command) {
  }
  // TASK_BLOCK: validate task dispatch against mode and subagent_type
  checkTaskDispatch(toolName, input || {}, mode || currentGate);
}

/** The OMP chain adapter: F1 isolation on the before chain (spec item 11). */
export function guardianGate(): BeforeGate {
  return async (ctx) => {
    const sessionAgent = getCurrentAgent(ctx.sessionId);
    // A session with NO tracked agent is the v6 'main' default — the F1
    // throw targets ONLY a non-ct NAMED agent calling ct tools.
    if (!sessionAgent) return undefined;
    try {
      checkF1Isolation(ctx.toolName, sessionAgent);
    } catch (e) {
      if (e instanceof Error && e.message.indexOf("[F1 BLOCKED]") === 0) {
        return { action: "block", gate: "guardian", reason: e.message };
      }
      throw e;
    }
    return undefined;
  };
}
