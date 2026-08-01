"use client";

/**
 * Mesh Protocol -- On-chain contract client
 * Replaces the REST API backend. All reads/writes go directly to
 * GenLayer Bradbury via genlayer-js.
 *
 * READ calls: no wallet needed (view functions, no gas)
 * WRITE calls: need MetaMask -- provider + address from WalletProvider
 *
 * UPDATE CONTRACT_ADDRESSES after running scripts/deploy-contracts.mjs
 */

// ── Contract addresses (update after each redeploy) ──────────────────────────
export const CONTRACT_ADDRESSES = {
  AgentRegistry:     "0x1813d28DCE1a97C69D8a81674275672920f0D89c" as `0x${string}`,
  IntentRegistry:    "0x7d252ad8A536a43D518a3A1fE55DDc9B5831b3BD" as `0x${string}`,
  NegotiationEngine: "0xE94A830581727A4317e58b9aA61d435d5c6f15c0" as `0x${string}`,
  EscrowVault:       "0x896235Ef525EA648a111f171c328fe89C96eAb24" as `0x${string}`,
  ReputationLedger:  "0xd01728B2D7F101Fc22409349a9b06746454F05C8" as `0x${string}`,
} as const;

type ContractName = keyof typeof CONTRACT_ADDRESSES;

// ── Client singleton (lazy, browser-only) ─────────────────────────────────────

let _readClient: unknown = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function getChain() {
  const chains = await import("genlayer-js/chains");
  const key = process.env.NEXT_PUBLIC_MESH_NETWORK ?? "bradbury";
  return key === "studionet" ? chains.studionet : chains.testnetBradbury;
}

async function getReadClient(): Promise<AnyClient> {
  if (_readClient) return _readClient;
  const { createClient } = await import("genlayer-js");
  _readClient = createClient({ chain: await getChain() });
  return _readClient;
}

async function getWriteClient(provider: unknown, address: string): Promise<AnyClient> {
  const { createClient } = await import("genlayer-js");
  return createClient({ chain: await getChain(), account: address as `0x${string}`, provider });
}

// ── Core call helpers ─────────────────────────────────────────────────────────

export async function readContract(
  contract: ContractName,
  method: string,
  args: unknown[] = [],
): Promise<unknown> {
  try {
    const client = await getReadClient();
    return await client.readContract({
      address: CONTRACT_ADDRESSES[contract],
      functionName: method,
      args,
    });
  } catch (err) {
    console.warn(`[mesh] read ${contract}.${method} failed:`, (err as Error).message);
    return null;
  }
}

