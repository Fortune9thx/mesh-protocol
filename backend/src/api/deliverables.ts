import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { query } from "../db/schema.js";
import { updateIntentStatus } from "../services/intents.js";
import { emitEvent } from "../services/events.js";
import { verifyDeliverable } from "../services/verification.js";
import { settleEscrow } from "../services/settlement.js";
import { getIntent } from "../services/intents.js";
import { getNegotiationsForIntent } from "../services/negotiation.js";
import { walletAuth } from "../middleware/auth.js";
import type { Deliverable } from "../types/index.js";

const SubmitDeliverableBody = z.object({
  intent_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  content: z.string().min(1),
  storage_hash: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export async function deliverableRoutes(app: FastifyInstance) {
  app.post("/deliverables", { preHandler: walletAuth }, async (req, reply) => {
    const body = SubmitDeliverableBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const id = uuid();
    const { rows } = await query(
      `INSERT INTO deliverables (deliverable_id, intent_id, provider_id, content, storage_hash, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, body.data.intent_id, body.data.provider_id, body.data.content,
       body.data.storage_hash ?? null, JSON.stringify(body.data.metadata ?? {})]
    );

    await updateIntentStatus(body.data.intent_id, "delivered");
    await emitEvent("deliverable_submitted", id, "deliverable", { intent_id: body.data.intent_id });

    return reply.status(201).send(rows[0]);
  });

  app.get("/deliverables/:intentId", async (req, reply) => {
    const { intentId } = req.params as { intentId: string };
    const { rows } = await query(
      "SELECT * FROM deliverables WHERE intent_id = $1 ORDER BY created_at DESC",
      [intentId]
    );
    return reply.send(rows);
  });

  // Verify a deliverable
  app.post("/verify", { preHandler: walletAuth }, async (req, reply) => {
    const { deliverable_id } = req.body as { deliverable_id: string };
    if (!deliverable_id) return reply.status(400).send({ error: "deliverable_id required" });

    const { rows } = await query(
      "SELECT * FROM deliverables WHERE deliverable_id = $1",
      [deliverable_id]
    );
    if (!rows[0]) return reply.status(404).send({ error: "Deliverable not found" });

    const deliverable = rows[0] as Deliverable;
    const intent = await getIntent(deliverable.intent_id);
    if (!intent) return reply.status(404).send({ error: "Intent not found" });

    const negotiations = await getNegotiationsForIntent(deliverable.intent_id);
    const accepted = negotiations.find((n) => n.status === "accepted");
    if (!accepted) return reply.status(409).send({ error: "No accepted negotiation found" });

    const verification = await verifyDeliverable(deliverable, intent, accepted);
    verification.deliverable_id = deliverable_id;

    await updateIntentStatus(intent.intent_id, "verified");

    return reply.send(verification);
  });

  // Settle escrow after verification
  app.post("/settle", { preHandler: walletAuth }, async (req, reply) => {
    const { intent_id, deliverable_id } = req.body as { intent_id: string; deliverable_id: string };
    if (!intent_id || !deliverable_id) {
      return reply.status(400).send({ error: "intent_id and deliverable_id required" });
    }

    const { rows: drows } = await query(
      "SELECT * FROM deliverables WHERE deliverable_id = $1",
      [deliverable_id]
    );
    if (!drows[0]) return reply.status(404).send({ error: "Deliverable not found" });

    const intent = await getIntent(intent_id);
    if (!intent) return reply.status(404).send({ error: "Intent not found" });

    const negotiations = await getNegotiationsForIntent(intent_id);
    const accepted = negotiations.find((n) => n.status === "accepted");
    if (!accepted) return reply.status(409).send({ error: "No accepted negotiation" });

    const verification = await verifyDeliverable(drows[0] as Deliverable, intent, accepted);
    const escrow = await settleEscrow(intent_id, verification, accepted.provider_agent);

    return reply.send({ verification, escrow });
  });
}
