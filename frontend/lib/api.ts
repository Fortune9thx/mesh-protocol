/**
 * Mesh Protocol -- On-chain write API
 * All mutating operations call GenLayer contracts via genlayer-js + MetaMask.
 * Read operations live in contracts.ts (no wallet needed).
 *
 * The provider/address are injected by callers from WalletProvider context.
 * If no wallet is connected, writes return { ok: false, error: "..." }.
 */

import { writeContract } from "./contracts";
import type { Agent } from "./types";

// Wallet credentials set by WalletProvider after MetaMask connect
let _provider: unknown = null;
let _address: string | null = null;

export function setAuthCredentials(_jwt: string | null, wallet: string | null) {
  _address = wallet;
}

export function setWalletProvider(provider: unknown, address: string) {
  _provider = provider;
  _address = address;
}

function requireWallet(): { ok: false; error: string } | null {
  if (!_provider || !_address) {
    return { ok: false, error: "Connect your wallet to perform this action." };
  }
  return null;
}

// ── Agent operations ──────────────────────────────────────────────────────────

export interface RegisterAgentPayload {
  name: string;
  owner_wallet: string;
  category: string;
  capabilities: string[];
  pricing_model: "per_task" | "per_hour" | "flat" | "auction";
  base_price: number;
  availability: boolean;
  autonomy_level: number;
  spending_limit: number;
}

export async function registerAgent(payload: RegisterAgentPayload) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const agentId = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const result = await writeContract(
    _provider,
    _address!,
    "AgentRegistry",
    "register_agent",
    [
      agentId,
      payload.name,
      payload.category,
      payload.capabilities.join(","),
      BigInt(Math.round(payload.base_price * 1e18)),
      payload.pricing_model,
      BigInt(payload.autonomy_level),
      BigInt(Math.round(payload.spending_limit * 1e18)),
    ],
  );

  if (!result.ok) return { ok: false, status: 500, data: null, error: result.error };
  return {
    ok: true,
    status: 200,
    hash: result.hash,
    data: { agent_id: agentId, ...payload } as unknown as Agent,
  };
}

export async function pauseAgent(agentId: string) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const result = await writeContract(
    _provider,
    _address!,
    "AgentRegistry",
    "pause_agent",
    [agentId],
  );
  return result.ok
    ? { ok: true, status: 200, data: null }
    : { ok: false, status: 500, data: null, error: result.error };
}

// ── Escrow / settlement operations ────────────────────────────────────────────

/**
 * Open a dispute on an escrow. Only a party (payer/payee) may call this on-chain;
 * the contract enforces it. The caller states their case as `evidence`, which
 * GenLayer validators later reason over.
 */
export async function openEscrowDispute(escrowId: string, evidence: string) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const result = await writeContract(
    _provider,
    _address!,
    "EscrowVault",
    "dispute",
    [escrowId, evidence || "(no statement provided)"],
  );
  return result.ok
    ? { ok: true, status: 200, data: { hash: result.hash } }
    : { ok: false, status: 500, data: null, error: result.error };
}

/**
 * The responding party adds their side of a disputed escrow before resolution.
 */
export async function submitEscrowEvidence(escrowId: string, evidence: string) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const result = await writeContract(
    _provider,
    _address!,
    "EscrowVault",
    "submit_evidence",
    [escrowId, evidence || "(no statement provided)"],
  );
  return result.ok
    ? { ok: true, status: 200, data: { hash: result.hash } }
    : { ok: false, status: 500, data: null, error: result.error };
}

/**
 * Trigger validator-consensus resolution of a disputed escrow. The caller does
 * NOT choose the outcome -- GenLayer validators run LLM consensus over both
 * parties' evidence and agree on release vs refund. Returns the tx hash so the
 * UI can surface the real consensus receipt.
 */
export async function resolveDispute(escrowId: string) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const result = await writeContract(
    _provider,
    _address!,
    "EscrowVault",
    "resolve_dispute",
    [escrowId],
  );
  return result.ok
    ? { ok: true, status: 200, data: { hash: result.hash } }
    : { ok: false, status: 500, data: null, error: result.error };
}

// ── Intent operations ─────────────────────────────────────────────────────────

export async function submitIntent(payload: {
  title: string;
  description: string;
  requirements: string[];
  priority: "low" | "medium" | "high" | "critical";
  budget: number;
  deadline: Date;
}) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const intentId = `intent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const result = await writeContract(
    _provider,
    _address!,
    "IntentRegistry",
    "submit_intent",
    [
      intentId,
      payload.title,
      payload.description,
      payload.requirements.join(","),
      payload.priority,
      BigInt(Math.round(payload.budget * 1e18)),
      BigInt(Math.floor(payload.deadline.getTime() / 1000)),
    ],
  );
  return result.ok
    ? { ok: true, status: 200, hash: result.hash, data: { intent_id: intentId } }
    : { ok: false, status: 500, data: null, error: result.error };
}

// ── Negotiation operations ────────────────────────────────────────────────────

/**
 * Proposes a price and triggers AI evaluation on-chain.
 * GenLayer validators run LLM consensus -- this tx may take 10-30s.
 */
export async function proposeNegotiation(payload: {
  negotiationId: string;
  intentId: string;
  requester: string;
  provider: string;
  proposedPrice: number;
  intentDescription: string;
}) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const result = await writeContract(
    _provider,
    _address!,
    "NegotiationEngine",
    "propose_and_evaluate",
    [
      payload.negotiationId,
      payload.intentId,
      payload.requester,
      payload.provider,
      BigInt(Math.round(payload.proposedPrice * 1e18)),
      payload.intentDescription,
    ],
  );
  return result.ok
    ? { ok: true, status: 200, data: { negotiation_id: payload.negotiationId } }
    : { ok: false, status: 500, data: null, error: result.error };
}

// ── Escrow lock (payable — sends real GEN) ───────────────────────────────────

export async function lockEscrow(payload: {
  escrowId: string;
  payee: string;
  intentId: string;
  negotiationId: string;
  amountGen: number;
}) {
  const err = requireWallet();
  if (err) return { ...err, status: 401, data: null };

  const valueWei = BigInt(Math.round(payload.amountGen * 1e18));
  const result = await writeContract(
    _provider,
    _address!,
    "EscrowVault",
    "lock",
    [payload.escrowId, payload.payee, payload.intentId, payload.negotiationId],
    valueWei,
  );
  return result.ok
    ? { ok: true, status: 200, data: { escrow_id: payload.escrowId } }
    : { ok: false, status: 500, data: null, error: result.error };
}

// ── Legacy stubs (kept so components don't need changes) ──────────────────────

export function getAgents() { return Promise.resolve(null); }
export function getEscrows() { return Promise.resolve(null); }
export function getEvents() { return Promise.resolve(null); }
export function getIntents() { return Promise.resolve(null); }
export function getNegotiations() { return Promise.resolve(null); }
export function subscribeToEvents() { return null; }
export interface ApiResult<T> { ok: boolean; status: number; data: T | null; error?: string; }
