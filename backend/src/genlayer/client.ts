/**
 * GenLayer contract client.
 * Uses the genlayer-js SDK for signed writes and view reads on Bradbury testnet.
 * Falls back to mock mode when GENLAYER_PRIVATE_KEY is absent (dev/test).
 *
 * Write calls are fire-and-forget: we log errors but never throw — the
 * PostgreSQL DB is the authoritative source of truth; the chain anchors it.
 */

import "dotenv/config";

export const MOCK_MODE =
  !process.env.GENLAYER_PRIVATE_KEY || process.env.NODE_ENV === "test";

// Deployed on GenLayer Bradbury Testnet — 2026-07-04
export const CONTRACT_ADDRESSES: Record<string, `0x${string}`> = {
  AgentRegistry:     "0xB31900eE7fa37E7e8a2cd49212125e49efdBEa2c",
  IntentRegistry:    "0x4a2CB695c015F4198627135249a093425a5080e8",
  NegotiationEngine: "0xa5C8cd99d081145ef90dDEEC024665CaA21E86C7",
  EscrowVault:       "0x7Db590E16F1F2E40d0859379b2706fc539db5d65",
  ReputationLedger:  "0xfA8912C4AA206DdAD7496Cf3df5B6A64AF1e5982",
};

// Lazily initialised to avoid importing genlayer-js in test env
let _client: Awaited<ReturnType<typeof buildClient>> | null = null;

async function buildClient() {
  const { createClient, createAccount } = await import("genlayer-js");
  const { testnetBradbury } = await import("genlayer-js/chains");
  const account = createAccount(process.env.GENLAYER_PRIVATE_KEY as `0x${string}`);
  return createClient({ chain: testnetBradbury, account });
}

async function getClient() {
  if (!_client) _client = await buildClient();
  return _client;
}

function addr(contract: string): `0x${string}` {
  const a = CONTRACT_ADDRESSES[contract];
  if (!a) throw new Error(`No deployed address for contract: ${contract}`);
  return a;
}

// Fire a write transaction — non-blocking, logs errors.
async function write(contract: string, method: string, args: unknown[]) {
  if (MOCK_MODE) {
    console.log(`[GenLayer mock] ${contract}.${method}(${args.join(", ")})`);
    return;
  }
  try {
    const client = await getClient();
    await (client as any).writeContract({
      address: addr(contract),
      functionName: method,
      args,
    });
  } catch (err) {
    console.error(`[GenLayer] write ${contract}.${method} failed:`, (err as Error).message);
  }
}

// Call a view function — returns null on error.
async function read(contract: string, method: string, args: unknown[]): Promise<unknown> {
  if (MOCK_MODE) {
    console.log(`[GenLayer mock] ${contract}.${method}(${args.join(", ")})`);
    return null;
  }
  try {
    const client = await getClient();
    return await (client as any).readContract({
      address: addr(contract),
      functionName: method,
      args,
    });
  } catch (err) {
    console.error(`[GenLayer] read ${contract}.${method} failed:`, (err as Error).message);
    return null;
  }
}

// ── AgentRegistry ─────────────────────────────────────────────────

export const AgentRegistry = {
  registerAgent: (agentId: string, name: string, category: string, capabilities: string[], basePrice: number) =>
    write("AgentRegistry", "register_agent", [agentId, name, category, capabilities.join(","), basePrice, "", 1, 1000]),

  pauseAgent: (agentId: string) =>
    write("AgentRegistry", "pause_agent", [agentId]),

  isActive: (agentId: string) =>
    read("AgentRegistry", "is_active", [agentId]),

  getSpendingLimit: (agentId: string) =>
    read("AgentRegistry", "get_spending_limit", [agentId]),
};

// ── IntentRegistry ────────────────────────────────────────────────

export const IntentRegistry = {
  submitIntent: (intentId: string, storageHash: string, budget: number, deadline: number) =>
    write("IntentRegistry", "submit_intent", [intentId, storageHash, budget, deadline]),

  updateStatus: (intentId: string, status: string) =>
    write("IntentRegistry", "update_status", [intentId, status]),

  cancelIntent: (intentId: string) =>
    write("IntentRegistry", "cancel_intent", [intentId]),

  getStatus: (intentId: string) =>
    read("IntentRegistry", "get_status", [intentId]),
};

// ── EscrowVault ───────────────────────────────────────────────────

export const EscrowVault = {
  lock: (escrowId: string, payee: string, intentId: string, amount: number, negotiationId: string = "") =>
    write("EscrowVault", "lock", [escrowId, payee, intentId, negotiationId]),

  release: (escrowId: string) =>
    write("EscrowVault", "release", [escrowId]),

  refund: (escrowId: string) =>
    write("EscrowVault", "refund", [escrowId]),

  dispute: (escrowId: string) =>
    write("EscrowVault", "dispute", [escrowId]),

  resolveDispute: (escrowId: string, releaseToPayee: boolean) =>
    write("EscrowVault", "resolve_dispute", [escrowId, releaseToPayee]),

  getStatus: (escrowId: string) =>
    read("EscrowVault", "get_status", [escrowId]),
};

// ── NegotiationEngine ─────────────────────────────────────────────

export const NegotiationEngine = {
  record: (negotiationId: string, intentId: string, requester: string, provider: string, price: number) =>
    write("NegotiationEngine", "record_negotiation", [negotiationId, intentId, requester, provider, price]),

  accept: (negotiationId: string, finalPrice: number) =>
    write("NegotiationEngine", "accept", [negotiationId, finalPrice]),

  reject: (negotiationId: string) =>
    write("NegotiationEngine", "reject", [negotiationId]),
};

// ── ReputationLedger ──────────────────────────────────────────────

export const ReputationLedger = {
  recordOutcome: (agentId: string, success: boolean, qualityScore: number) =>
    write("ReputationLedger", "record_outcome", [agentId, success, Math.round(qualityScore)]),

  getReliability: (agentId: string) =>
    read("ReputationLedger", "get_reliability", [agentId]),

  getStats: (agentId: string) =>
    read("ReputationLedger", "get_stats", [agentId]),
};
