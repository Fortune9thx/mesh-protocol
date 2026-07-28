import { v4 as uuid } from "uuid";
import { createHash } from "crypto";
import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { IntentRegistry } from "../genlayer/client.js";
import type { Intent, SubmitIntentInput, IntentStatus } from "../types/index.js";

export async function submitIntent(input: SubmitIntentInput): Promise<Intent> {
  const id = uuid();
  const now = new Date();

  const { rows } = await query(
    `INSERT INTO intents (intent_id, requester, title, description, requirements, budget, deadline, priority, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     RETURNING *`,
    [id, input.requester, input.title, input.description, input.requirements, input.budget, input.deadline, input.priority, "pending", now, now]
  );

  const storageHash = createHash("sha256")
    .update(JSON.stringify({ title: input.title, description: input.description, requirements: input.requirements }))
    .digest("hex");
  await IntentRegistry.submitIntent(id, storageHash, input.budget, Math.floor(input.deadline.getTime() / 1000));

  await emitEvent("intent_submitted", id, "intent", { title: input.title, budget: input.budget });
  return rows[0] as Intent;
}

export async function getIntent(intentId: string): Promise<Intent | null> {
  const { rows } = await query("SELECT * FROM intents WHERE intent_id = $1", [intentId]);
  return (rows[0] as Intent) ?? null;
}

export async function updateIntentStatus(intentId: string, status: IntentStatus): Promise<Intent | null> {
  const { rows } = await query(
    "UPDATE intents SET status = $1, updated_at = $2 WHERE intent_id = $3 RETURNING *",
    [status, new Date(), intentId]
  );
  if (rows[0]) await IntentRegistry.updateStatus(intentId, status);
  return (rows[0] as Intent) ?? null;
}

export async function cancelIntent(intentId: string): Promise<Intent | null> {
  const { rows } = await query(
    "UPDATE intents SET status = 'cancelled', updated_at = $1 WHERE intent_id = $2 RETURNING *",
    [new Date(), intentId]
  );
  if (!rows[0]) return null;
  await IntentRegistry.cancelIntent(intentId);
  await emitEvent("intent_cancelled", intentId, "intent");
  return rows[0] as Intent;
}

export async function listIntents(filters?: { status?: string; requester?: string }): Promise<Intent[]> {
  let sql = "SELECT * FROM intents WHERE 1=1";
  const params: unknown[] = [];

  if (filters?.status) {
    params.push(filters.status);
    sql += ` AND status = $${params.length}`;
  }
  if (filters?.requester) {
    params.push(filters.requester);
    sql += ` AND requester = $${params.length}`;
  }
  sql += " ORDER BY created_at DESC";

  const { rows } = await query(sql, params);
  return rows as Intent[];
}
