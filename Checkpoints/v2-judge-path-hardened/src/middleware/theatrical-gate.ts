/**
 * theatrical-gate — substitute-frame detection (v2), FAITHFUL PORT of
 * hook-chain.ts:383-413 + 1724-1745.
 *
 * v4.4.2 semantics (the operator's firewalls — "dont change that"):
 *   - No hard throw on args patterns. Substitute-frames in PROPOSAL tools
 *     (write/edit/send/task/bash content fields) SET STATE (suggested=true);
 *     the Phase B demand is appended on the NEXT tool output; escalation
 *     ONLY after 3 suggestions (parity with the SSTF claim gate).
 *   - Tool-context scoping: ONLY proposal-bearing tools are scanned.
 *     read/grep/glob args (paths/patterns) are NEVER proposals — a path
 *     mentioning mock/stub is not theater.
 *   - Legit USE frames (jest.mock, mock servers, stubs, installing mock
 *     libs) are NEVER blocked.
 *   - skipTheatrical guard: poseidon-unlocked tools and ct-* tools
 *     are not scanned (the port's own surfaces are not proposals).
 */
import { BeforeGate, AfterContext } from "./chain";

// ── THEATRICAL v2 lexicon — VERBATIM from hook-chain.ts:390-400 ──
const THEATRICAL_SUBSTITUTE_FRAMES: RegExp[] = [
  /\b(just|simply|only|why\s+not|we\s+can|i'?ll|i\s+will|let'?s|we\s+should|you\s+can)\s+(mock|stub|fake|pretend)\b/i,
  /\b(mock|stub|fake)\s+(the|this|that)\s+(result|response|output|tool|function|call|test|evidence|verification|audit)\b/i,
  /\bpretend\s+(the|this|it)\s+(test|audit|verification|check)\s+(passed|works|succeeded|is\s+done)\b/i,
  /\b(say|claim|report|write)\s+(that\s+)?(the|this|it)\s+(test|audit|verification)\s+(passed|works|succeeded)\b/i,
  // The container-dodge frame (OMP-ADAPTED 2026-08-10). Pattern A = the
  // explicit skip-and-replace dodge ("skip the container test, run on the
  // host"). Pattern B = the bare skip frame — a DETECTOR only: the decision
  // (isTheatricalSuggestion) rejects the sentence when it carries a
  // negation/dependency marker ANYWHERE in the sentence ("without the
  // container the test cannot run on this host" = a dependency, not a
  // dodge; "no need for the container, the host already has omp" = legit
  // when the host IS the runtime).
  /\b(skip\s+the\s+(container|docker|container\s+test)|just\s+run\s+it\s+on\s+the\s+host|let'?s\s+run\s+it\s+on\s+the\s+host|we\s+can\s+run\s+it\s+on\s+the\s+host)\b/i,
  // NOTE: the span is `.{0,120}` (NOT `[\s\S]`) — `.` does not cross a
  // newline, so a container word on one line can never match a host word on
  // another (the v4.4.2 span-boundary contract, enforced by
  // tests/seam/firewall.test.ts + tests/seam/theatrical-fp-verify.test.ts).
  // `[\s\S]` here re-opened the §5+§8.2 doc false positive ("without
  // container evidence" on line 1 paired with "host-only" on line 3).
  /\b(skip|without|no\s+need\s+for)\s+(the\s+)?(container|docker|container\s+test)\b.{0,120}\b(on\s+the\s+host|host)\b/i,
];

const THEATRICAL_USE_FRAMES: RegExp[] = [
  /\b(jest|vi|vitest|sinon)\s*\.\s*mock\(/i,
  /\b(npm|yarn|pnpm|bun)\s+(i|install|add)\s+\S*mock\S*/i,
  /\bmock\s+(data|server|endpoint|api|service|module|handler|fixture|response|request|object|file|config)\b/i,
  /\bstub\s+(api|endpoint|service|function|branch|method|request|handler|out|file)\b/i,
  /\bunmock\b|\bmock\s+implementation|\bmock\s+function/i,
];

/**
 * Tool-context scoping — VERBATIM from hook-chain.ts:690-698:
 * only proposal-bearing tools' CONTENT fields are scanned. The text is the
 * joined RAW content strings (real newlines preserved — the `.` in `.*`
 * does NOT cross a line, so a container word on one line cannot match a
 * host word on another). NEVER JSON.stringify the whole input: that
 * escapes newlines as \n and destroys the span boundary.
 */
const PROPOSAL_TOOLS: Record<string, string[]> = {
  write: ["content"],
  write_file: ["content"],
  edit: ["newString"],
  send: ["prompt", "text"],
  task: ["prompt", "description"],
  bash: ["command", "cmd", "text"],
};

export function proposalText(toolName: string, input: Record<string, unknown>): string {
  const keys = PROPOSAL_TOOLS[toolName];
  if (!keys) return "";
  return keys
    .map((k) => {
      const v = input[k];
      return typeof v === "string" ? v : "";
    })
    .join(" ");
}

export function isTheatricalSuggestion(text: string): boolean {
  if (!text) return false;
  if (THEATRICAL_USE_FRAMES.some((r) => r.test(text))) return false;
  const hit = THEATRICAL_SUBSTITUTE_FRAMES.some((r) => r.test(text));
  if (!hit) return false;
  // THE DEPENDENCY GUARD (OMP-ADAPTED 2026-08-10): a sentence that carries a
  // negation/dependency marker is a dependency statement, NOT a dodge.
  // "without the container the test cannot run on this host" — the container
  // is REQUIRED, the agent is not skipping it. "no need for the container,
  // the host already has omp" — legit when the host IS the runtime. The
  // dodge is an explicit SKIP-and-replace; the guard's frame (pattern A)
  // still flags those regardless.
  if (/\b(skip\s+the\s+(container|docker)|just\s+run\s+it\s+on\s+the\s+host|let'?s\s+run\s+it\s+on\s+the\s+host|we\s+can\s+run\s+it\s+on\s+the\s+host)\b/i.test(text)) {
    return true;
  }
  const DEPENDENCY_RE = /\b(cannot|can'?t|not\s+run|not\s+possible|must\s+(run|use|have)|needs?\s+(the\s+)?(container|docker)|requires?\s+(the\s+)?(container|docker)|already\s+has\s+omp|already\s+installed)\b/i;
  return !DEPENDENCY_RE.test(text);
}

export function detectSubstitute(text: string): string | null {
  if (THEATRICAL_USE_FRAMES.some((re) => re.test(text))) return null;
  for (const re of THEATRICAL_SUBSTITUTE_FRAMES) {
    const m = re.exec(text);
    if (m) return m[0];
  }
  return null;
}

// ── Per-session theatrical state (v4.4.2: theatricalState Map) ──
export class TheatricalStateTracker {
  private states = new Map<string, { suggested: boolean; ts: number; count: number }>();
  private readonly windowMs = 300_000;

  get(sid: string): { suggested: boolean; ts: number; count: number } {
    let s = this.states.get(sid);
    if (!s) {
      s = { suggested: false, ts: 0, count: 0 };
      this.states.set(sid, s);
    }
    return s;
  }
  mark(sid: string): number {
    const s = this.get(sid);
    s.suggested = true;
    s.ts = Date.now();
    s.count++;
    return s.count;
  }
  pending(sid?: string): boolean {
    if (sid) {
      const s = this.states.get(sid);
      return !!s && s.suggested && Date.now() - s.ts < this.windowMs;
    }
    // After-context has no sessionId — any pending suggestion gates the demand
    for (const s of this.states.values()) {
      if (s.suggested && Date.now() - s.ts < this.windowMs) return true;
    }
    return false;
  }
  clear(sid?: string): void {
    if (sid) this.states.delete(sid);
    else this.states.clear();
  }
  count(sid: string): number {
    return this.states.get(sid)?.count ?? 0;
  }
}

/** skipTheatrical guard — v4.4.2: poseidon-unlocked + ct-* tools skip. */
const POSEIDON_UNLOCKED_TOOLS = [
  "bash", "write", "write_file", "edit", "patch", "create", "delete_file",
];
export function skipTheatrical(toolName: string, poseidonActive: boolean): boolean {
  if (POSEIDON_UNLOCKED_TOOLS.includes(toolName) && poseidonActive) return true;
  if (toolName && toolName.startsWith("ct-")) return true;
  return false;
}

const ESCALATION_THRESHOLD = 3;

const PHASE_B_DEMAND =
  "[CT THEATRICAL GATE] substitute-frame detected — build the real thing and verify in the sandbox. " +
  "Call the ct-sandbox-test AGENT TOOL (sandbox test) with a 2000-char, 6-section plan (OBJECTIVE / TOOLS UNDER TEST / TEST SCENARIOS 3+ / " +
  "ADVERSARIAL 1+ / EVIDENCE / PASS CRITERIA), then cite ContainerTestResult.json.";

/**
 * Before-gate (v4.4.2 parity): NO hard throw on args patterns. Sets state;
 * escalation ONLY after 3 suggestions → throw [CT THEATRICAL ESCALATE].
 * Returns undefined (allow) otherwise — the Phase B demand rides the after-gate.
 */
export function theatricalGate(state: TheatricalStateTracker, opts: { poseidonActive: () => boolean } = { poseidonActive: () => false }): BeforeGate {
  return async (ctx) => {
    if (!ctx.isAgentOrigin) return undefined;
    if (skipTheatrical(ctx.toolName, opts.poseidonActive())) return undefined;
    const text = proposalText(ctx.toolName, ctx.input);
    if (!text) return undefined;
    if (!isTheatricalSuggestion(text)) return undefined;
    const count = state.mark(ctx.sessionId);
    // Escalation ONLY after 3 (v4.4.2 parity). First two hits: state-set only.
    if (count >= ESCALATION_THRESHOLD) {
      return {
        action: "block",
        gate: "theatrical",
        reason: "[CT THEATRICAL ESCALATE] repeated substitute-frame suggestions. Running a REAL container test is MANDATORY.",
      };
    }
    return undefined; // allow — Phase B demand appends on the next output
  };
}

/**
 * After-gate (Phase B demand): if a substitute-frame suggestion is pending
 * for this session and no container test has run, append the demand to the
 * tool output (mutation, never throw). A st run clears.
 */
export function theatricalGateAfter(state: TheatricalStateTracker, containerTestRan: () => boolean): (ctx: AfterContext) => Promise<AfterContext> {
  return async (ctx: AfterContext): Promise<AfterContext> => {
    if (ctx.toolName === "ct-sandbox-test" || ctx.toolName === "container-test") {
      state.clear();
      return ctx;
    }
    if (containerTestRan()) {
      state.clear();
      return ctx;
    }
    if (!state.pending()) return ctx;
    const already = ctx.content
      .filter((b): b is { type: string; text: string } => typeof b === "object" && b !== null && "text" in b)
      .map((b) => b.text)
      .join("\n");
    if (already.includes("[CT THEATRICAL GATE]")) return ctx; // no double-append
    return { ...ctx, content: [...ctx.content, { type: "text" as const, text: "\n" + PHASE_B_DEMAND }] };
  };
}
