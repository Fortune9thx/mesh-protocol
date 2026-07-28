import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { NegotiationEngine } from "../genlayer/client.js";
import type { Negotiation, NegotiationStatus } from "../types/index.js";

export interface NegotiateInput {
  intent_id: string;
  requester_agent: string;
  provider_agent: string;
  proposed_price: number;
  deadline: Date;
  quality_threshold?: number;
  confidence_guarantee?: number;
  max_rounds?: number;
}

export async function startNegotiation(input: NegotiateInput): Promise<Negotiation> {
  const id = uuid();
  const now = new Date();

  const { rows } = await query(
    `INSERT INTO negotiations
       (negotiation_id, intent_id, requester_agent, provider_agent, proposed_price, deadline,
        quality_threshold, confidence_guarantee, status, round, max_rounds, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      id, input.intent_id, input.requester_agent, input.provider_agent,
      input.proposed_price, input.deadline,
      input.quality_threshold ?? 80, input.confidence_guarantee ?? 70,
      "pending", 0, input.max_rounds ?? 5, now, now,
    ]
  );

  await NegotiationEngine.record(
    id,
    input.intent_id,
    input.requester_agent,
    input.provider_agent,
    input.proposed_price
  );

  await emitEvent("negotiation_started", id, "negotiation", {
    intent_id: input.intent_id,
    proposed_price: input.proposed_price,
  });

  return rows[0] as Negotiation;
}

export async function counterOffer(
  negotiationId: string,
  counterPrice: number
): Promise<Negotiation | null> {
  const { rows: existing } = await query(
    "SELECT * FROM negotiations WHERE negotiation_id = $1",
    [negotiationId]
  );
  if (!existing[0]) return null;

  const neg = existing[0] as Negotiation;
  if (neg.status !== "pending" && neg.status !== "counter") return null;
  if (neg.round >= neg.max_rounds) {
    return rejectNegotiation(negotiationId);
  }

  const { rows } = await query(
    `UPDATE negotiations SET counter_price = $1, status = 'counter', round = round + 1, updated_at = $2
     WHERE negotiation_id = $3 RETURNING *`,
    [counterPrice, new Date(), negotiationId]
  );

  await emitEvent("negotiation_counter", negotiationId, "negotiation", { counter_price: counterPrice });
  return rows[0] as Negotiation;
}

export async function acceptNegotiation(negotiationId: string): Promise<Negotiation | null> {
  const { rows } = await query(
    `UPDATE negotiations SET status = 'accepted', updated_at = $1
     WHERE negotiation_id = $2 RETURNING *`,
    [new Date(), negotiationId]
  );
  if (!rows[0]) return null;
  const neg = rows[0] as Negotiation;
  await NegotiationEngine.accept(negotiationId, neg.counter_price ?? neg.proposed_price);
  await emitEvent("negotiation_accepted", negotiationId, "negotiation");
  return neg;
}

export async function rejectNegotiation(negotiationId: string): Promise<Negotiation | null> {
  const { rows } = await query(
    `UPDATE negotiations SET status = 'rejected', updated_at = $1
     WHERE negotiation_id = $2 RETURNING *`,
    [new Date(), negotiationId]
  );
  if (!rows[0]) return null;
  await NegotiationEngine.reject(negotiationId);
  await emitEvent("negotiation_rejected", negotiationId, "negotiation");
  return rows[0] as Negotiation;
}

export async function getNegotiation(negotiationId: string): Promise<Negotiation | null> {
  const { rows } = await query(
    "SELECT * FROM negotiations WHERE negotiation_id = $1",
    [negotiationId]
  );
  return (rows[0] as Negotiation) ?? null;
}

export async function getNegotiationsForIntent(intentId: string): Promise<Negotiation[]> {
  const { rows } = await query(
    "SELECT * FROM negotiations WHERE intent_id = $1 ORDER BY created_at DESC",
    [intentId]
  );
  return rows as Negotiation[];
}

export async function listNegotiations(limit = 100): Promise<Negotiation[]> {
  const { rows } = await query(
    "SELECT * FROM negotiations ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return rows as Negotiation[];
}

// Auto-negotiate: find acceptable midpoint between proposed and counter
export function resolveCompromise(
  proposed: number,
  counter: number,
  budget: number
): { price: number; acceptable: boolean } {
  const midpoint = (proposed + counter) / 2;
  const acceptable = midpoint <= budget * 1.05; // 5% tolerance
  return { price: midpoint, acceptable };
}
