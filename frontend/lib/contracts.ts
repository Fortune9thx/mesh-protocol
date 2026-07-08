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
  AgentRegistry:     "0x7c5c449693b13EaE076755a3d708c1997Ad588e0" as `0x${string}`,
  IntentRegistry:    "0x2FC87d06958143c39303702F06b181697454C1Aa" as `0x${string}`,
  NegotiationEngine: "0xe894c0551CAC6dB315096015a48065C39Fa6acf8" as `0x${string}`,
  EscrowVault:       "0x8315d7E939B8e873a36c753405eE748905660bea" as `0x${string}`,
  ReputationLedger:  "0xF7D3F5d3eC23036842423A0DC64335A0D673A4fD" as `0x${string}`,
} as const;

type ContractName = keyof typeof CONTRACT_ADDRESSES;

// ── Client singleton (lazy, browser-only) ─────────────────────────────────────

let _readClient: unknown = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

async function getReadClient(): Promise<AnyClient> {
  if (_readClient) return _readClient;
  const { createClient } = await import("genlayer-js");
  const { testnetBradbury } = await import("genlayer-js/chains");
  _readClient = createClient({ chain: testnetBradbury });
  return _readClient;
}

async function getWriteClient(provider: unknown, address: string): Promise<AnyClient> {
  const { createClient } = await import("genlayer-js");
  const { testnetBradbury } = await import("genlayer-js/chains");
  return createClient({ chain: testnetBradbury, account: address as `0x${string}`, provider });
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

function parsePiped(raw: string): Record<string, string> {
  if (!raw) return {};
  return Object.fromEntries(
    raw.split("|").map((kv) => {
      const eq = kv.indexOf("=");
      return eq === -1 ? [kv, ""] : [kv.slice(0, eq), kv.slice(eq + 1)];
    }),
  );
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
  const raw = (await readContract("AgentRegistry", "get_agent_data", [agentId])) as string ?? "";
  if (!raw) return null;
  const d = parsePiped(raw);
  return {
    agent_id: agentId,
    name: d.name ?? agentId,
    category: d.cat ?? "general",
    capabilities: (d.caps ?? "").split(",").filter(Boolean),
    status: (d.status ?? "active") as "active" | "paused" | "deactivated",
    spending_limit: Number(d.limit ?? 0),
    autonomy_level: Number(d.level ?? 1),
    pricing_model: (d.pricing ?? "per_task") as "per_task" | "per_hour" | "flat" | "auction",
    base_price: Number(d.price ?? 0),
    owner_wallet: d.owner ?? "",
    reliability_score: 80,
    confidence_score: 0.85,
    availability: d.status === "active",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
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
  const raw = (await readContract("EscrowVault", "get_escrow_data", [escrowId])) as string ?? "";
  if (!raw) return null;
  const d = parsePiped(raw);
  const balanceWei = Number(d.balance ?? 0);
  return {
    escrow_id: escrowId,
    intent_id: d.intent ?? "",
    payer: d.payer ?? "",
    payee: d.payee ?? "",
    amount: balanceWei / 1e18,
    status: (d.status ?? "locked") as "locked" | "released" | "refunded" | "disputed",
    created_at: new Date().toISOString(),
    settled_at: null as string | null,
  };
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
  const raw = (await readContract("IntentRegistry", "get_intent_data", [intentId])) as string ?? "";
  if (!raw) return null;
  const d = parsePiped(raw);
  return {
    intent_id: intentId,
    title: d.title ?? intentId,
    description: d.desc ?? "",
    requirements: (d.reqs ?? "").split(",").filter(Boolean),
    priority: (d.priority ?? "medium") as "low" | "medium" | "high" | "critical",
    budget: Number(d.budget ?? 0) / 1e18,
    deadline: new Date(Number(d.deadline ?? 0) * 1000).toISOString(),
    status: (d.status ?? "pending") as import("./types").IntentStatus,
    requester: d.requester ?? "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── NegotiationEngine ─────────────────────────────────────────────────────────

export async function fetchNegotiationData(negId: string) {
  const raw = (await readContract("NegotiationEngine", "get_negotiation_data", [negId])) as string ?? "";
  if (!raw) return null;
  const d = parsePiped(raw);
  return {
    negotiation_id: negId,
    intent_id: d.intent ?? "",
    requester_agent: d.requester ?? "",
    provider_agent: d.provider ?? "",
    proposed_price: Number(d.price ?? 0) / 1e18,
    counter_price: null as number | null,
    status: (d.status ?? "pending") as import("./types").NegotiationStatus,
    ai_verdict: d.verdict ?? "",
    round: 1,
    max_rounds: 3,
    quality_threshold: 0.85,
    confidence_guarantee: 0.90,
    deadline: new Date(Date.now() + 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ── ReputationLedger ──────────────────────────────────────────────────────────

export async function fetchReliability(agentId: string): Promise<number> {
  const r = await readContract("ReputationLedger", "get_reliability", [agentId]);
  return Number(r ?? 80);
}
