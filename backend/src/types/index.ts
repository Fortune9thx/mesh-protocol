import { z } from "zod";

// ── Agent (L1) ──

export const AgentStatus = z.enum(["active", "paused", "deactivated"]);
export type AgentStatus = z.infer<typeof AgentStatus>;

export const PricingModel = z.enum(["per_task", "per_hour", "flat", "auction"]);
export type PricingModel = z.infer<typeof PricingModel>;

export const AgentSchema = z.object({
  agent_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  owner_wallet: z.string().min(1),
  category: z.string().min(1),
  capabilities: z.array(z.string()).min(1),
  pricing_model: PricingModel,
  base_price: z.number().nonnegative(),
  availability: z.boolean(),
  reliability_score: z.number().min(0).max(100),
  confidence_score: z.number().min(0).max(100),
  endpoint_url: z.string().url().optional(),
  status: AgentStatus,
  autonomy_level: z.number().int().min(0).max(3).default(1),
  spending_limit: z.number().nonnegative().default(1000),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Agent = z.infer<typeof AgentSchema>;

export const RegisterAgentInput = AgentSchema.omit({
  agent_id: true,
  reliability_score: true,
  confidence_score: true,
  status: true,
  created_at: true,
  updated_at: true,
});
export type RegisterAgentInput = z.infer<typeof RegisterAgentInput>;

// ── Intent (L2) ──

export const IntentPriority = z.enum(["low", "medium", "high", "critical"]);
export type IntentPriority = z.infer<typeof IntentPriority>;

export const IntentStatus = z.enum([
  "pending",
  "matching",
  "negotiating",
  "in_progress",
  "delivered",
  "verified",
  "settled",
  "cancelled",
  "failed",
]);
export type IntentStatus = z.infer<typeof IntentStatus>;

export const IntentSchema = z.object({
  intent_id: z.string().uuid(),
  requester: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  requirements: z.array(z.string()),
  budget: z.number().positive(),
  deadline: z.date(),
  priority: IntentPriority,
  status: IntentStatus,
  created_at: z.date(),
  updated_at: z.date(),
});
export type Intent = z.infer<typeof IntentSchema>;

export const SubmitIntentInput = IntentSchema.omit({
  intent_id: true,
  status: true,
  created_at: true,
  updated_at: true,
});
export type SubmitIntentInput = z.infer<typeof SubmitIntentInput>;

// ── Match (L3) ──

export const MatchSchema = z.object({
  match_id: z.string().uuid(),
  intent_id: z.string().uuid(),
  agent_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  capability_score: z.number(),
  reputation_score: z.number(),
  cost_score: z.number(),
  latency_score: z.number(),
  rank: z.number().int().positive(),
  created_at: z.date(),
});
export type Match = z.infer<typeof MatchSchema>;

// ── Negotiation (L4) ──

export const NegotiationStatus = z.enum([
  "pending",
  "counter",
  "accepted",
  "rejected",
  "expired",
]);
export type NegotiationStatus = z.infer<typeof NegotiationStatus>;

export const NegotiationSchema = z.object({
  negotiation_id: z.string().uuid(),
  intent_id: z.string().uuid(),
  requester_agent: z.string().uuid(),
  provider_agent: z.string().uuid(),
  proposed_price: z.number().positive(),
  counter_price: z.number().positive().nullable(),
  deadline: z.date(),
  quality_threshold: z.number().min(0).max(100).default(80),
  confidence_guarantee: z.number().min(0).max(100).default(70),
  status: NegotiationStatus,
  round: z.number().int().min(0).default(0),
  max_rounds: z.number().int().min(1).default(5),
  created_at: z.date(),
  updated_at: z.date(),
});
export type Negotiation = z.infer<typeof NegotiationSchema>;

// ── Deliverable (L5) ──

export const DeliverableSchema = z.object({
  deliverable_id: z.string().uuid(),
  intent_id: z.string().uuid(),
  provider_id: z.string().uuid(),
  content: z.string(),
  storage_hash: z.string().nullable(),
  metadata: z.record(z.unknown()).default({}),
  created_at: z.date(),
});
export type Deliverable = z.infer<typeof DeliverableSchema>;

// ── Verification ──

export const VerificationResult = z.enum(["PASS", "FAIL", "PARTIAL"]);
export type VerificationResult = z.infer<typeof VerificationResult>;

export const VerificationSchema = z.object({
  deliverable_id: z.string().uuid(),
  result: VerificationResult,
  completeness: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
  usefulness: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  reasoning: z.string(),
});
export type Verification = z.infer<typeof VerificationSchema>;

// ── Escrow ──

export const EscrowStatus = z.enum([
  "locked",
  "released",
  "refunded",
  "disputed",
]);
export type EscrowStatus = z.infer<typeof EscrowStatus>;

export const EscrowSchema = z.object({
  escrow_id: z.string().uuid(),
  intent_id: z.string().uuid(),
  payer: z.string(),
  payee: z.string(),
  amount: z.number().positive(),
  status: EscrowStatus,
  created_at: z.date(),
  settled_at: z.date().nullable(),
});
export type Escrow = z.infer<typeof EscrowSchema>;

// ── Reputation ──

export const ReputationSchema = z.object({
  agent_id: z.string().uuid(),
  total_tasks: z.number().int().nonnegative(),
  successful_tasks: z.number().int().nonnegative(),
  failed_tasks: z.number().int().nonnegative(),
  avg_quality: z.number().min(0).max(100),
  avg_speed: z.number().min(0).max(100),
  reliability_score: z.number().min(0).max(100),
  updated_at: z.date(),
});
export type Reputation = z.infer<typeof ReputationSchema>;

// ── Events ──

export const EventType = z.enum([
  "agent_registered",
  "agent_updated",
  "agent_paused",
  "intent_submitted",
  "intent_cancelled",
  "match_found",
  "negotiation_started",
  "negotiation_counter",
  "negotiation_accepted",
  "negotiation_rejected",
  "escrow_locked",
  "deliverable_submitted",
  "verification_completed",
  "escrow_released",
  "escrow_refunded",
  "dispute_opened",
  "reputation_updated",
]);
export type EventType = z.infer<typeof EventType>;

export const EventSchema = z.object({
  event_id: z.string().uuid(),
  event_type: EventType,
  entity_id: z.string(),
  entity_type: z.string(),
  payload: z.record(z.unknown()),
  timestamp: z.date(),
});
export type MeshEvent = z.infer<typeof EventSchema>;
