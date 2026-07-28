import type { EventType, MeshEvent, StreamEvent } from "./types";

// Maps backend event taxonomy to the design system's 3 stream kinds:
// dispute (rust), settlement (signal blue), info (neutral).
function classifyKind(eventType: EventType): StreamEvent["kind"] {
  switch (eventType) {
    case "dispute_opened":
      return "dispute";
    case "escrow_released":
    case "escrow_refunded":
    case "negotiation_accepted":
    case "reputation_updated":
    case "verification_completed":
      return "settlement";
    default:
      return "info";
  }
}

function describe(event: MeshEvent): string {
  const p = event.payload ?? {};
  const short = (id: string) => id.slice(0, 8);

  switch (event.event_type) {
    case "agent_registered":
      return `Agent joined mesh: ${p.name ?? short(event.entity_id)}`;
    case "agent_updated":
      return `Agent updated: ${short(event.entity_id)}`;
    case "agent_paused":
      return `Agent paused: ${short(event.entity_id)}`;
    case "intent_submitted":
      return `Intent submitted: ${p.title ?? short(event.entity_id)} · budget ${p.budget ?? "—"}`;
    case "intent_cancelled":
      return `Intent cancelled: ${short(event.entity_id)}`;
    case "match_found":
      return `Match found: rank #${p.rank ?? "—"} · score ${typeof p.score === "number" ? p.score.toFixed(1) : p.score ?? "—"}`;
    case "negotiation_started":
      return `Negotiation opened: proposed ${p.proposed_price ?? "—"}`;
    case "negotiation_counter":
      return `Negotiation counter: ${p.counter_price ?? "—"}`;
    case "negotiation_accepted":
      return `Negotiation accepted: ${short(event.entity_id)}`;
    case "negotiation_rejected":
      return `Negotiation rejected: ${short(event.entity_id)}`;
    case "escrow_locked":
      return `Escrow locked: ${p.amount ?? "—"} · intent ${short(String(p.intent_id ?? ""))}`;
    case "deliverable_submitted":
      return `Deliverable submitted: intent ${short(String(p.intent_id ?? ""))}`;
    case "verification_completed":
      return `Verification completed: ${p.result ?? "—"}`;
    case "escrow_released":
      return `Settlement finalized: ${p.amount ?? "—"} released to ${p.payee ?? "provider"}`;
    case "escrow_refunded":
      return `Escrow refunded: ${p.amount ?? "—"} to ${p.payer ?? "requester"}`;
    case "dispute_opened":
      return `Dispute flagged: ${p.verification_result ?? "escrow"} · intent ${short(event.entity_id)}`;
    case "reputation_updated":
      return `Reputation updated: ${p.reliability_score ?? "—"} · ${p.total_tasks ?? "—"} tasks`;
    default:
      return `${event.event_type} · ${short(event.entity_id)}`;
  }
}

export function toStreamEvent(event: MeshEvent): StreamEvent {
  return {
    id: event.event_id,
    time: new Date(event.timestamp).toISOString().substring(11, 19),
    text: describe(event),
    kind: classifyKind(event.event_type),
  };
}

export function toTickerLine(event: MeshEvent): string {
  const kindLabel: Record<StreamEvent["kind"], string> = {
    dispute: "DISPUTE",
    settlement: "SETTLEMENT",
    info: event.event_type.toUpperCase().replace(/_/g, " "),
  };
  const kind = classifyKind(event.event_type);
  return `${kindLabel[kind]} · ${describe(event)}`;
}
