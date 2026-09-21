/**
 * omp-ct — debranded container-testing enforcement extension.
 * Chain + session tracking + CT-only tools. No poseidon, no plugin-tool block.
 */
import type { ExtensionAPI, OmpExtensionContext } from "./types/omp";
import { createOmpEngineHost } from "./host-omp";
import { MiddlewareChain, attachChain, AgentScope } from "./middleware/chain";
import { docDensityGate } from "./middleware/doc-density-gate";
import { dispatchGate } from "./middleware/dispatch-gate";
import { sttgfGate, armClaimFromCompletedMessage } from "./middleware/sttgf-gate";
import { sttgfStateTracker } from "./firewalls/semantic-smoke-firewall";
import { theatricalGate, theatricalGateAfter, TheatricalStateTracker } from "./middleware/theatrical-gate";
import { containerGate, containerWriteGate } from "./middleware/container-gate";
import { RecordedRunSet } from "./middleware/phantom-gate";
import { createSessionTracking } from "./hooks/session-hook";
import { guardianGate } from "./hooks/guardian-hook";
import { registerCtTools } from "./tools/ct-registry";

const LOAD_MARKER = "__OMP_CT_LOADED__";

export default function ctExtension(pi: ExtensionAPI): void {
  const g = globalThis as Record<string, unknown>;
  if (g[LOAD_MARKER]) return;
  g[LOAD_MARKER] = true;

  pi.setLabel("OMP");

  let currentCtx: OmpExtensionContext;
  const ctx = (): OmpExtensionContext => currentCtx;
  const host = createOmpEngineHost(pi, ctx);
  const theatricalTracker = new TheatricalStateTracker();
  const recordedRuns = new RecordedRunSet();

  let ready = false;
  const markReady = (): void => { ready = true; };
  const isReady = (): boolean => ready;

  const scopeOf = (_sessionKey: string, _c: OmpExtensionContext): AgentScope => {
    return "main";
  };

  const chain = new MiddlewareChain();
  chain.useBefore(docDensityGate(host));
  chain.useBefore(containerGate());
  chain.useBefore(guardianGate());
  chain.useBefore(containerWriteGate());
  chain.useBefore(dispatchGate());
  chain.useBefore(sttgfGate());
  chain.useBefore(theatricalGate(theatricalTracker));
  chain.useAfter(theatricalGateAfter(theatricalTracker, () => recordedRuns.hasAfter(sttgfStateTracker.getState("default").containerTestTimestamp ?? 0, "ct-sandbox-test")));

  pi.on("session.compacting", (_event: unknown, c: OmpExtensionContext) => {
    currentCtx = c;
    return {
      context: [] as string[],
      preserveData: { ct: { phase: "idle" } },
    };
  });
  pi.on("session_compact", (_event: unknown) => {
    return undefined;
  });

  pi.on("session_start", (_event: unknown, c: OmpExtensionContext) => {
    currentCtx = c;
    pi.appendEntry("com.ct.state", { loaded: true, version: "2.0.0", ts: host.now() });
    host.log("INFO", "omp-ct", "extension loaded — container-testing first-class");
  });

  // Claim arming — v6 text.complete + messages.transform (:1030-1052, :3742-3746):
  // a COMPLETED AGENT MESSAGE arms via the lexicon; a tool result NEVER arms.
  pi.on("agent-end", (event: { messages?: unknown[] }, c: OmpExtensionContext) => {
    currentCtx = c;
    try {
      const msgs = Array.isArray(event?.messages) ? (event.messages as Array<{ role?: unknown; content?: unknown }>) : [];
      for (const m of msgs) {
        if (m?.role !== "assistant") continue;
        const parts = Array.isArray(m.content) ? m.content : [{ type: "text", text: typeof m.content === "string" ? m.content : "" }];
        let text = "";
        for (const p of parts as Array<{ type?: unknown; text?: unknown }>) {
          if (p?.type === "text" && typeof p.text === "string") text += p.text + " ";
        }
        if (text) armClaimFromCompletedMessage(String((c as unknown as Record<string, unknown>).sessionID ?? "default"), text);
      }
    } catch { /* non-fatal */ }
  });

  registerCtTools(pi, { host, recordedRuns });
}

export const IDENTITY_HEADER = ``;
