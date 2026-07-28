import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB to avoid needing a real postgres connection in unit tests
vi.mock("../../src/db/schema.js", () => ({
  query: vi.fn(),
  getPool: vi.fn(),
}));
vi.mock("../../src/services/events.js", () => ({ emitEvent: vi.fn() }));
vi.mock("../../src/services/intents.js", () => ({ updateIntentStatus: vi.fn() }));

import { query } from "../../src/db/schema.js";
import { matchIntent } from "../../src/services/matching.js";
import type { Agent, Intent } from "../../src/types/index.js";

const mockAgent = (overrides: Partial<Agent> = {}): Agent => ({
  agent_id: "agt-001",
  name: "TestAgent",
  owner_wallet: "0xOwner",
  category: "research",
  capabilities: ["market_intelligence", "token_analysis"],
  pricing_model: "per_task",
  base_price: 40,
  availability: true,
  reliability_score: 80,
  confidence_score: 75,
  endpoint_url: undefined,
  status: "active",
  autonomy_level: 1,
  spending_limit: 500,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

const mockIntent = (overrides: Partial<Intent> = {}): Intent => ({
  intent_id: "int-001",
  requester: "0xRequester",
  title: "Test Intent",
  description: "Find tokens",
  requirements: ["market_intelligence"],
  budget: 100,
  deadline: new Date(Date.now() + 86400000),
  priority: "medium",
  status: "pending",
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

describe("matchIntent scoring", () => {
  beforeEach(() => {
    vi.mocked(query).mockResolvedValue({ rows: [], rowCount: 0 } as any);
  });

  it("returns empty array when no agents available", async () => {
    // listAgents returns [] (no active agents)
    vi.mocked(query).mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // listAgents
    const matches = await matchIntent(mockIntent());
    expect(matches).toEqual([]);
  });

  it("ranks agents with matching capabilities higher", async () => {
    const highAgent = mockAgent({ agent_id: "agt-001", capabilities: ["market_intelligence"], reliability_score: 80 });
    const lowAgent = mockAgent({ agent_id: "agt-002", capabilities: ["unrelated_skill"], reliability_score: 90 });

    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [highAgent, lowAgent], rowCount: 2 } as any) // listAgents
      .mockResolvedValue({ rows: [], rowCount: 0 } as any); // insert match rows

    const matches = await matchIntent(mockIntent(), undefined, 5);
    // Only highAgent has matching capabilities (capability_score > 0)
    expect(matches.length).toBe(1);
    expect(matches[0].agent_id).toBe("agt-001");
  });

  it("assigns rank correctly", async () => {
    const a1 = mockAgent({ agent_id: "agt-001", capabilities: ["market_intelligence"], reliability_score: 90 });
    const a2 = mockAgent({ agent_id: "agt-002", capabilities: ["market_intelligence", "token_analysis"], reliability_score: 60 });

    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [a1, a2], rowCount: 2 } as any)
      .mockResolvedValue({ rows: [], rowCount: 0 } as any);

    const matches = await matchIntent(mockIntent());
    const ranks = matches.map((m) => m.rank);
    expect(ranks).toEqual([1, 2]);
  });

  it("respects maxResults", async () => {
    const agents = Array.from({ length: 10 }, (_, i) =>
      mockAgent({ agent_id: `agt-${i}`, capabilities: ["market_intelligence"] })
    );

    vi.mocked(query)
      .mockResolvedValueOnce({ rows: agents, rowCount: agents.length } as any)
      .mockResolvedValue({ rows: [], rowCount: 0 } as any);

    const matches = await matchIntent(mockIntent(), undefined, 3);
    expect(matches.length).toBeLessThanOrEqual(3);
  });
});
