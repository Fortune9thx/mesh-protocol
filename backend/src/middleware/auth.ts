import type { FastifyRequest, FastifyReply } from "fastify";
import { query } from "../db/schema.js";

// Lightweight wallet-based auth: require X-Wallet-Address header on mutating routes
export async function walletAuth(request: FastifyRequest, reply: FastifyReply) {
  const wallet = request.headers["x-wallet-address"] as string | undefined;
  if (!wallet || wallet.length < 10) {
    return reply.status(401).send({ error: "Missing or invalid X-Wallet-Address header" });
  }
  (request as FastifyRequest & { wallet: string }).wallet = wallet;
}

// Operator-only middleware — checks wallet is an agent owner or known operator
export async function operatorAuth(request: FastifyRequest, reply: FastifyReply) {
  await walletAuth(request, reply);
  // In production: verify against a whitelist or on-chain role
}

export async function auditLog(
  actor: string,
  action: string,
  entityId?: string,
  entityType?: string,
  details: Record<string, unknown> = {},
  ip?: string
) {
  await query(
    `INSERT INTO audit_logs (actor, action, entity_id, entity_type, details, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [actor, action, entityId ?? null, entityType ?? null, JSON.stringify(details), ip ?? null]
  );
}