export async function writeContract(
  provider: unknown,
  address: string,
  contract: ContractName,
  method: string,
  args: unknown[],
  value?: bigint,
): Promise<{ ok: boolean; hash?: string; error?: string }> {
  try {
    const client = await getWriteClient(provider, address);
    const hash = await client.writeContract({
      address: CONTRACT_ADDRESSES[contract],
      functionName: method,
      args,
      ...(value !== undefined ? { value } : {}),
    });
    // Wait for GenLayer validator consensus before returning — without this
    // the tx is submitted but the state change isn't on-chain yet.
    await client.waitForTransactionReceipt({ hash, status: "ACCEPTED" });
    return { ok: true, hash: hash as string };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

// ── Data parsers ──────────────────────────────────────────────────────────────

// View methods return native dicts. genlayer-js decodes them as either a plain
// object or a Map depending on the value; normalize both to a plain record.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function asRecord(raw: unknown): Record<string, any> {
  if (!raw) return {};
  if (raw instanceof Map) return Object.fromEntries(raw);
  if (typeof raw === "object") return raw as Record<string, unknown>;
  return {};
}

function isEmpty(d: Record<string, unknown>): boolean {
  return Object.keys(d).length === 0;
}

// ── AgentRegistry ─────────────────────────────────────────────────────────────

export async function fetchAgentCount(): Promise<number> {
  const n = await readContract("AgentRegistry", "get_agent_count", []);
  return Number(n ?? 0);
}

export async function fetchAgentIdAt(index: number): Promise<string> {
  return (await readContract("AgentRegistry", "get_agent_id_at", [BigInt(index)])) as string ?? "";
}

export async function fetchAgentData(agentId: string) {
  const d = asRecord(await readContract("AgentRegistry", "get_agent_data", [agentId]));
  if (isEmpty(d)) return null;
  const reliability = await fetchReliability(agentId);
  return {
    agent_id: agentId,
    name: d.name ?? agentId,
    category: d.category ?? "general",
    capabilities: String(d.capabilities ?? "").split(",").filter(Boolean),
    status: (d.status ?? "active") as "active" | "paused" | "deactivated",
    spending_limit: Number(d.spending_limit ?? 0) / 1e18,
    autonomy_level: Number(d.autonomy_level ?? 1),
    pricing_model: (d.pricing_model ?? "per_task") as "per_task" | "per_hour" | "flat" | "auction",
    base_price: Number(d.base_price ?? 0) / 1e18,
    owner_wallet: d.owner ?? "",
    reliability_score: reliability,
    availability: d.status === "active",
  };
}

export async function fetchAllAgents() {
  const count = await fetchAgentCount();
  const ids = await Promise.all(
    Array.from({ length: count }, (_, i) => fetchAgentIdAt(i)),
  );
  const agents = await Promise.all(ids.filter(Boolean).map(fetchAgentData));
  return agents.filter(Boolean);
}

// ── EscrowVault ───────────────────────────────────────────────────────────────

export async function fetchEscrowCount(): Promise<number> {
  const n = await readContract("EscrowVault", "get_escrow_count", []);
  return Number(n ?? 0);
}

export async function fetchEscrowIdAt(index: number): Promise<string> {
  return (await readContract("EscrowVault", "get_escrow_id_at", [BigInt(index)])) as string ?? "";
}

export async function fetchEscrowData(escrowId: string) {
  const d = asRecord(await readContract("EscrowVault", "get_escrow_data", [escrowId]));
  if (isEmpty(d)) return null;
  return {
    escrow_id: escrowId,
    intent_id: d.intent ?? "",
    payer: d.payer ?? "",
    payee: d.payee ?? "",
    amount: Number(d.balance ?? 0) / 1e18,
    status: (d.status ?? "locked") as "locked" | "released" | "refunded" | "disputed",
    verdict: d.verdict ?? "",
    has_delivery: Boolean(d.has_delivery),
  };
}

export async function fetchDispute(escrowId: string) {
  const d = asRecord(await readContract("EscrowVault", "get_dispute", [escrowId]));
  return {
    payer_evidence: d.payer_evidence ?? "",
    payee_evidence: d.payee_evidence ?? "",
    delivery_evidence: d.delivery_evidence ?? "",
    verdict: d.verdict ?? "",
  };
}

export async function fetchDeliveryEvidence(escrowId: string): Promise<string> {
  const r = await readContract("EscrowVault", "get_delivery_evidence", [escrowId]);
  return (r as string) ?? "";
}

export async function fetchHasDelivery(escrowId: string): Promise<boolean> {
  const r = await readContract("EscrowVault", "has_delivery_evidence", [escrowId]);
  return Boolean(r);
}

export async function fetchAllEscrows() {
  const count = await fetchEscrowCount();
  const ids = await Promise.all(
    Array.from({ length: count }, (_, i) => fetchEscrowIdAt(i)),
  );
  const escrows = await Promise.all(ids.filter(Boolean).map(fetchEscrowData));
  return escrows.filter(Boolean);
}

// ── IntentRegistry ────────────────────────────────────────────────────────────

export async function fetchIntentCount(): Promise<number> {
  const n = await readContract("IntentRegistry", "get_intent_count", []);
  return Number(n ?? 0);
}

export async function fetchIntentIdAt(index: number): Promise<string> {
  return (await readContract("IntentRegistry", "get_intent_id_at", [BigInt(index)])) as string ?? "";
}

export async function fetchIntentData(intentId: string) {
  const d = asRecord(await readContract("IntentRegistry", "get_intent_data", [intentId]));
  if (isEmpty(d)) return null;
  return {
    intent_id: intentId,
    title: d.title ?? intentId,
    description: d.description ?? "",
    requirements: String(d.requirements ?? "").split(",").filter(Boolean),
    priority: (d.priority ?? "medium") as "low" | "medium" | "high" | "critical",
    budget: Number(d.budget ?? 0) / 1e18,
    deadline: new Date(Number(d.deadline ?? 0) * 1000).toISOString(),
    status: (d.status ?? "pending") as import("./types").IntentStatus,
    requester: d.requester ?? "",
  };
}

export async function fetchAllIntents() {
  const count = await fetchIntentCount();
  const ids = await Promise.all(
    Array.from({ length: count }, (_, i) => fetchIntentIdAt(i)),
  );
  const intents = await Promise.all(ids.filter(Boolean).map(fetchIntentData));
  return intents.filter(Boolean);
}

// ── NegotiationEngine ─────────────────────────────────────────────────────────

export async function fetchNegotiationData(negId: string) {
  const d = asRecord(await readContract("NegotiationEngine", "get_negotiation_data", [negId]));
  if (isEmpty(d)) return null;
  return {
    negotiation_id: negId,
    intent_id: d.intent ?? "",
    requester_agent: d.requester ?? "",
    provider_agent: d.provider ?? "",
    proposed_price: Number(d.price ?? 0) / 1e18,
    // Exact wei string -- use this (not proposed_price, a lossy float) when
    // locking escrow, since EscrowVault.lock() requires msg.value to equal
    // the agreed price exactly.
    agreed_price_wei: String(d.price ?? "0"),
    counter_price: null as number | null,
    status: (d.status ?? "pending") as import("./types").NegotiationStatus,
    ai_verdict: d.verdict ?? "",
  };
}

// ── ReputationLedger ──────────────────────────────────────────────────────────

export async function fetchReliability(agentId: string): Promise<number> {
  const r = await readContract("ReputationLedger", "get_reliability", [agentId]);
  return Number(r ?? 80);
}
