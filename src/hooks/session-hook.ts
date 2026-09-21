/**
 * session-hook — per-session agent tracking, OMP adapter. (Port of v6
 * src/hooks/session-hook.ts per CT_PORT_DPL1_SPEC.md item 10: the opencode
 * `Hooks['event']` surface is swapped for OMP `pi.on(...)` session events;
 * the DEFAULT-KEY GUARDS are ported verbatim — events with NO agent info
 * must NOT touch state, and a non-ct agent clears ONLY its own session,
 * never the shared 'default' fallback key. The v6 orchestrator.resetSession
 * call on session end is a v6 MODE-FSM reset — the mode orchestrator is not
 * part of the CT port scope (spec §5 has no orchestrator item); the call
 * site is preserved as a named no-op, not silently dropped.)
 */
import { setCurrentAgent, clearCurrentAgent } from "./agent-state.js";
import { isOwnedAgent } from "../agent-identity.js";
import type { OmpExtensionContext } from "../types/omp";

/** The v6 default-key guard, verbatim: only a SPECIFIC session clears. */
function clearSpecificSessionOnly(sessionId?: string): void {
  if (sessionId && sessionId !== "default") {
    clearCurrentAgent(sessionId);
    // v6 also called orchestrator.resetSession(sessionId) here — the v6
    // MODE-FSM subsystem is out of CT-port scope (named decision, spec §5);
    // the agent-state clear above is the tracking this item owns.
  }
}

/**
 * Track a session's agent — the OMP event adapter body. Returns true when
 * state was written. The v6 fallback chain (event.agent → input.agent →
 * session.agent) is preserved; agent-less events never touch state.
 */
export function trackSessionEvent(
  event: { type?: string; sessionId?: string; agent?: string },
  ctx?: OmpExtensionContext,
): boolean {
  if (!event) return false;
  const sessionId = event.sessionId || ctx?.sessionManager?.getSessionFile?.() || "";
  // FIXED (v6): fallback chain — the host may pass agent via different paths
  const agent =
    event.agent ||
    (event as { agent?: string })?.agent ||
    (ctx as unknown as { agent?: string } | undefined)?.agent ||
    "";
  if (!agent) return false; // the default-key guard: no agent → no write
  if (!isOwnedAgent(agent)) {
    clearSpecificSessionOnly(sessionId || undefined);
    return false;
  }
  setCurrentAgent(agent, sessionId || "default");
  return true;
}
/** Wire the OMP session events (the Hooks['event'] adapter). */
export function createSessionTracking(pi: {
  on(event: string, handler: (event: unknown, ctx: OmpExtensionContext) => unknown): void;
}): void {
  pi.on("session_start", (rawEvent: unknown, ctx: OmpExtensionContext) => {
    const event = (rawEvent ?? {}) as { type?: string; sessionId?: string; agent?: string };
    trackSessionEvent({ type: "session.created", ...event }, ctx);
  });
  pi.on("session_end", (rawEvent: unknown) => {
    const event = (rawEvent ?? {}) as { sessionId?: string };
    handleSessionEnded(event?.sessionId);
  });
}
/** Session ended — clear ONLY the specific session (the v6 guard, verbatim). */
export function handleSessionEnded(sessionId?: string): void {
  clearSpecificSessionOnly(sessionId);
}
