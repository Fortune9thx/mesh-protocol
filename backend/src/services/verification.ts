import { callLLM } from "../ai/provider.js";
import { VERIFICATION_PROMPT } from "../ai/prompts/verification.js";
import { emitEvent } from "./events.js";
import type { Deliverable, Intent, Negotiation, Verification, VerificationResult } from "../types/index.js";

export async function verifyDeliverable(
  deliverable: Deliverable,
  intent: Intent,
  negotiation: Negotiation
): Promise<Verification> {
  const prompt = VERIFICATION_PROMPT(intent, deliverable, negotiation);
  const response = await callLLM(prompt);

  const parsed = parseVerificationResponse(response);

  await emitEvent("verification_completed", deliverable.deliverable_id, "deliverable", {
    result: parsed.result,
    confidence: parsed.confidence,
  });

  return parsed;
}

function parseVerificationResponse(raw: string): Verification & { deliverable_id: string } {
  // Extract structured data from LLM response or apply heuristics
  const lower = raw.toLowerCase();

  let result: VerificationResult = "PARTIAL";
  let completeness = 70;
  let relevance = 70;
  let usefulness = 70;
  let confidence = 70;

  // Simple keyword heuristics as fallback when no JSON returned
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
      result = (parsed.result as VerificationResult) ?? "PARTIAL";
      completeness = Number(parsed.completeness ?? 70);
      relevance = Number(parsed.relevance ?? 70);
      usefulness = Number(parsed.usefulness ?? 70);
      confidence = Number(parsed.confidence ?? 70);
    } catch {
      // fall through to heuristics
    }
  } else {
    if (lower.includes("pass") || lower.includes("satisf") || lower.includes("complete")) {
      result = "PASS";
      completeness = 90; relevance = 85; usefulness = 85; confidence = 85;
    } else if (lower.includes("fail") || lower.includes("insufficient") || lower.includes("missing")) {
      result = "FAIL";
      completeness = 30; relevance = 40; usefulness = 30; confidence = 30;
    }
  }

  return {
    deliverable_id: "",
    result,
    completeness,
    relevance,
    usefulness,
    confidence,
    reasoning: raw.slice(0, 1000),
  };
}
