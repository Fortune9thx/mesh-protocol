import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../src/db/schema.js", () => ({ query: vi.fn() }));
vi.mock("../../src/services/events.js", () => ({ emitEvent: vi.fn() }));

import { query } from "../../src/db/schema.js";
import { registerAgent, getAgent, pauseAgent } from "../../src/services/agents.js";

const mockRow = {
  agent_id: "agt-001",
  name: "AlphaResearch",
  owner_wallet: "0xOwner",
  category: "research",
  capabilities: ["market_intelligence"],
  pricing_model: "per_task",
  base_price: 40,
  availability: true,
  reliability_score: 50,
  confidence_score: 50,
  status: "active",
  autonomy_level: 1,
  spending_limit: 500,
  created_at: new Date(),
  updated_at: new Date(),
};

describe("AgentService", () => {
  beforeEach(() => vi.clearAllMocks());

  it("registerAgent inserts and returns agent", async () => {
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [mockRow], rowCount: 1 } as any) // INSERT agent
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // INSERT reputation

    const agent = await registerAgent({
      name: "AlphaResearch",
      owner_wallet: "0xOwner",
      category: "research",
      capabilities: ["market_intelligence"],
      pricing_model: "per_task",
      base_price: 40,
      availability: true,
      autonomy_level: 1,
      spending_limit: 500,
    });

    expect(agent.name).toBe("AlphaResearch");
    expect(agent.status).toBe("active");
  });

  it("getAgent returns null for unknown id", async () => {
    vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);
    const result = await getAgent("nonexistent-id");
    expect(result).toBeNull();
  });

  it("pauseAgent updates status", async () => {
    const paused = { ...mockRow, status: "paused" };
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [paused], rowCount: 1 } as any) // UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // emitEvent insert

    const result = await pauseAgent("agt-001");
    expect(result?.status).toBe("paused");
  });
});
