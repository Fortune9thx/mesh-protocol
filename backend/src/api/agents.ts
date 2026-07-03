import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { RegisterAgentInput } from "../types/index.js";
import * as AgentService from "../services/agents.js";
import { walletAuth, operatorAuth, auditLog } from "../middleware/auth.js";

export async function agentRoutes(app: FastifyInstance) {
  // Register agent
  app.post("/agents/register", { preHandler: walletAuth }, async (req, reply) => {
    const body = RegisterAgentInput.safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const agent = await AgentService.registerAgent(body.data);
    await auditLog(body.data.owner_wallet, "register_agent", agent.agent_id, "agent");
    return reply.status(201).send(agent);
  });

  // Update agent
  app.patch("/agents/:id", { preHandler: walletAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await AgentService.updateAgent(id, req.body as Record<string, unknown>);
    if (!agent) return reply.status(404).send({ error: "Agent not found" });
    return reply.send(agent);
  });

  // List agents
  app.get("/agents", async (req, reply) => {
    const { status, category } = (req.query as Record<string, string | undefined>);
    const agents = await AgentService.listAgents({ status, category });
    return reply.send(agents);
  });

  // Get single agent
  app.get("/agents/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const agent = await AgentService.getAgent(id);
    if (!agent) return reply.status(404).send({ error: "Agent not found" });
    return reply.send(agent);
  });

  // Admin: pause agent
  app.post("/admin/pause-agent/:id", { preHandler: operatorAuth }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const wallet = (req as unknown as { wallet: string }).wallet;
    const agent = await AgentService.pauseAgent(id);
    if (!agent) return reply.status(404).send({ error: "Agent not found" });
    await auditLog(wallet, "pause_agent", id, "agent");
    return reply.send(agent);
  });
}
