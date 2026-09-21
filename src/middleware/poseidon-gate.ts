/**
 * poseidon-gate — reconstructed 2026-09-18 (W44 ct-unblock).
 * The original module was deleted from the tree WITHOUT a commit (the
 * 2026-09-17 middleware removal note in index.ts), leaving only its consumers:
 * index.ts constructs + threads it, /poseidon (commands/poseidon.ts) and the
 * poseidon-tool tool (tools/registry.ts) call exactly four members —
 * isActive(), setActive(target), setInactive(), getTarget(). The gate's
 * middleware ENFORCEMENT role was already removed (it returned undefined
 * always); what survives is the agent-facing god-loop activation state.
 * setInactive() clears the target: registry reads getTarget() ?? cwd only to
 * fall back, and a stale target after deactivate would misdirect status.
 */
export class PoseidonGateState {
  private active = false;
  private target: string | null = null;

  isActive(): boolean {
    return this.active;
  }

  setActive(target: string): void {
    this.active = true;
    this.target = target;
  }

  setInactive(): void {
    this.active = false;
    this.target = null;
  }

  getTarget(): string | null {
    return this.target;
  }
}
