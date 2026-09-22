/**
 * omp-ct — debranded container-testing enforcement extension.
 * Chain + session tracking + CT-only tools. No poseidon, no plugin-tool block.
 */
import type { ExtensionAPI, OmpExtensionContext } from "./types/omp";
import { createOmpEngineHost } from "./host-omp";
import { MiddlewareChain, attachChain, AgentScope } from "./middleware/chain";
// V-082 wired: doc-density v2 REPLACES v1 at the same chain position — a strict superset (the same
// per-type floor for a create, plus the five slop detectors and the accumulated-state rule for edits).
import { docDensityGateV2 } from "./middleware/doc-density-gate-v2";
import { dispatchGate } from "./middleware/dispatch-gate";
// V-081 wired: the template gate runs AHEAD of the legacy dispatch gate (its own module note says so).
import { dispatchTemplateGate } from "./middleware/dispatch-template-gate";
import { sttgfGate, armClaimFromCompletedMessage } from "./middleware/sttgf-gate";
import { sttgfStateTracker } from "./firewalls/semantic-smoke-firewall";
import { theatricalGate, theatricalGateAfter, TheatricalStateTracker } from "./middleware/theatrical-gate";
import { containerGate, containerWriteGate } from "./middleware/container-gate";
import { RecordedRunSet } from "./middleware/phantom-gate";
import { createSessionTracking } from "./hooks/session-hook";
import { registerCtTools } from "./tools/ct-registry";
import { existsSync, readFileSync } from "node:fs";
// V-084: the session attribution — the ring is scoped to THIS session's rows (the cross-session fix).
import { recordFiring, setLedgerSession, getLedgerSession  } from "./ledger/events-ledger";
// V-083/V-090 wired: the completion-claim detector — a verification claim the atom parser misses still
// demands evidence. Its two defects (the positive-loaded negation tokens and the unreachable audit
// exclusion) are fixed and pinned.
import { isCompletionClaim, CLAIM_STRONG_PHRASE_RE, CLAIM_WORD_RE } from "./middleware/claim-lexicon";
// WIRED (it was DEAD: its code was not in the shipped bundle, and its named consumer was the discarded
// surgical mutator). Its dependencies are all live, and it holds the capability the system lacked:
// **a claim is SLOP unless the evidence machine scores its subject LEGIT** — the degree-of-proof gates
// the claim. A unit-only "verified" is slop; a container-grade one is legit.
import { classifyMessageSpans } from "./firewalls/smoke-lexicon";
import { kernelJudge } from "./ext/kernel-judge";
import { bindAtoms, parseClaimAtoms, textMatchesAtom, judgeClaimViaTypeSafe, claimJudgeKey, type RingSpan } from "./ext/claim-bind";
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
  chain.useBefore(docDensityGateV2(host));
  chain.useBefore(containerGate());
  chain.useBefore(containerWriteGate());
  // DISABLED 2026-09-22 — operator: the dispatch-template gate BRICKED subagent dispatch.
  // A gate that blocks the operator's own ability to work is worse than the defect it guards.
  // Re-enable only after the fingerprint check is proven not to false-positive on legitimate dispatches.
  // chain.useBefore(dispatchTemplateGate(host));
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
  // V-056: async, because the claim judge's verdicts must be RESOLVED BEFORE bindAtoms (JudgeFn is
