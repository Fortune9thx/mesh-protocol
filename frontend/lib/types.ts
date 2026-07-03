// Core protocol types, mirrored from backend/src/types/index.ts (Zod schemas).
// Kept as plain TypeScript types on the frontend — no Zod validation needed client-side.

export type AgentStatus = "active" | "paused" | "deactivated";
export type PricingModel = "per_task" | "per_hour" | "flat" | "auction";

export interface Agent {
  agent_id: string;
  name: string;
  owner_wallet: string;
  category: string;
  capabilities: string[];
  pricing_model: PricingModel;
  base_price: number;
  availability: boolean;
  reliability_score: number;
  confidence_score: number;
  endpoint_url?: string;
  status: AgentStatus;
  autonomy_level: number;
  spending_limit: number;
  created_at: string;
  updated_at: string;
}

export type IntentPriority = "low" | "medium" | "high" | "critical";
export type IntentStatus =
  | "pending"
  | "matching"
  | "negotiating"
  | "in_progress"
  | "delivered"
  | "verified"
  | "settled"
  | "cancelled"
  | "failed";

export interface Intent {
  intent_id: string;
  requester: string;
  title: string;
  description: string;
  requirements: string[];
  budget: number;
  deadline: string;
  priority: IntentPriority;
  status: IntentStatus;
  created_at: string;
  updated_at: string;
}

export type NegotiationStatus = "pending" | "counter" | "accepted" | "rejected" | "expired";

export interface Negotiation {
  negotiation_id: string;
  intent_id: string;
  requester_agent: string;
  provider_agent: string;
  proposed_price: number;
  counter_price: number | null;
  deadline: string;
  quality_threshold: number;
  confidence_guarantee: number;
  status: NegotiationStatus;
  round: number;
  max_rounds: number;
  created_at: string;
  updated_at: string;
}

export type EscrowStatus = "locked" | "released" | "refunded" | "disputed";

export interface Escrow {
  escrow_id: string;
  intent_id: string;
  payer: string;
  payee: string;
  amount: number;
  status: EscrowStatus;
  created_at: string;
  settled_at: string | null;
}

export type EventType =
  | "agent_registered"
  | "agent_updated"
  | "agent_paused"
  | "intent_submitted"
  | "intent_cancelled"
  | "match_found"
  | "negotiation_started"
  | "negotiation_counter"
  | "negotiation_accepted"
  | "negotiation_rejected"
  | "escrow_locked"
  | "deliverable_submitted"
  | "verification_completed"
  | "escrow_released"
  | "escrow_refunded"
  | "dispute_opened"
  | "reputation_updated";

export interface MeshEvent {
  event_id: string;
  event_type: EventType;
  entity_id: string;
  entity_type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// ── UI / frontend-only shapes ──

export type View = "overview" | "console" | "workbench";
export type ModalKind = "register" | "arbitrate" | "fund" | null;

export type NodeTier = "orchestrator" | "sub";
export type NodeStatus = "active" | "dispute" | "capped";

export interface TopologyNode {
  id: string;
  label: string;
  sub: string;
  tier: NodeTier;
  x: number;
  y: number;
  size: number;
  trust: number;
  load: number;
  confidence: number;
  contracts: number;
  meshId: string;
  status: NodeStatus;
}

export type EdgeState = "active" | "negotiating" | "dispute" | "collapsed";

export interface TopologyEdge {
  id: string;
  fromId: string;
  toId: string;
  state: EdgeState;
}

export interface StreamEvent {
  id: string;
  time: string;
  text: string;
  kind: "settlement" | "dispute" | "info";
}
