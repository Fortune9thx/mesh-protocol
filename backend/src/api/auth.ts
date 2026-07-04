import type { FastifyInstance } from "fastify";
import { createHmac, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import { verifyMessage } from "viem";

const JWT_SECRET = process.env.JWT_SECRET ?? "change-me-in-production";
const JWT_EXPIRES_IN = "24h";
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// In-memory nonce store. In a multi-instance deployment, replace with Redis.
const nonceStore = new Map<string, { nonce: string; expiresAt: number }>();

function pruneExpired() {
  const now = Date.now();
  for (const [key, val] of nonceStore) {
    if (val.expiresAt < now) nonceStore.delete(key);
  }
}

function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function buildChallengeMessage(wallet: string, nonce: string): string {
  return (
    `Sign this message to authenticate with Mesh Protocol.\n\n` +
    `Wallet: ${wallet}\n` +
    `Nonce: ${nonce}\n` +
    `This request will expire in 5 minutes.`
  );
}

export async function authRoutes(app: FastifyInstance) {
  // GET /auth/challenge?wallet=0x...
  // Returns a unique nonce message for the wallet to sign.
  app.get<{ Querystring: { wallet?: string } }>("/auth/challenge", async (req, reply) => {
    const wallet = (req.query.wallet ?? "").toLowerCase();
    if (!wallet || !/^0x[0-9a-f]{40}$/i.test(wallet)) {
      return reply.status(400).send({ error: "Invalid wallet address" });
    }

    pruneExpired();
    const nonce = generateNonce();
    nonceStore.set(wallet, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });

    return {
      wallet,
      nonce,
      message: buildChallengeMessage(wallet, nonce),
    };
  });

  // POST /auth/verify  { wallet, signature }
  // Verifies EIP-191 personal_sign signature, returns a JWT.
  app.post<{ Body: { wallet?: string; signature?: string } }>("/auth/verify", async (req, reply) => {
    const { wallet, signature } = req.body ?? {};
    if (!wallet || !signature) {
      return reply.status(400).send({ error: "wallet and signature are required" });
    }

    const normalised = wallet.toLowerCase();
    const stored = nonceStore.get(normalised);

    if (!stored) {
      return reply.status(401).send({ error: "No active challenge for this wallet — call /auth/challenge first" });
    }
    if (stored.expiresAt < Date.now()) {
      nonceStore.delete(normalised);
      return reply.status(401).send({ error: "Challenge expired — request a new one" });
    }

    const message = buildChallengeMessage(normalised, stored.nonce);

    let valid = false;
    try {
      valid = await verifyMessage({
        address: wallet as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });
    } catch {
      return reply.status(401).send({ error: "Signature verification failed" });
    }

    if (!valid) {
      return reply.status(401).send({ error: "Invalid signature" });
    }

    // Consume nonce — one-time use
    nonceStore.delete(normalised);

    const token = jwt.sign({ wallet: normalised }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return { token, wallet: normalised, expiresIn: JWT_EXPIRES_IN };
  });
}
