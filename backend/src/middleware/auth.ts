import type { FastifyRequest, FastifyReply } from "fastify";
import { query } from "../db/schema.js";

type AuthedRequest = FastifyRequest & { wallet: string };

// Lightweight wallet-based auth: require X-Wallet-Address header on mutating routes
export async function walletAuth(request: FastifyRequest, reply: FastifyReply) {
  const wallet = request.headers["x-wallet-address"] as string | undefined;
  if (!wallet || wallet.length < 10) {
    return reply.status(401).send({ error: "Missing or invalid X-Wallet-Address header" });
  }
  (request as AuthedRequest).wallet = wallet;
}

// Operator-only: wallet must own at least one registered agent
export async function operatorAuth(request: FastifyRequest, reply: FastifyReply) {
  const wallet = request.headers["x-wallet-address"] as string | undefined;
  if (!wallet || wallet.length < 10) {
    return reply.status(401).send({ error: "Missing or invalid X-Wallet-Address header" });
  }

  const { rows } = await query(
    "SELECT 1 FROM agents WHERE owner_wallet = $1 AND status != 'deactivated' LIMIT 1",
    [wallet]
  );

  if (rows.length === 0) {
    return reply.status(403).send({ error: "Forbidden: wallet is not a registered agent owner" });
  }

  (request as AuthedRequest).wallet = wallet;
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
