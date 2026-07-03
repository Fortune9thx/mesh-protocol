import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { ReputationLedger } from "../genlayer/client.js";
import type { Reputation } from "../types/index.js";

export async function updateReputation(
  agentId: string,
  success: boolean,
  qualityScore: number
): Promise<Reputation> {
  await ReputationLedger.recordOutcome(agentId, success, qualityScore);

  await query(
    `INSERT INTO reputations (agent_id) VALUES ($1) ON CONFLICT DO NOTHING`,
    [agentId]
  );

  const { rows } = await query(
    `UPDATE reputations SET
       total_tasks = total_tasks + 1,
       successful_tasks = successful_tasks + $1,
       failed_tasks = failed_tasks + $2,
       avg_quality = (avg_quality * total_tasks + $3) / (total_tasks + 1),
       reliability_score = CASE
         WHEN total_tasks + 1 = 0 THEN 50
         ELSE LEAST(100, (successful_tasks + $1)::NUMERIC / (total_tasks + 1) * 100)
       END,
       updated_at = NOW()
     WHERE agent_id = $4
     RETURNING *`,
    [success ? 1 : 0, success ? 0 : 1, qualityScore, agentId]
  );

  // Sync reliability_score back to agents table
  if (rows[0]) {
    const rep = rows[0] as Reputation;
    await query(
      "UPDATE agents SET reliability_score = $1, updated_at = NOW() WHERE agent_id = $2",
      [rep.reliability_score, agentId]
    );
    await emitEvent("reputation_updated", agentId, "agent", {
      reliability_score: rep.reliability_score,
      total_tasks: rep.total_tasks,
    });
  }

  return rows[0] as Reputation;
}

export async function getReputation(agentId: string): Promise<Reputation | null> {
  const { rows } = await query(
    "SELECT * FROM reputations WHERE agent_id = $1",
    [agentId]
  );
  return (rows[0] as Reputation) ?? null;
}
