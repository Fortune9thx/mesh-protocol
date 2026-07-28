import { AlphaResearchAgent } from "./agents/AlphaResearch.js";
import { WalletIntelAgent } from "./agents/WalletIntel.js";
import { RiskLensAgent } from "./agents/RiskLens.js";
import { CopyForgeAgent } from "./agents/CopyForge.js";
import type { AgentRuntime } from "./AgentRuntime.js";

const registry = new Map<string, AgentRuntime>();

function boot() {
  for (const agent of [
    new AlphaResearchAgent(),
    new WalletIntelAgent(),
    new RiskLensAgent(),
    new CopyForgeAgent(),
  ]) {
    registry.set(agent.id, agent);
    registry.set(agent.name.toLowerCase(), agent);
  }
}
boot();

export function getRuntime(nameOrId: string): AgentRuntime | undefined {
  return registry.get(nameOrId) ?? registry.get(nameOrId.toLowerCase());
}

export function listRuntimes(): AgentRuntime[] {
  // Deduplicate (same agent registered under name and id)
  const seen = new Set<string>();
  const result: AgentRuntime[] = [];
  for (const agent of registry.values()) {
    if (!seen.has(agent.id)) {
      seen.add(agent.id);
      result.push(agent);
    }
  }
  return result;
}
