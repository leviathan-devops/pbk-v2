/**
 * MiddlewareChain — the ordered enforcement chain (the single-pipeline law).
 *
 * Order (opencode parity, from the L2 spec §5.3): identity → doc-density →
 * leaf-node → container → dispatch → claim → theatrical → blocked-tools
 * (poseidon toolset). FIRST block short-circuits; rewrites replace the
 * execution input and the chain continues.
 */
import type {
  OmpToolCallEvent,
  OmpToolResultEvent,
  OmpExtensionContext,
} from "../types/omp";

export type AgentScope = "main" | "ct-build" | "explore" | "other";

export type GateVerdict =
  | { action: "allow" }
  | { action: "block"; gate: string; reason: string }
  | { action: "rewrite"; gate: string; input: Record<string, unknown> };

export interface BeforeContext {
  toolName: string;
  input: Record<string, unknown>;
  scope: AgentScope;
  isAgentOrigin: boolean;
  toolCallId: string;
  sessionId: string;
}

export type BeforeGate = (ctx: BeforeContext) => Promise<GateVerdict | undefined>;

export interface AfterContext {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  content: unknown[];
  details: Record<string, unknown>;
  isError: boolean;
  scope: AgentScope;
}

export type AfterGate = (ctx: AfterContext) => Promise<AfterContext>;

/** A gate that throws a structured block (parity with the opencode throw model). */
export class StructuredBlockError extends Error {
  constructor(public gate: string, message: string) {
    super(message);
    this.name = "StructuredBlockError";
  }
}

export class MiddlewareChain {
  private before: BeforeGate[] = [];
  private after: AfterGate[] = [];

  useBefore(g: BeforeGate): void {
    this.before.push(g);
  }

  useAfter(g: AfterGate): void {
    this.after.push(g);
  }

  /**
   * Run the before chain (the documented contract): FIRST block
   * short-circuits (throws StructuredBlockError); rewrites replace the
   * execution input and the chain continues; allow/undefined continues.
   * Enforcement inertia is owned by the per-gate kill switches
   * the chain itself is machinery — gates are unconditional (v6 has no kill-switch).
   */
  async runBefore(ctx: BeforeContext): Promise<GateVerdict> {
    let current: BeforeContext = ctx;
    for (const gate of this.before) {
      const verdict = await gate(current);
      if (!verdict) continue;
      if (verdict.action === "block") {
        throw new StructuredBlockError(verdict.gate, verdict.reason);
      }
      if (verdict.action === "rewrite") {
        current = { ...current, input: verdict.input };
      }
    }
    return { action: "allow", input: { ...current.input } } as GateVerdict;
  }

  /** Run the after chain (middleware-style: each handler sees prior patches). */
  async runAfter(ctx: AfterContext): Promise<AfterContext> {
    let current = ctx;
    for (const gate of this.after) {
      current = await gate(current);
    }
    return current;
  }

  get beforeCount(): number {
    return this.before.length;
  }

  get afterCount(): number {
    return this.after.length;
  }
}

/** Wire the chain into an omp extension API (structural). */
export function attachChain(pi: {
  on(event: string, handler: (event: any, ctx: OmpExtensionContext) => unknown): void;
}, chain: MiddlewareChain, scopeOf: (sessionId: string, ctx: OmpExtensionContext) => AgentScope, isReady?: () => boolean): void {
  pi.on("tool_call", (event: OmpToolCallEvent, ctx: OmpExtensionContext) => {
    // Warmup: before the first user input the extension is still loading —
    // host-init tool calls (capability probes, shell detection) must pass.
    if (isReady && !isReady()) return undefined;
    // Host-internal tool calls are NOT agent actions — enforcement applies to model-issued calls.
    if (event.isAgentOrigin === false) return undefined;
    const scope = scopeOf(ctx.sessionManager.getSessionFile(), ctx);
    return chain
      .runBefore({
        toolName: event.toolName,
        input: event.input,
        scope,
        isAgentOrigin: event.isAgentOrigin ?? true,
        toolCallId: event.toolCallId,
        sessionId: ctx.sessionManager.getSessionFile(),
      })
      .then((verdict) => {
        if (verdict.action === "rewrite") return { input: verdict.input };
        return undefined; // allow — no mutation
      })
      .catch((err) => {
        if (err instanceof StructuredBlockError) {
          throw new Error(err.message);
        }
        throw err;
      });
  });
  pi.on("tool_result", (event: OmpToolResultEvent, ctx: OmpExtensionContext) => {
    const scope = scopeOf(ctx.sessionManager.getSessionFile(), ctx);
    return chain.runAfter({
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      input: event.input,
      content: event.content,
      details: event.details,
      isError: event.isError,
      scope,
    }).then((patched) => {
      if (patched.content !== event.content || patched.details !== event.details) {
        return { content: patched.content, details: patched.details };
      }
      return undefined;
    });
  });
}
