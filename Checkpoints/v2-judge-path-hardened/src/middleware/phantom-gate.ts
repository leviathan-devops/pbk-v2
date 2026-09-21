/**
 * phantom-gate — claims about ct-* tool results require an actual
 * recorded run this session (evidence-gated). (port of the PHANTOM gating)
 */
import { BeforeGate } from "./chain";

export class RecordedRunSet {
  private runs = new Map<string, number>(); // toolName → lastRunTimestamp
  record(toolName: string, ts: number = Date.now()): void {
    this.runs.set(toolName, Math.max(this.runs.get(toolName) ?? 0, ts));
  }
  has(toolName: string): boolean {
    return this.runs.has(toolName);
  }
  /** True if the tool ran at or after the given timestamp (the claim ordering: a
   * pre-claim run does NOT clear — v4.4.2 containerTestTimestamp > claimTimestamp). */
  hasAfter(timestamp: number, toolName: string): boolean {
    const ts = this.runs.get(toolName);
    return ts !== undefined && ts >= timestamp;
  }
  clear(): void {
    this.runs.clear();
  }
  snapshot(): string[] {
    return [...this.runs.keys()];
  }
  rehydrate(names: string[]): void {
    for (const n of names) this.runs.set(n, Date.now());
  }
}

const OWNED_TOOL_NAMES = [
  "code-audit",
  "deep-planning",
  "problem-solving",
  "context-synthesis",
  "poseidon-tool",
  "ct-sandbox-test",
  "ct-gate",
  "ct-status",
  "omni-vision",
];

const CLAIM_REFERENCE_RE = /(the\s+)?(audit|plan|solve|synthesis|container test|gate|status)\s+(found|reported|showed|returned|revealed|says|said|indicates?|confirmed|passed|failed)/i;

export function phantomGate(recorded: RecordedRunSet): BeforeGate {
  void recorded;
  return async () => undefined; // detection happens on message_end (below); the gate blocks follow-up ct calls only
}

/** On assistant text: if it cites a ct result that never ran → demand. */
export function phantomClaimCheck(recorded: RecordedRunSet, text: string): boolean {
  if (!CLAIM_REFERENCE_RE.test(text)) return false;
  return !OWNED_TOOL_NAMES.some((t) => recorded.has(t));
}
