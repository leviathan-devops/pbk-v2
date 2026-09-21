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
import { existsSync, readFileSync } from "node:fs";
import { kernelJudge } from "./ext/kernel-judge";
import { bindAtoms, parseClaimAtoms, type RingSpan } from "./ext/claim-bind";
// V-048: the L0 (W3's six kernels + role filter + quote exclusion + ST-7 escalation) was imported by
// NOTHING outside its own directory — three test files were its only consumers, so it never ran in the
// deployed extension. "A gate that cannot fire is not a layer." It is wired here, at the settled
// boundary: the same seam the claim firewall uses, judging the AGENT's text (not host envelopes, not
// quoted regions — the role classifier inside decide() enforces that).
import { decide as l0Decide } from "./l0/index";

const LOAD_MARKER = "__OMP_CT_LOADED__";

export default function ctExtension(pi: ExtensionAPI): void {
  // V-024 INSTRUMENT (the resume condition): log from INSIDE the extension's own init,
  // before anything else can throw. If this marker is ABSENT in a session whose load
  // failed, the failure is at/before module evaluation; if PRESENT, the failure is after.
  try {
    const { appendFileSync } = require("node:fs");
    appendFileSync("/tmp/ct-init.log", `[${new Date().toISOString()}] ctExtension() entered marker=${String((globalThis as Record<string, unknown>)[LOAD_MARKER] ?? "unset")}\n`);
  } catch { /* instrumentation must never break the extension */ }
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
  // V-027 INSTRUMENT: prove whether the chain's handler is invoked at all for a model-origin
  // tool call. If this line is ABSENT when the model calls bash, the chain never runs (the
  // registration exists without the invocation); if PRESENT, the chain runs and the gate is
  // mis-classifying downstream.
  try {
    const { appendFileSync } = require("node:fs");
    appendFileSync("/tmp/ct-chain.log", `[${new Date().toISOString()}] chain built\n`);
  } catch { /* instrumentation never breaks the extension */ }
  chain.useBefore(docDensityGate(host));
  chain.useBefore(containerGate());
  chain.useBefore(guardianGate());
  chain.useBefore(containerWriteGate());
  chain.useBefore(dispatchGate());
  chain.useBefore(sttgfGate());
  chain.useBefore(theatricalGate(theatricalTracker));
  chain.useAfter(theatricalGateAfter(theatricalTracker, () => recordedRuns.hasAfter(sttgfStateTracker.getState("default").containerTestTimestamp ?? 0, "ct-sandbox-test")));

  // ── V-027 FIX ──────────────────────────────────────────────────────────────
  // THE CHAIN WAS BUILT AND NEVER ATTACHED. `attachChain` (which performs the
  // `pi.on("tool_call", …)` registration) was imported but never called — so no gate ever
  // ran, in ANY session, while the extension loaded and its tool registered. The second
  // missing piece: `markReady()` was never called, so `attachChain`'s warmup guard
  // (`if (isReady && !isReady()) return undefined`) would have passed every call anyway.
  // Both are required. The extension is fully built at this point, so it is ready.
  markReady();
  attachChain(pi, chain, scopeOf, isReady);
  host.log("INFO", "omp-ct", "chain ATTACHED (V-027) — the gates are now consulted on tool_call");

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
  // V-026: the runtime emits `agent_end` (underscore) and `message_end`; the original
  // registration used "agent-end" (hyphen), which never fires — so the claim arming AND
  // the L2 claim bind were silently dead. Register under the real names (the hyphen form
  // is kept for compatibility with any host that does emit it).
  // V-040: the L1 judge's per-turn cap needs a TURN IDENTITY, and the tool_result payload carries
  // none. The turn boundary is exactly this handler (agent_end / message_end), so it advances the
  // judge's turn counter — without it, MAX_ACT_APPENDS_PER_RULE_PER_TURN was a permanent cap and the
  // repair channel went silent after 2 firings per rule, for the whole process.
  let turnCounter = 0;
  const settledHandler = (event: { messages?: unknown[] }, c: OmpExtensionContext) => {
    turnCounter += 1;
    try { judge.setTurn(turnCounter); } catch { /* the judge is declared below; it exists by first call */ }
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
        if (text) {
          const sid = String((c as unknown as Record<string, unknown>).sessionID ?? "default");
          armClaimFromCompletedMessage(sid, text);
          // ── V2 L2: the claim firewall — bind the claim's atoms to this turn's evidence
          // ring; fail CLOSED. No bound span => FABRICATED (recorded jev_called=false).
          try {
            const atoms = parseClaimAtoms(text);
            if (atoms.length > 0) {
              const ring = ringFromLedger();
              const res = bindAtoms(atoms, ring, { currentTurn: ring.length > 0 ? ring[ring.length - 1].ts : undefined });
              host.log(res.verdict === "PASS" ? "INFO" : "WARN", "omp-ct", `[CT CLAIM] ${res.verdict} — ${res.reason ?? "claim bound to this turn's evidence"}`);
            }
          } catch { /* the claim gate is non-fatal; the arming above still stands */ }

          // ── V-048: THE L0 LAYER (W3) — the six kernels, live.
          // decide() runs the role classifier FIRST (host envelopes and quoted regions never reach a
          // detector), then the typed members in priority order, and records its OWN ledger row with
          // the matched span whenever a member fires (the evidence law). This call is what makes the
          // L0 a LAYER rather than a library: it now observes every settled agent turn.
          try {
            const v = l0Decide(text);
            if (v.kind === 'act' || v.kind === 'flag') {
              const span = (v.matchedSpan ?? '').slice(0, 70);
              host.log(
                v.kind === 'act' ? 'WARN' : 'INFO',
                'omp-ct',
                `[CT L0] ${v.rule} ${v.kind.toUpperCase()}` +
                  (v.escalate ? ` — ESCALATE (${v.consecutive} consecutive firings)` : '') +
                  ` — "${span}"`,
              );
            }
          } catch { /* the L0 is non-fatal: it observes, it never breaks the turn */ }
        }
      }
    } catch { /* non-fatal */ }
  };

  // ── V2 LIVE PATH ───────────────────────────────────────────────────────────
  // The L1 per-edit judge: it registers its own tool_result handler and writes a
  // ledger row for EVERY branch (act/flag/clear/skip) — the auditability the ledger
  // front exists to provide. It never blocks the write.
  // V-029: a LABELLED stub judge mode so the band PLUMBING can be proven live without the
  // TypeSafe key. Set CT_JUDGE_STUB=<probability> (e.g. 0.9) to make every model rule return
  // that probability. This proves the path (call -> band -> repair-append -> ledger row ->
  // fail-open) and NOTHING about judge quality; every row it writes is labelled
  // `stub: true` so no reader can mistake it for a real verdict.
  const stubProb = process.env.CT_JUDGE_STUB;
  const judge = stubProb !== undefined
    ? kernelJudge({
        judge: async (rules) => {
          host.log("WARN", "omp-ct", `[CT JUDGE] STUB ACTIVE (CT_JUDGE_STUB=${stubProb}) — plumbing proof, NOT a real verdict`);
          return Object.fromEntries(rules.map((r) => [r.id, Number(stubProb)]));
        },
      })
    : kernelJudge();
  if (stubProb !== undefined) host.log("WARN", "omp-ct", `[CT JUDGE] stub judge mode (${stubProb}) — labelled plumbing proof`);
  judge.register(pi);
  host.log("INFO", "omp-ct", "kernel-judge registered (L1 per-edit, ledger-backed)");

  // The L2 claim firewall's ring: THIS TURN's evidence, read from the ledger's rows.
  // (The judge keeps its ring in memory; the ledger is the durable record both share.)
  const ringFromLedger = (limit = 40): RingSpan[] => {
    try {
      const p = ".abide/events.jsonl";
      if (!existsSync(p)) return [];
      const rows = readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map((l) => {
        try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; }
      }).filter(Boolean) as Array<Record<string, unknown>>;
      return rows
        .filter((r) => typeof r.matched_span === "string" && r.matched_span)
        .slice(-limit)
        .map((r) => ({ text: String(r.matched_span), ts: String(r.ts), source: String(r.rule) }));
    } catch { return []; }
  };

  pi.on("agent_end", settledHandler);
  pi.on("message_end", settledHandler);
  pi.on("agent-end", settledHandler); // legacy name, kept for hosts that emit it

  registerCtTools(pi, { host, recordedRuns });
}

export const IDENTITY_HEADER = ``;
