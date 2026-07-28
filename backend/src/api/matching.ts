import type { FastifyInstance } from "fastify";
import { z } from "zod";
import * as MatchingService from "../services/matching.js";
import * as IntentService from "../services/intents.js";
import { walletAuth } from "../middleware/auth.js";

const MatchIntentBody = z.object({
  intent_id: z.string().uuid(),
  weights: z
    .object({
      capability: z.number().optional(),
      reputation: z.number().optional(),
      cost: z.number().optional(),
      latency: z.number().optional(),
    })
    .optional(),
  max_results: z.number().int().min(1).max(20).default(5),
});

export async function matchingRoutes(app: FastifyInstance) {
  app.post("/match-intent", { preHandler: walletAuth }, async (req, reply) => {
    const body = MatchIntentBody.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const intent = await IntentService.getIntent(body.data.intent_id);
    if (!intent) return reply.status(404).send({ error: "Intent not found" });
    if (intent.status === "cancelled" || intent.status === "settled") {
      return reply.status(409).send({ error: `Intent is ${intent.status}` });
    }

    const matches = await MatchingService.matchIntent(
      intent,
      body.data.weights,
      body.data.max_results
    );

    return reply.send({ intent_id: intent.intent_id, matches });
  });

  app.get("/match-intent/:intentId", async (req, reply) => {
    const { intentId } = req.params as { intentId: string };
    const matches = await MatchingService.getMatchesForIntent(intentId);
    return reply.send(matches);
  });
}
