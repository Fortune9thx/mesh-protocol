import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as NegotiationService from "../services/negotiation.js";
import { updateIntentStatus } from "../services/intents.js";
import { walletAuth } from "../middleware/auth.js";

const StartNegotiationBody = z.object({
  intent_id: z.string().uuid(),
  requester_agent: z.string().uuid(),
  provider_agent: z.string().uuid(),
  proposed_price: z.number().positive(),
  deadline: z.string().datetime(),
  quality_threshold: z.number().min(0).max(100).optional(),
  confidence_guarantee: z.number().min(0).max(100).optional(),
  max_rounds: z.number().int().min(1).optional(),
});

const CounterBody = z.object({ counter_price: z.number().positive() });

export async function negotiationRoutes(app: FastifyInstance) {
  app.post("/negotiate", { preHandler: walletAuth }, async (req, reply) => {
    const body = StartNegotiationBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const negotiation = await NegotiationService.startNegotiation({
      ...body.data,
      deadline: new Date(body.data.deadline),
    });

    await updateIntentStatus(body.data.intent_id, "negotiating");
    return reply.status(201).send(negotiation);
  });

  app.post("/negotiate/:id/counter", { preHandler: walletAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = CounterBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const negotiation = await NegotiationService.counterOffer(id, body.data.counter_price);
    if (!negotiation) return reply.status(404).send({ error: "Negotiation not found or terminal" });
    return reply.send(negotiation);
  });

  app.post("/negotiate/:id/accept", { preHandler: walletAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const negotiation = await NegotiationService.acceptNegotiation(id);
    if (!negotiation) return reply.status(404).send({ error: "Negotiation not found" });
    return reply.send(negotiation);
  });

  app.post("/negotiate/:id/reject", { preHandler: walletAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const negotiation = await NegotiationService.rejectNegotiation(id);
    if (!negotiation) return reply.status(404).send({ error: "Negotiation not found" });
    return reply.send(negotiation);
  });

  app.get("/negotiate/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const negotiation = await NegotiationService.getNegotiation(id);
    if (!negotiation) return reply.status(404).send({ error: "Not found" });
    return reply.send(negotiation);
  });

  app.get("/negotiate/intent/:intentId", async (req, reply) => {
    const { intentId } = req.params as { intentId: string };
    const negotiations = await NegotiationService.getNegotiationsForIntent(intentId);
    return reply.send(negotiations);
  });

  app.get("/negotiations", async (req, reply) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(Number(q.limit ?? 100), 200);
    const negotiations = await NegotiationService.listNegotiations(limit);
    return reply.send(negotiations);
  });
}
