import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { agentRoutes } from "./api/agents.js";
import { intentRoutes } from "./api/intents.js";
import { matchingRoutes } from "./api/matching.js";
import { negotiationRoutes } from "./api/negotiation.js";
import { deliverableRoutes } from "./api/deliverables.js";
import { analyticsRoutes, broadcastEvent } from "./api/analytics.js";
import { setBroadcast } from "./services/events.js";
import { getPool } from "./db/schema.js";

setBroadcast(broadcastEvent);

const PORT = Number(process.env.PORT ?? 3100);
const HOST = process.env.HOST ?? "0.0.0.0";

const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL ?? "info",
    transport:
      process.env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { colorize: true } }
        : undefined,
  },
});

await app.register(cors, { origin: "*" });

await app.register(swagger, {
  openapi: {
    info: { title: "Mesh Protocol API", version: "0.1.0", description: "Coordination layer for the autonomous agent economy" },
    tags: [
      { name: "agents", description: "Agent identity and registry" },
      { name: "intents", description: "Intent submission and lifecycle" },
      { name: "matching", description: "AI-powered agent matching" },
      { name: "negotiation", description: "Autonomous negotiation engine" },
      { name: "deliverables", description: "Deliverable submission and verification" },
      { name: "analytics", description: "Protocol analytics and human control" },
    ],
  },
});
await app.register(swaggerUi, { routePrefix: "/docs" });

await app.register(rateLimit, {
  max: Number(process.env.RATE_LIMIT_MAX ?? 100),
  timeWindow: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
});

// Health check
app.get("/health", async () => ({
  status: "ok",
  service: "mesh-protocol",
  timestamp: new Date().toISOString(),
}));

// Register route modules
await app.register(agentRoutes);
await app.register(intentRoutes);
await app.register(matchingRoutes);
await app.register(negotiationRoutes);
await app.register(deliverableRoutes);
await app.register(analyticsRoutes);

// Graceful shutdown
const shutdown = async () => {
  app.log.info("Shutting down...");
  await app.close();
  const pool = getPool();
  await pool.end();
  process.exit(0);
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n  Mesh Protocol API running at http://${HOST}:${PORT}\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
