import type { Agent, Intent } from "../../types/index.js";

export function MATCHING_PROMPT(intent: Intent, agents: Agent[]): string {
  const agentList = agents
    .map(
      (a) =>
        `- ${a.name} (${a.category}): capabilities=[${(a.capabilities as string[]).join(", ")}], price=${a.base_price} GEN, reliability=${a.reliability_score}`
    )
    .join("\n");

  return `You are the Mesh Protocol matching engine.

## Intent to fulfill
Title: ${intent.title}
Description: ${intent.description}
Requirements: ${(intent.requirements as string[]).join(", ")}
Budget: ${intent.budget} GEN
Deadline: ${intent.deadline}
Priority: ${intent.priority}

## Available Agents
${agentList}

Rank these agents from most to least suitable for this intent. Consider:
1. Capability match (most important)
2. Reliability/reputation score
3. Cost vs. budget fit
4. Availability

Respond with a JSON array of agent names in ranked order with brief reasoning:
[
  { "name": "AgentName", "rank": 1, "reason": "..." },
  ...
]`;
}
