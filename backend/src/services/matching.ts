import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { listAgents } from "./agents.js";
import { updateIntentStatus } from "./intents.js";
import type { Agent, Intent, Match } from "../types/index.js";

interface ScoringWeights {
  capability: number;
  reputation: number;
  cost: number;
  latency: number;
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  capability: 0.4,
  reputation: 0.25,
  cost: 0.2,
  latency: 0.15,
};

function scoreCapability(agent: Agent, requirements: string[]): number {
  if (requirements.length === 0) return 50;
  const caps = (agent.capabilities as string[]).map((c: string) => c.toLowerCase());
  let matched = 0;
  for (const req of requirements) {
    const reqLower = req.toLowerCase();
    if (caps.some((c) => c.includes(reqLower) || reqLower.includes(c))) {
      matched++;
    }
  }
  return (matched / requirements.length) * 100;
}

function scoreCost(agentPrice: number, budget: number): number {
  if (agentPrice <= 0) return 100;
  if (agentPrice > budget) return Math.max(0, 100 - ((agentPrice - budget) / budget) * 100);
  return 100 - ((agentPrice / budget) * 30);
}

function scoreAgent(agent: Agent, intent: Intent, weights: ScoringWeights = DEFAULT_WEIGHTS) {
  const capability_score = scoreCapability(agent, intent.requirements as string[]);
  const reputation_score = Number(agent.reliability_score);
  const cost_score = scoreCost(Number(agent.base_price), Number(intent.budget));
  const latency_score = agent.availability ? 80 : 20;

  const score =
    capability_score * weights.capability +
    reputation_score * weights.reputation +
    cost_score * weights.cost +
    latency_score * weights.latency;

  return { score, capability_score, reputation_score, cost_score, latency_score };
}

export async function matchIntent(
  intent: Intent,
  weights?: Partial<ScoringWeights>,
  maxResults = 5
): Promise<Match[]> {
  const agents = await listAgents({ status: "active" });
  const w = { ...DEFAULT_WEIGHTS, ...weights };

  const scored = agents
    .map((agent) => ({ agent, ...scoreAgent(agent, intent, w) }))
    .filter((s) => s.capability_score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  await updateIntentStatus(intent.intent_id, "matching");

  const matches: Match[] = [];
  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    const matchId = uuid();

    await query(
      `INSERT INTO matches (match_id, intent_id, agent_id, score, capability_score, reputation_score, cost_score, latency_score, rank)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [matchId, intent.intent_id, s.agent.agent_id, s.score, s.capability_score, s.reputation_score, s.cost_score, s.latency_score, i + 1]
    );

    matches.push({
      match_id: matchId,
      intent_id: intent.intent_id,
      agent_id: s.agent.agent_id,
      score: s.score,
      capability_score: s.capability_score,
      reputation_score: s.reputation_score,
      cost_score: s.cost_score,
      latency_score: s.latency_score,
      rank: i + 1,
      created_at: new Date(),
    });

    await emitEvent("match_found", matchId, "match", {
      intent_id: intent.intent_id,
      agent_id: s.agent.agent_id,
      score: s.score,
      rank: i + 1,
    });
  }

  return matches;
}

export async function getMatchesForIntent(intentId: string): Promise<Match[]> {
  const { rows } = await query(
    "SELECT * FROM matches WHERE intent_id = $1 ORDER BY rank ASC",
    [intentId]
  );
  return rows as Match[];
}
