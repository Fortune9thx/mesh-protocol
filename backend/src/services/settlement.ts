import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import { emitEvent } from "./events.js";
import { updateIntentStatus } from "./intents.js";
import { updateReputation } from "./reputation.js";
import { EscrowVault } from "../genlayer/client.js";
import type { Escrow, EscrowStatus, Verification } from "../types/index.js";

export async function lockEscrow(
  intentId: string,
  payer: string,
  payee: string,
  amount: number
): Promise<Escrow> {
  const id = uuid();
  const { rows } = await query(
    `INSERT INTO escrows (escrow_id, intent_id, payer, payee, amount, status)
     VALUES ($1,$2,$3,$4,$5,'locked') RETURNING *`,
    [id, intentId, payer, payee, amount]
  );
  await EscrowVault.lock(id, payee, intentId, amount);
  await emitEvent("escrow_locked", id, "escrow", { intent_id: intentId, amount });
  return rows[0] as Escrow;
}

export async function settleEscrow(
  intentId: string,
  verification: Verification,
  agentId: string
): Promise<Escrow> {
  const { rows: escrows } = await query(
    "SELECT * FROM escrows WHERE intent_id = $1 AND status = 'locked' LIMIT 1",
    [intentId]
  );

  if (escrows.length === 0) throw new Error("No locked escrow for intent");
  const escrow = escrows[0] as Escrow;
  let newStatus: EscrowStatus;

  if (verification.result === "PASS") {
    newStatus = "released";
    await EscrowVault.release(escrow.escrow_id);
    await updateIntentStatus(intentId, "settled");
    await updateReputation(agentId, true, verification.confidence);
    await emitEvent("escrow_released", escrow.escrow_id, "escrow", {
      amount: escrow.amount, payee: escrow.payee,
    });
  } else if (verification.result === "FAIL") {
    newStatus = "refunded";
    await EscrowVault.refund(escrow.escrow_id);
    await updateIntentStatus(intentId, "failed");
    await updateReputation(agentId, false, verification.confidence);
    await emitEvent("escrow_refunded", escrow.escrow_id, "escrow", {
      amount: escrow.amount, payer: escrow.payer,
    });
  } else {
    newStatus = "disputed";
    await EscrowVault.dispute(escrow.escrow_id);
    await updateIntentStatus(intentId, "verified");
    await emitEvent("dispute_opened", escrow.escrow_id, "escrow", {
      verification_result: verification.result,
    });
  }

  const { rows } = await query(
    "UPDATE escrows SET status = $1, settled_at = $2 WHERE escrow_id = $3 RETURNING *",
    [newStatus, new Date(), escrow.escrow_id]
  );

  return rows[0] as Escrow;
}

export async function overrideSettlement(
  escrowId: string,
  newStatus: EscrowStatus,
  actor: string
): Promise<Escrow | null> {
  const { rows } = await query(
    "UPDATE escrows SET status = $1, settled_at = $2 WHERE escrow_id = $3 RETURNING *",
    [newStatus, new Date(), escrowId]
  );
  if (!rows[0]) return null;

  await EscrowVault.resolveDispute(escrowId, newStatus === "released");

  await query(
    `INSERT INTO audit_logs (actor, action, entity_id, entity_type, details)
     VALUES ($1, 'override_settlement', $2, 'escrow', $3)`,
    [actor, escrowId, JSON.stringify({ new_status: newStatus })]
  );

  return rows[0] as Escrow;
}

export async function getEscrow(intentId: string): Promise<Escrow | null> {
  const { rows } = await query(
    "SELECT * FROM escrows WHERE intent_id = $1 ORDER BY created_at DESC LIMIT 1",
    [intentId]
  );
  return (rows[0] as Escrow) ?? null;
}

export async function getEscrowById(escrowId: string): Promise<Escrow | null> {
  const { rows } = await query("SELECT * FROM escrows WHERE escrow_id = $1", [escrowId]);
  return (rows[0] as Escrow) ?? null;
}