// synchronous by contract). The handler was sync when it passed no judge — the two facts are related.
const settledHandler = async (event: { messages?: unknown[]; message?: { role?: unknown; content?: unknown }; willContinue?: boolean; isTerminal?: boolean }, c: OmpExtensionContext) => {
    currentCtx = c;
    // ── V-049: HONOUR THE HOST'S OWN TERMINAL-SETTLE CONTRACT ──────────────────────────────────
    // The installed package's type doc is explicit
    //   (node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/shared-events.ts:196-201):
    //   "When true, the session has already scheduled an automatic continuation (auto-retry,
    //    empty/unexpected-stop retry, etc.). Subscribers MUST NOT treat this as a user-visible
    //    terminal settle."
    // willContinue:true is EMITTED (reachable, not hypothetical) at
    //   src/session/agent-session.ts:3305 · :3327 · :3352 (compaction continuations).
    // The runtime honours it itself: rpc-frame.ts:316 (`frame.willContinue !== true`) and
    //   agent-session.ts:3156 (`isTerminal: !options?.willContinue`), and the host's own consumer
    //   idiom is `event.isTerminal === false` (src/live/controller.ts:322).
    //
    // MEASURED DEFECT: this handler advanced the turn counter (V-040's TURN IDENTITY — the only thing
    // that bounds MAX_ACT_APPENDS_PER_RULE_PER_TURN) and ran the claim bind + the L0 on EVERY agent_end,
    // continuations included. A continuation is not a new turn: the counter advanced twice for one
    // logical turn, and claims were judged before the turn had actually settled.
    if (event?.willContinue === true || event?.isTerminal === false) return;

    // ── V-051: THE TURN IDENTITY ADVANCES ONLY ON THE EVENT THAT CARRIES THE TURN'S MESSAGE SET ──
    // The host's two shapes are unambiguous (extensions/types.ts:789-792 vs shared-events.ts:193-196):
    //   agent_end   -> `messages: AgentMessage[]`  (PLURAL — the whole loop)   = the TURN boundary
    //   message_end -> `message: AgentMessage`     (SINGULAR — one record)     = a MESSAGE
    // and `message_end` is emitted PER RECORD (`for (const record of records) { … emitExternalEvent(
    // { type: "message_end", message: record }) }` — session/agent-session.ts:946-952).
    //
    // MEASURED DEFECT: the handler advanced `turnCounter` on EVERY registered event, so a turn with N
    // messages rotated the judge's turn identity N+1 times. The per-turn ring is keyed by
    // `sessionId::T<currentTurn>` (kernel-judge.ts:734), so each rotation handed the rule a FRESH, EMPTY
    // ring: probed 2026-09-21 — 5 edits in ONE turn give 2 act-appends (the cap holds), but 5 edits with
    // the turn rotated give 5 (the cap is defeated). V-040's cap was undone one layer up.
    const isTurnBoundary = Array.isArray((event as { messages?: unknown })?.messages);
    // V-084: stamp THIS session on every row this process writes, before anything fires.
    try { setLedgerSession(String((c as unknown as Record<string, unknown>).sessionID ?? "")); } catch { /* no session -> rows stay unattributed and the ring excludes them */ }

    if (isTurnBoundary) {
      turnCounter += 1;
      try { judge.setTurn(turnCounter); } catch { /* the judge is declared below; it exists by first call */ }
    }
    try {
      // Both shapes are processed: the plural array (agent_end) or the singular message (message_end) —
      // so the fallback registration still does its job on a host that emits only one of them.
      const ev = event as { messages?: unknown; message?: { role?: unknown; content?: unknown } };
      const msgs = Array.isArray(ev?.messages)
        ? (ev.messages as Array<{ role?: unknown; content?: unknown }>)
        : ev?.message ? [ev.message] : [];
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
              const currentTurn = ring.length > 0 ? ring[ring.length - 1].ts : undefined;
              // ── V-056: SUPPLY THE JUDGE, OR THE PASS CANNOT HAPPEN ─────────────────────────────
              // MEASURED: this call passed `{ currentTurn }` and NO judge, so per claim-bind's own
              // contract every this-turn span fell to "no judge supplied -> atom unbound (FAIL_CLOSED)".
              // The bound-claim PASS the goal's stop condition names was unreachable BY CONSTRUCTION,
              // key or no key — the V-048 class (the seam exists; the live path omits the piece).
              // JudgeFn is SYNCHRONOUS, so the real verdicts are awaited FIRST (one call per atom-span)
              // and handed over as a sync lookup. Without a key the map is empty, NO judge is passed, and
              // the behaviour is exactly the old fail-closed one.
              const pre = new Map<string, Awaited<ReturnType<typeof judgeClaimViaTypeSafe>>>();
              for (const atom of atoms) {
                const span = ring.find((s) => s.ts === currentTurn && textMatchesAtom(atom, s.text));
                if (!span) continue;
                const k = claimJudgeKey(atom, span);
                if (pre.has(k)) continue;
                pre.set(k, await judgeClaimViaTypeSafe(atom, span));
              }
              const res = bindAtoms(atoms, ring, {
                currentTurn,
                ...(pre.size > 0
                  ? { judge: (atom, span) => pre.get(claimJudgeKey(atom, span)) ?? null }
                  : {}),
              });
              host.log(res.verdict === "PASS" ? "INFO" : "WARN", "omp-ct", `[CT CLAIM] ${res.verdict} — ${res.reason ?? "claim bound to this turn's evidence"}`);
            }

            // ── V-083/V-090 WIRED: THE COMPLETION-CLAIM DETECTOR ────────────────────────────────────
            // The atom parser (W5) extracts STRUCTURED atoms. The lexicon is the coarser detector: "is
            // this completed message a VERIFICATION claim at all?" — the module's own law, "no 'tested'
            // without sandbox evidence". A verification claim the atom parser MISSED is a coverage gap,
            // and it is recorded as a flag with its span (the evidence law: act/flag carry a span).
            if (atoms.length === 0 && isCompletionClaim(text)) {
              const m = CLAIM_STRONG_PHRASE_RE.exec(text) ?? CLAIM_WORD_RE.exec(text);
              const span = m ? m[0] : text.slice(0, 60);
              recordFiring({
                rule: "claim-lexicon",
                buffer: "agent-text",
                band: "flag",
                matched_span: span,
                verdict:
                  'a VERIFICATION claim with no structured atom — the lexicon caught what the atom parser ' +
                  'missed; the evidence demand applies (no "tested" without sandbox evidence)',
                jev_called: false,
              });
              host.log("WARN", "omp-ct", `[CT CLAIM LEXICON] a verification claim with no atom — "${span.slice(0, 50)}"`);
            }

            // ── THE SMOKE LEXICON WIRED: THE EVIDENCE VERDICT GATES THE CLAIM ──────────────────────
            // The sentence-level detector scores each claim against the EVIDENCE MACHINE's verdict:
            // LEGIT -> the claim stands; SMOKE / UNEVIDENCED / UNIT_ONLY -> the claim is SLOP (a claim
            // whose proof is a unit run, or nothing, is the theatrical class this whole layer exists for).
            // ADVISORY here (a flag row, never a block): the lexicon's own contract says the fail-open
            // direction is NON_CLAIM, and a claim is not an edit — nothing is blocked on this path.
            try {
              const sidForLex = String((c as unknown as Record<string, unknown>).sessionID ?? "default");
              for (const span of classifyMessageSpans(text, sidForLex)) {
                if (span.kind !== "CLAIM_SLOP") continue;
                const v = span.evidenceVerdict;
                recordFiring({
                  rule: "smoke-lexicon",
                  buffer: "agent-text",
                  band: "flag",
                  matched_span: String(span.text ?? "").slice(0, 200) || text.slice(0, 60),
                  verdict:
                    `CLAIM_SLOP — the evidence machine scores the subject ${v ? v.verdict : "UNEVIDENCED"} ` +
                    `(a claim whose proof is not container-grade). Subject: ${span.subject ?? "(dist-level)"}`,
                  jev_called: false,
                });
                host.log(
                  "WARN",
                  "omp-ct",
                  `[CT SLOP] "${String(span.text ?? "").slice(0, 50)}" — evidence: ${v ? v.verdict : "UNEVIDENCED"}`,
                );
              }
            } catch { /* the lexicon is advisory; it never breaks the turn */ }
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
  // ── V-084: THE RING IS SCOPED TO THIS SESSION (the cross-session evidence fix) ───────────────────
  // MEASURED, LIVE, on the host test: the ledger is CWD-SCOPED, so two omp sessions sharing a cwd append to
  // ONE file (512 rows in a single second from two different sessions in Shared_Workspace). This function
  // read the last 40 span-bearing rows of that SHARED file, so `currentTurn` was the last row ANY session
  // wrote — and a claim in THIS session could bind to ANOTHER session's evidence. The firewall's contract
  // is "span from THIS TURN"; unscoped, it was "span from whoever wrote last".
  // THE FIX: filter by the row's `session` (V-084's attribution field). A row WITHOUT a session is
  // EXCLUDED — unattributable is not evidence of this turn (the fail-closed direction).
  const ringFromLedger = (limit = 40): RingSpan[] => {
    try {
      const p = ".abide/events.jsonl";
      if (!existsSync(p)) return [];
      const sid = getLedgerSession();
      const rows = readFileSync(p, "utf8").split("\n").filter((l) => l.trim()).map((l) => {
        try { return JSON.parse(l) as Record<string, unknown>; } catch { return null; }
      }).filter(Boolean) as Array<Record<string, unknown>>;
      return rows
        .filter((r) => typeof r.matched_span === "string" && r.matched_span)
        .filter((r) => sid !== undefined && r.session === sid)   // V-084: THIS session's rows only
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
