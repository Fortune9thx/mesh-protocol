import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { query } from "../db/schema.js";
import { overrideSettlement } from "../services/settlement.js";
import { EscrowVault } from "../genlayer/client.js";
import type { EscrowStatus } from "../types/index.js";

// SSE client registry
const sseClients = new Set<FastifyReply>();

export function broadcastEvent(event: Record<string, unknown>) {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    try { client.raw.write(data); } catch { sseClients.delete(client); }
  }
}

export async function analyticsRoutes(app: FastifyInstance) {
  app.get("/analytics", async (_req, reply) => {
    const [agents, intents, negotiations, escrows, events] = await Promise.all([
      query(`SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status='active') as active,
              COUNT(*) FILTER (WHERE status='paused') as paused FROM agents`),
      query(`SELECT COUNT(*) as total, status, COUNT(*) as count FROM intents GROUP BY status`),
      query(`SELECT status, COUNT(*) as count FROM negotiations GROUP BY status`),
      query(`SELECT status, COUNT(*) as count, COALESCE(SUM(amount),0) as volume FROM escrows GROUP BY status`),
      query(`SELECT event_type, COUNT(*) as count FROM events GROUP BY event_type ORDER BY count DESC LIMIT 20`),
    ]);

    return reply.send({
      agents: agents.rows[0],
      intents: intents.rows,
      negotiations: negotiations.rows,
      escrows: escrows.rows,
      top_events: events.rows,
    });
  });

  app.get("/analytics/reputation/:agentId", async (req, reply) => {
    const { agentId } = req.params as { agentId: string };
    const { rows } = await query(
      "SELECT * FROM reputations WHERE agent_id = $1",
      [agentId]
    );
    if (!rows[0]) return reply.status(404).send({ error: "Reputation not found" });
    return reply.send(rows[0]);
  });

  app.get("/events", async (req, reply) => {
    const q = req.query as Record<string, string>;
    const limit = Math.min(Number(q.limit ?? 50), 200);
    const { rows } = await query(
      "SELECT * FROM events ORDER BY timestamp DESC LIMIT $1",
      [limit]
    );
    return reply.send(rows);
  });

  // Server-Sent Events — real-time event stream for the frontend dashboard
  app.get("/events/stream", (_req: FastifyRequest, reply: FastifyReply) => {
    reply.raw.setHeader("Content-Type", "text/event-stream");
    reply.raw.setHeader("Cache-Control", "no-cache");
    reply.raw.setHeader("Connection", "keep-alive");
    reply.raw.setHeader("Access-Control-Allow-Origin", "*");
    reply.raw.flushHeaders();

    reply.raw.write("data: {\"type\":\"connected\"}\n\n");
    sseClients.add(reply);

    reply.raw.on("close", () => sseClients.delete(reply));
  });

  app.get("/audit-logs", async (req, reply) => {
    const { rows } = await query(
      "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100"
    );
    return reply.send(rows);
  });

  app.post("/admin/override-settlement", async (req, reply) => {
    const { escrow_id, new_status, actor } = req.body as {
      escrow_id: string; new_status: string; actor: string;
    };

    const result = await overrideSettlement(escrow_id, new_status as EscrowStatus, actor);
    if (!result) return reply.status(404).send({ error: "Escrow not found" });
    return reply.send(result);
  });

  app.post("/admin/dispute", async (req, reply) => {
    const { intent_id, reason, actor } = req.body as {
      intent_id: string; reason: string; actor: string;
    };

    const { rows } = await query(
      "UPDATE escrows SET status = 'disputed' WHERE intent_id = $1 AND status = 'locked' RETURNING escrow_id",
      [intent_id]
    );

    for (const row of rows) {
      await EscrowVault.dispute(row.escrow_id as string);
    }

    await query(
      `INSERT INTO audit_logs (actor, action, entity_id, entity_type, details)
       VALUES ($1, 'open_dispute', $2, 'intent', $3)`,
      [actor, intent_id, JSON.stringify({ reason })]
    );

    return reply.send({ message: "Dispute opened", intent_id });
  });
}
