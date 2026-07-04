import type { Agent, Escrow, Intent, MeshEvent, Negotiation } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3100";

// Module-level auth token set by WalletProvider after sign-in.
// All mutating calls use this JWT via Authorization: Bearer header.
let _authToken: string | null = null;
let _walletAddress: string | null = null;

export function setAuthCredentials(jwt: string | null, wallet: string | null) {
  _authToken = jwt;
  _walletAddress = wallet;
}

async function safeFetch<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export interface ApiResult<T> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
}

async function safePost<T>(path: string, body: unknown, walletOverride?: string): Promise<ApiResult<T>> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };

    if (_authToken) {
      headers["Authorization"] = `Bearer ${_authToken}`;
    } else {
      // Dev / demo fallback when no JWT is present
      const wallet = walletOverride ?? _walletAddress ?? "0xMeshDemoOperatorWallet01";
      headers["X-Wallet-Address"] = wallet;
    }

    const res = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => null)) as T | { error: unknown } | null;
    if (!res.ok) {
      const errMsg =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : `HTTP ${res.status}`;
      return { ok: false, status: res.status, data: null, error: errMsg };
    }
    return { ok: true, status: res.status, data: data as T };
  } catch (err) {
    return { ok: false, status: 0, data: null, error: err instanceof Error ? err.message : "Network error" };
  }
}

export function getAgents() {
  return safeFetch<Agent[]>("/agents");
}

export function getAgent(id: string) {
  return safeFetch<Agent>(`/agents/${id}`);
}

export function getAnalytics() {
  return safeFetch<Record<string, unknown>>("/analytics");
}

export function getEvents(limit = 50) {
  return safeFetch<MeshEvent[]>(`/events?limit=${limit}`);
}

export function getIntents() {
  return safeFetch<Intent[]>("/intents");
}

export function getNegotiations(limit = 100) {
  return safeFetch<Negotiation[]>(`/negotiations?limit=${limit}`);
}

export function getEscrows(limit = 100) {
  return safeFetch<Escrow[]>(`/escrows?limit=${limit}`);
}

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

export function registerAgent(payload: RegisterAgentPayload) {
  return safePost<Agent>("/agents/register", payload);
}

export function pauseAgent(agentId: string) {
  return safePost<Agent>(`/admin/pause-agent/${agentId}`, {});
}

export function overrideSettlement(escrowId: string, newStatus: "released" | "refunded" | "disputed") {
  return safePost<Escrow>("/admin/override-settlement", { escrow_id: escrowId, new_status: newStatus });
}

export function openDispute(intentId: string, reason: string) {
  return safePost<{ message: string; intent_id: string }>("/admin/dispute", { intent_id: intentId, reason });
}

// Live event stream via SSE. Returns an EventSource the caller must close.
export function subscribeToEvents(onEvent: (event: MeshEvent | { type: "connected" }) => void): EventSource | null {
  if (typeof window === "undefined") return null;
  try {
    const es = new EventSource(`${API_URL}/events/stream`);
    es.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data));
      } catch {
        // ignore malformed frames
      }
    };
    return es;
  } catch {
    return null;
  }
}
