import type { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import { query } from "../db/schema.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const IS_PRODUCTION = process.env.NODE_ENV === "production";

type AuthedRequest = FastifyRequest & { wallet: string };

/**
 * Extracts and verifies the caller's wallet address.
 *
 * Production: requires a valid JWT in `Authorization: Bearer <token>`.
 * Dev / test: also accepts the plain `X-Wallet-Address` header so existing
 *             tests and tooling continue to work without a full sign-in flow.
 */
export async function walletAuth(request: FastifyRequest, reply: FastifyReply) {
  const wallet = extractWallet(request);
  if (!wallet) {
    return reply.status(401).send({
      error: IS_PRODUCTION
        ? "Unauthorized — provide Authorization: Bearer <token>"
        : "Missing X-Wallet-Address header or Authorization token",
    });
  }
  (request as AuthedRequest).wallet = wallet;
}

/**
 * Operator-only guard: wallet must own at least one registered agent.
 */
export async function operatorAuth(request: FastifyRequest, reply: FastifyReply) {
  const wallet = extractWallet(request);
  if (!wallet) {
    return reply.status(401).send({ error: "Unauthorized" });
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

// ── internal ──────────────────────────────────────────────────────────────────

function extractWallet(request: FastifyRequest): string | null {
  // 1. JWT bearer token (required in production, accepted everywhere)
  const authHeader = request.headers["authorization"];
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { wallet?: string };
      if (payload.wallet) return payload.wallet;
    } catch {
      return null; // invalid / expired JWT — reject even in dev
    }
  }

  // 2. Plain header fallback — dev and test only
  if (!IS_PRODUCTION) {
    const header = request.headers["x-wallet-address"] as string | undefined;
    if (header && header.length >= 10) return header;
  }

  return null;
}
