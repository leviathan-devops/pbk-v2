/**
 * Structural omp ExtensionAPI types for the pbk port.
 *
 * NOTE: these are LOCAL structural approximations of the runtime API
 * (the real types ship in @oh-my-pi/pi-coding-agent, which is bundled
 * with the omp binary, not the npm registry). The runtime satisfies
 * this shape; the port imports types from here until the real package
 * is resolvable. Swap to the real package when available.
 */

export type OmpContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; image?: string; mediaType?: string; mimeType?: string; data?: string };

export type DeliverAs = "steer" | "followUp" | "nextTurn";

export interface OmpSendMessageOptions {
  deliverAs?: DeliverAs;
  triggerTurn?: boolean;
}

export interface OmpToolCallEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  isAgentOrigin?: boolean;
}

export interface OmpToolResultEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  content: unknown[];
  details: Record<string, unknown>;
  isError: boolean;
}

export interface OmpContextEvent {
  messages: unknown[];
}

export interface OmpCompactingEvent {
  context?: string[];
  prompt?: string;
  preserveData?: Record<string, unknown>;
}

export interface OmpAgentEndEvent {
  messages: unknown[];
  isTerminal?: boolean;
}

export interface OmpUi {
  notify(message: string, level?: "info" | "warn" | "error" | "success"): void;
  setStatus(key: string, text: string): void;
  confirm(title: string, message: string): Promise<boolean>;
  select<T>(title: string, items: Array<{ value: T; label: string }>): Promise<T | undefined>;
  input(title: string, placeholder?: string): Promise<string | undefined>;
}

export interface OmpExtensionContext {
  hasUI: boolean;
  cwd: string;
  ui: OmpUi;
  sessionManager: {
    getBranch(): Array<{ type: string; customType?: string; data?: unknown; [k: string]: unknown }>;
    getSessionFile(): string;
  };
  isIdle(): boolean;
  abort(): void;
  hasPendingMessages(): boolean;
  models: {
    current(): { provider: string; id: string } | undefined;
    resolve(spec: string): unknown;
  };
  setInterval(fn: () => void, ms: number): unknown;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
}

export interface OmpCommandContext extends OmpExtensionContext {
  waitForIdle(): Promise<void>;
}

export interface OmpToolParams {
  [key: string]: unknown;
}

export interface OmpToolResult {
  content: OmpContentBlock[];
  details?: Record<string, unknown>;
  isError?: boolean;
}

export interface OmpToolDefinition {
  name: string;
  label?: string;
  description: string;
  parameters: unknown; // pi.zod object schema (omptype-backed)
  hidden?: boolean;
  defaultInactive?: boolean;
  loadMode?: "essential" | "discoverable";
  execute(
    toolCallId: string,
    params: OmpToolParams,
    signal?: AbortSignal,
    onUpdate?: (u: { content?: OmpContentBlock[]; details?: Record<string, unknown> }) => void,
    ctx?: OmpExtensionContext,
  ): Promise<OmpToolResult>;
}

export interface OmpCommandDefinition {
  description: string;
  subcommands?: Record<string, { description: string }>;
  input?: { hint?: string };
  handler(args: string | string[], ctx: OmpCommandContext): Promise<string | void>;
}

export interface OmpExecResult {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
}

export interface ExtensionAPI {
  on(event: string, handler: (event: any, ctx: OmpExtensionContext) => unknown): void;
  registerCommand(name: string, def: OmpCommandDefinition): void;
  registerTool(def: OmpToolDefinition): void;
  registerShortcut(keys: string[], action: () => void): void;
  sendMessage(message: { text: string; [k: string]: unknown }, options?: OmpSendMessageOptions): void;
  sendUserMessage(content: string, options?: OmpSendMessageOptions): void;
  appendEntry(customType: string, data: unknown): void;
  exec(cmd: string, opts?: { timeoutMs?: number; cwd?: string }): Promise<OmpExecResult>;
  setActiveTools(tools: string[]): void;
  getActiveTools(): string[];
  getSystemPrompt(): string;
  setLabel(label: string): void;
  logger: { log(level: string, msg: string, data?: unknown): void };
  pi: Record<string, unknown>;
  /** Zod-compatible schema builder backed by omptype — registerTool parameters MUST use this. */
  zod: {
    object(schema: Record<string, unknown>): unknown;
    string(): any;
    number(): any;
    boolean(): any;
    array(item: any): any;
    enum(values: readonly string[]): any;
  };
}

export type { OmpExtensionContext as ExtensionContext };
