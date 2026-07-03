/**
 * GenLayer contract client.
 * In production: uses the GenLayer JS SDK to call on-chain contracts.
 * In development/mock mode: logs calls and returns stub responses.
 */

import "dotenv/config";

const GENLAYER_RPC = process.env.GENLAYER_RPC_URL ?? "http://localhost:8545";
const MOCK_MODE = !process.env.GENLAYER_PRIVATE_KEY || process.env.NODE_ENV === "test";

// Deployed on GenLayer Studionet — 2026-07-02
const CONTRACT_ADDRESSES: Record<string, string> = {
  AgentRegistry:     "0xe51b155743973152B29E2120Fc406B27774c7912",
  IntentRegistry:    "0xb276d1F07C9f2a457Ed016bf059ca5a7F6d8a488",
  NegotiationEngine: "0x71487Ce846a6D033489a7c2E265CebB2f76ed92B",
  EscrowVault:       "0xEDFd69fC2baf063Ac5d71DDA6AFB34C2368Ced52",
  ReputationLedger:  "0x4b387Ff21a27194Bd93a3aE6241C5A7D66E6643E",
};

export interface ContractCall {
  contract: string;
  method: string;
  args: unknown[];
}

async function call(c: ContractCall): Promise<unknown> {
  if (MOCK_MODE) {
    console.log(`[GenLayer mock] ${c.contract}.${c.method}(${c.args.join(", ")})`);
    return { ok: true, mock: true };
  }

  // Production: POST to GenLayer JSON-RPC node
  const address = CONTRACT_ADDRESSES[c.contract];
  if (!address) throw new Error(`No deployed address for contract: ${c.contract}`);

  const res = await fetch(GENLAYER_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_call",
      params: [{ contract: address, method: c.method, args: c.args }],
    }),
  });

  if (!res.ok) throw new Error(`GenLayer RPC error: ${res.status}`);
  const data = (await res.json()) as { result?: unknown; error?: { message: string } };
  if (data.error) throw new Error(`GenLayer error: ${data.error.message}`);
  return data.result;
}

// ── AgentRegistry ─────────────────────────────────────────────────

export const AgentRegistry = {
  registerAgent: (agentId: string, name: string, category: string, capabilities: string[], basePrice: number) =>
    call({ contract: "AgentRegistry", method: "register_agent", args: [agentId, name, category, capabilities, basePrice, "", 1, 1000] }),

  pauseAgent: (agentId: string) =>
    call({ contract: "AgentRegistry", method: "pause_agent", args: [agentId] }),

  isActive: (agentId: string) =>
    call({ contract: "AgentRegistry", method: "is_active", args: [agentId] }),

  getSpendingLimit: (agentId: string) =>
    call({ contract: "AgentRegistry", method: "get_spending_limit", args: [agentId] }),
};

// ── IntentRegistry ────────────────────────────────────────────────

export const IntentRegistry = {
  submitIntent: (intentId: string, storageHash: string, budget: number, deadline: number) =>
    call({ contract: "IntentRegistry", method: "submit_intent", args: [intentId, storageHash, budget, deadline] }),

  updateStatus: (intentId: string, status: string) =>
    call({ contract: "IntentRegistry", method: "update_status", args: [intentId, status] }),

  cancelIntent: (intentId: string) =>
    call({ contract: "IntentRegistry", method: "cancel_intent", args: [intentId] }),

  getStatus: (intentId: string) =>
    call({ contract: "IntentRegistry", method: "get_status", args: [intentId] }),
};

// ── EscrowVault ───────────────────────────────────────────────────

export const EscrowVault = {
  lock: (escrowId: string, payee: string, intentId: string, amount: number) =>
    call({ contract: "EscrowVault", method: "lock", args: [escrowId, payee, intentId, amount] }),

  release: (escrowId: string) =>
    call({ contract: "EscrowVault", method: "release", args: [escrowId] }),

  refund: (escrowId: string) =>
    call({ contract: "EscrowVault", method: "refund", args: [escrowId] }),

  dispute: (escrowId: string) =>
    call({ contract: "EscrowVault", method: "dispute", args: [escrowId] }),

  resolveDispute: (escrowId: string, releaseToPayee: boolean) =>
    call({ contract: "EscrowVault", method: "resolve_dispute", args: [escrowId, releaseToPayee] }),

  getStatus: (escrowId: string) =>
    call({ contract: "EscrowVault", method: "get_status", args: [escrowId] }),
};

// ── NegotiationEngine ─────────────────────────────────────────────

export const NegotiationEngine = {
  record: (negotiationId: string, intentId: string, requester: string, provider: string, price: number) =>
    call({ contract: "NegotiationEngine", method: "record_negotiation", args: [negotiationId, intentId, requester, provider, price] }),

  accept: (negotiationId: string, finalPrice: number) =>
    call({ contract: "NegotiationEngine", method: "accept", args: [negotiationId, finalPrice] }),

  reject: (negotiationId: string) =>
    call({ contract: "NegotiationEngine", method: "reject", args: [negotiationId] }),
};

// ── ReputationLedger ──────────────────────────────────────────────

export const ReputationLedger = {
  recordOutcome: (agentId: string, success: boolean, qualityScore: number) =>
    call({ contract: "ReputationLedger", method: "record_outcome", args: [agentId, success, Math.round(qualityScore)] }),

  getReliability: (agentId: string) =>
    call({ contract: "ReputationLedger", method: "get_reliability", args: [agentId] }),

  getStats: (agentId: string) =>
    call({ contract: "ReputationLedger", method: "get_stats", args: [agentId] }),
};
