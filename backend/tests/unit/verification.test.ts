import { describe, it, expect, vi } from "vitest";

vi.mock("../../src/ai/provider.js", () => ({
  callLLM: vi.fn(),
}));
vi.mock("../../src/services/events.js", () => ({ emitEvent: vi.fn() }));

import { callLLM } from "../../src/ai/provider.js";
import { verifyDeliverable } from "../../src/services/verification.js";
import type { Deliverable, Intent, Negotiation } from "../../src/types/index.js";

const mockIntent: Intent = {
  intent_id: "int-001",
  requester: "0xR",
  title: "Find AI tokens",
  description: "Find 3 tokens",
  requirements: ["market_intelligence"],
  budget: 100,
  deadline: new Date(),
  priority: "high",
  status: "in_progress",
  created_at: new Date(),
  updated_at: new Date(),
};

const mockDeliverable: Deliverable = {
  deliverable_id: "del-001",
  intent_id: "int-001",
  provider_id: "agt-001",
  content: "Here are 3 AI tokens: RNDR, FET, OCEAN with detailed analysis.",
  storage_hash: null,
  metadata: {},
  created_at: new Date(),
};

const mockNegotiation: Negotiation = {
  negotiation_id: "neg-001",
  intent_id: "int-001",
  requester_agent: "agt-002",
  provider_agent: "agt-001",
  proposed_price: 80,
  counter_price: 90,
  deadline: new Date(),
  quality_threshold: 80,
  confidence_guarantee: 70,
  status: "accepted",
  round: 1,
  max_rounds: 5,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("verifyDeliverable", () => {
  it("returns PASS when LLM returns valid JSON PASS", async () => {
    vi.mocked(callLLM).mockResolvedValue(
      JSON.stringify({ result: "PASS", completeness: 90, relevance: 92, usefulness: 88, confidence: 89, reasoning: "All requirements met." })
    );

    const result = await verifyDeliverable(mockDeliverable, mockIntent, mockNegotiation);
    expect(result.result).toBe("PASS");
    expect(result.completeness).toBe(90);
  });

  it("returns FAIL from LLM response", async () => {
    vi.mocked(callLLM).mockResolvedValue(
      JSON.stringify({ result: "FAIL", completeness: 20, relevance: 30, usefulness: 15, confidence: 40, reasoning: "Missing requirements." })
    );

    const result = await verifyDeliverable(mockDeliverable, mockIntent, mockNegotiation);
    expect(result.result).toBe("FAIL");
  });

  it("falls back to heuristic parsing on non-JSON response", async () => {
    vi.mocked(callLLM).mockResolvedValue(
      "The deliverable passes all requirements and is complete and satisfactory."
    );

    const result = await verifyDeliverable(mockDeliverable, mockIntent, mockNegotiation);
    expect(result.result).toBe("PASS");
  });

  it("handles PARTIAL result", async () => {
    vi.mocked(callLLM).mockResolvedValue(
      JSON.stringify({ result: "PARTIAL", completeness: 60, relevance: 70, usefulness: 55, confidence: 65, reasoning: "Partially meets requirements." })
    );

    const result = await verifyDeliverable(mockDeliverable, mockIntent, mockNegotiation);
    expect(result.result).toBe("PARTIAL");
  });
});
