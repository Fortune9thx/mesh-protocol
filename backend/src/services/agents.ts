import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { AgentRegistry } from "../genlayer/client.js";
import type { Agent, RegisterAgentInput } from "../types/index.js";

export async function registerAgent(input: RegisterAgentInput): Promise<Agent> {
  const id = uuid();
  const now = new Date();

  const { rows } = await query(
    `INSERT INTO agents (agent_id, name, owner_wallet, category, capabilities, pricing_model, base_price,
       availability, reliability_score, confidence_score, endpoint_url, status, autonomy_level, spending_limit, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      id, input.name, input.owner_wallet, input.category,
      input.capabilities, input.pricing_model, input.base_price,
      input.availability, 50, 50,
      input.endpoint_url ?? null, "active",
      input.autonomy_level ?? 1, input.spending_limit ?? 1000,
      now, now,
    ]
  );

  await query(
    `INSERT INTO reputations (agent_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [id]
  );

  await AgentRegistry.registerAgent(
    id,
    input.name,
    input.category,
    input.capabilities,
    input.base_price
  );

  await emitEvent("agent_registered", id, "agent", { name: input.name });
  return rows[0] as Agent;
}

export async function updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent | null> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  const allowed = ["name", "category", "capabilities", "pricing_model", "base_price",
    "availability", "endpoint_url", "status", "autonomy_level", "spending_limit"] as const;

  for (const key of allowed) {
    if (key in updates) {
      setClauses.push(`${key} = $${idx}`);
      values.push((updates as Record<string, unknown>)[key]);
      idx++;
    }
  }

  if (setClauses.length === 0) return getAgent(agentId);

  setClauses.push(`updated_at = $${idx}`);
  values.push(new Date());
  idx++;
  values.push(agentId);

  const { rows } = await query(
    `UPDATE agents SET ${setClauses.join(", ")} WHERE agent_id = $${idx} RETURNING *`,
    values
  );

  if (rows.length === 0) return null;
  await emitEvent("agent_updated", agentId, "agent", updates);
  return rows[0] as Agent;
}

export async function getAgent(agentId: string): Promise<Agent | null> {
  const { rows } = await query("SELECT * FROM agents WHERE agent_id = $1", [agentId]);
  return (rows[0] as Agent) ?? null;
}

export async function listAgents(filters?: { status?: string; category?: string }): Promise<Agent[]> {
  let sql = "SELECT * FROM agents WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.category) {
    params.push(filters.category);
    sql += ` AND category = $${params.length}`;
  }
  sql += " ORDER BY reliability_score DESC";

  const { rows } = await query(sql, params);
  return rows as Agent[];
}

export async function pauseAgent(agentId: string): Promise<Agent | null> {
  const result = await updateAgent(agentId, { status: "paused" } as Partial<Agent>);
  if (result) {
    await AgentRegistry.pauseAgent(agentId);
    await emitEvent("agent_paused", agentId, "agent");
  }
  return result;
}

export async function deactivateAgent(agentId: string): Promise<Agent | null> {
  return updateAgent(agentId, { status: "deactivated" } as Partial<Agent>);
}
