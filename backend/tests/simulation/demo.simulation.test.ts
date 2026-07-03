/**
 * Simulation test: full Mesh Protocol flow with mocked DB and LLM.
 * Tests the entire pipeline without requiring live PostgreSQL or OpenAI.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/schema.js", () => ({
  query: vi.fn(),
  getPool: vi.fn(),
  closePool: vi.fn(),
}));
vi.mock("../../src/ai/provider.js", () => ({
  callLLM: vi.fn().mockResolvedValue(
    JSON.stringify({
      result: "PASS",
      completeness: 90,
      relevance: 88,
      usefulness: 85,
      confidence: 87,
      reasoning: "Deliverable satisfies all requirements.",
    })
  ),
}));
vi.mock("../../src/services/events.js", () => ({ emitEvent: vi.fn() }));
vi.mock("../../src/services/intents.js", () => ({
  updateIntentStatus: vi.fn(),
  getIntent: vi.fn(),
  listIntents: vi.fn(),
}));

import { query } from "../../src/db/schema.js";
import { AlphaResearchAgent } from "../../src/runtime/agents/AlphaResearch.js";
import { CopyForgeAgent } from "../../src/runtime/agents/CopyForge.js";
import { resolveCompromise } from "../../src/services/negotiation.js";
import { verifyDeliverable } from "../../src/services/verification.js";
import type { Deliverable, Intent, Negotiation } from "../../src/types/index.js";

describe("Full Mesh Pipeline Simulation", () => {
  beforeEach(() => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  it("agent executes task and produces output", async () => {
    const agent = new AlphaResearchAgent();
    const output = await agent.execute({
      intent_id: "sim-int-001",
      title: "Find 3 AI tokens worth monitoring",
      description: "Comprehensive AI token analysis",
      requirements: ["market_intelligence", "token_analysis"],
      budget: 150,
      deadline: new Date(Date.now() + 86400000),
    });

    expect(output.content).toBeTruthy();
    expect(output.content).toContain("RNDR");
    expect(output.confidence).toBeGreaterThan(70);
  });

  it("negotiation resolves to acceptable midpoint", () => {
    const { price, acceptable } = resolveCompromise(80, 100, 150);
    expect(price).toBe(90);
    expect(acceptable).toBe(true);
  });

  it("synthesis agent wraps multiple agent outputs", async () => {
    const agent = new CopyForgeAgent();
    const output = await agent.execute({
      intent_id: "sim-int-001",
      title: "Find 3 AI tokens worth monitoring",
      description: "Synthesize research, wallet, and risk data",
      requirements: ["report_generation"],
      budget: 150,
      deadline: new Date(Date.now() + 86400000),
    });

    expect(output.content).toContain("Mesh Protocol");
    expect(output.metadata.sources).toContain("AlphaResearch");
  });

  it("verifier passes a complete deliverable", async () => {
    const intent: Intent = {
      intent_id: "sim-int-001",
      requester: "0xSim",
      title: "Find 3 AI tokens",
      description: "...",
      requirements: ["market_intelligence"],
      budget: 150,
      deadline: new Date(),
      priority: "high",
      status: "delivered",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const deliverable: Deliverable = {
      deliverable_id: "sim-del-001",
      intent_id: "sim-int-001",
      provider_id: "agt-001",
      content: "RNDR: strong buy. FET: watch. OCEAN: accumulate.",
      storage_hash: null,
      metadata: {},
      created_at: new Date(),
    };

    const negotiation: Negotiation = {
      negotiation_id: "sim-neg-001",
      intent_id: "sim-int-001",
      requester_agent: "agt-002",
      provider_agent: "agt-001",
      proposed_price: 90,
      counter_price: 95,
      deadline: new Date(),
      quality_threshold: 80,
      confidence_guarantee: 70,
      status: "accepted",
      round: 1,
      max_rounds: 5,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await verifyDeliverable(deliverable, intent, negotiation);
    expect(result.result).toBe("PASS");
    expect(result.confidence).toBeGreaterThan(60);
  });
});
