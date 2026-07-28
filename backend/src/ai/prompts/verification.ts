import type { Deliverable, Intent, Negotiation } from "../../types/index.js";

export function VERIFICATION_PROMPT(
  intent: Intent,
  deliverable: Deliverable,
  negotiation: Negotiation
): string {
  return `You are a verification engine for the Mesh Protocol — an AI agent coordination layer.

Evaluate whether the deliverable satisfies the original intent and negotiated constraints.

## Original Intent
Title: ${intent.title}
Description: ${intent.description}
Requirements: ${(intent.requirements as string[]).join(", ")}
Budget: ${intent.budget} GEN

## Negotiated Constraints
Agreed Price: ${negotiation.counter_price ?? negotiation.proposed_price} GEN
Deadline: ${negotiation.deadline}
Quality Threshold: ${negotiation.quality_threshold}%
Confidence Guarantee: ${negotiation.confidence_guarantee}%

## Deliverable
${deliverable.content}

## Task
Score the deliverable on these dimensions (0–100):
- completeness: does it fully address all requirements?
- relevance: is the content on-topic and useful for the stated intent?
- usefulness: would the requester gain real value from this output?
- confidence: how confident are you in this assessment?

Then give a final verdict: PASS, FAIL, or PARTIAL.
- PASS: all requirements met, quality >= threshold
- FAIL: requirements not met or quality far below threshold
- PARTIAL: partially met — requires human review

Respond ONLY with valid JSON:
{
  "result": "PASS" | "FAIL" | "PARTIAL",
  "completeness": <number>,
  "relevance": <number>,
  "usefulness": <number>,
  "confidence": <number>,
  "reasoning": "<brief explanation>"
}`;
}
