import type { FastifyInstance } from "fastify";
import { SubmitIntentInput } from "../types/index.js";
import * as IntentService from "../services/intents.js";
import { walletAuth, auditLog } from "../middleware/auth.js";

export async function intentRoutes(app: FastifyInstance) {
  app.post("/intents", { preHandler: walletAuth }, async (req, reply) => {
    const body = SubmitIntentInput.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const intent = await IntentService.submitIntent(body.data);
    await auditLog(body.data.requester, "submit_intent", intent.intent_id, "intent");
    return reply.status(201).send(intent);
  });

  app.get("/intents/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const intent = await IntentService.getIntent(id);
    if (!intent) return reply.status(404).send({ error: "Intent not found" });
    return reply.send(intent);
  });

  app.delete("/intents/:id", { preHandler: walletAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const intent = await IntentService.cancelIntent(id);
    if (!intent) return reply.status(404).send({ error: "Intent not found" });
    return reply.send(intent);
  });

  app.get("/intents", async (req, reply) => {
    const q = req.query as Record<string, string>;
    const intents = await IntentService.listIntents({ status: q.status, requester: q.requester });
    return reply.send(intents);
  });
}
