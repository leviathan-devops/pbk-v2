const VANILLA_AGENTS = new Set(['plan', 'build', 'general', 'explore']);

/** Plugin-owned agent identity — none after the CT-only debrand. */
export function isOwnedAgent(agentName: string | undefined): boolean {
  if (!agentName) return false;
  return false;
}

export function isOwnedBuildAgent(agentName: string | undefined): boolean {
  if (!agentName) return false;
  return false;
}

export function isVanillaAgent(agentName: string | undefined): boolean {
  return VANILLA_AGENTS.has(agentName ?? '');
}

export function isOtherPluginAgent(agentName: string | undefined): boolean {
  if (!agentName) return false;
  return !VANILLA_AGENTS.has(agentName) && !isOwnedAgent(agentName);
}
