import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";

vi.mock("../../src/db/schema.js", () => ({ query: vi.fn() }));
vi.mock("../../src/services/events.js", () => ({ emitEvent: vi.fn() }));
vi.mock("../../src/genlayer/client.js", () => ({
  AgentRegistry:     { registerAgent: vi.fn(), pauseAgent: vi.fn(), isActive: vi.fn(), getSpendingLimit: vi.fn() },
  IntentRegistry:    { submitIntent: vi.fn(), updateStatus: vi.fn(), cancelIntent: vi.fn(), getStatus: vi.fn() },
  EscrowVault:       { lock: vi.fn(), release: vi.fn(), refund: vi.fn(), dispute: vi.fn(), resolveDispute: vi.fn(), getStatus: vi.fn() },
  NegotiationEngine: { record: vi.fn(), accept: vi.fn(), reject: vi.fn() },
  ReputationLedger:  { recordOutcome: vi.fn(), getReliability: vi.fn(), getStats: vi.fn() },
}));

import { query } from "../../src/db/schema.js";
import { agentRoutes } from "../../src/api/agents.js";
import { analyticsRoutes } from "../../src/api/analytics.js";

const AGENT = {
  agent_id: "agt-001",
  name: "AlphaResearch",
  owner_wallet: "0xOwnerWallet",
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

const ESCROW = {
  escrow_id: "esc-001",
  intent_id: "int-001",
  payer: "0xPayerWallet",
  payee: "0xPayeeWallet",
  amount: 100,
  status: "locked",
};

function buildApp() {
  const app = Fastify();
  app.register(agentRoutes);
  app.register(analyticsRoutes);
  return app;
}

// Mocks the operatorAuth pre-check: "SELECT 1 FROM agents WHERE owner_wallet = $1 ..."
function mockOperatorCheck(passes: boolean) {
  vi.mocked(query).mockResolvedValueOnce(
    passes ? ({ rows: [{ "?column?": 1 }], rowCount: 1 } as any) : ({ rows: [], rowCount: 0 } as any)
  );
}

describe("Ownership enforcement — PATCH /agents/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects update from a wallet that does not own the agent", async () => {
    const app = buildApp();
    vi.mocked(query).mockResolvedValueOnce({ rows: [AGENT], rowCount: 1 } as any); // getAgent lookup

    const res = await app.inject({
      method: "PATCH",
      url: "/agents/agt-001",
      headers: { "x-wallet-address": "0xAttackerWallet1234" },
      payload: { spending_limit: 999999 },
    });

    expect(res.statusCode).toBe(403);
  });

  it("allows update from the agent's actual owner", async () => {
    const app = buildApp();
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [AGENT], rowCount: 1 } as any) // getAgent lookup
      .mockResolvedValueOnce({ rows: [{ ...AGENT, spending_limit: 200 }], rowCount: 1 } as any); // UPDATE

    const res = await app.inject({
      method: "PATCH",
      url: "/agents/agt-001",
      headers: { "x-wallet-address": "0xOwnerWallet" },
      payload: { spending_limit: 200 },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe("Ownership enforcement — POST /admin/pause-agent/:id", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects pause from an operator who owns a different agent", async () => {
    const app = buildApp();
    mockOperatorCheck(true); // wallet owns *some* agent
    vi.mocked(query).mockResolvedValueOnce({ rows: [AGENT], rowCount: 1 } as any); // getAgent(id) — different owner

    const res = await app.inject({
      method: "POST",
      url: "/admin/pause-agent/agt-001",
      headers: { "x-wallet-address": "0xOtherOperatorWallet" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("allows pause from the agent's own owner", async () => {
    const app = buildApp();
    mockOperatorCheck(true);
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [AGENT], rowCount: 1 } as any) // getAgent(id)
      .mockResolvedValueOnce({ rows: [{ ...AGENT, status: "paused" }], rowCount: 1 } as any) // updateAgent UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // auditLog insert

    const res = await app.inject({
      method: "POST",
      url: "/admin/pause-agent/agt-001",
      headers: { "x-wallet-address": "0xOwnerWallet" },
    });

    expect(res.statusCode).toBe(200);
  });

  it("rejects with 401 when no wallet header is present", async () => {
    const app = buildApp();
    const res = await app.inject({ method: "POST", url: "/admin/pause-agent/agt-001" });
    expect(res.statusCode).toBe(401);
  });
});

describe("Ownership enforcement — POST /admin/override-settlement", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects override from a wallet not party to the escrow", async () => {
    const app = buildApp();
    mockOperatorCheck(true);
    vi.mocked(query).mockResolvedValueOnce({ rows: [ESCROW], rowCount: 1 } as any); // getEscrowById

    const res = await app.inject({
      method: "POST",
      url: "/admin/override-settlement",
      headers: { "x-wallet-address": "0xRandomThirdParty12" },
      payload: { escrow_id: "esc-001", new_status: "released" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("allows override from the escrow's payer", async () => {
    const app = buildApp();
    mockOperatorCheck(true);
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [ESCROW], rowCount: 1 } as any) // getEscrowById
      .mockResolvedValueOnce({ rows: [{ ...ESCROW, status: "released" }], rowCount: 1 } as any) // overrideSettlement UPDATE
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // audit_logs insert

    const res = await app.inject({
      method: "POST",
      url: "/admin/override-settlement",
      headers: { "x-wallet-address": "0xPayerWallet" },
      payload: { escrow_id: "esc-001", new_status: "released" },
    });

    expect(res.statusCode).toBe(200);
  });
});

describe("Ownership enforcement — POST /admin/dispute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects dispute from a wallet not party to any escrow on the intent", async () => {
    const app = buildApp();
    mockOperatorCheck(true);
    vi.mocked(query).mockResolvedValueOnce({ rows: [ESCROW], rowCount: 1 } as any); // candidates lookup

    const res = await app.inject({
      method: "POST",
      url: "/admin/dispute",
      headers: { "x-wallet-address": "0xRandomThirdParty12" },
      payload: { intent_id: "int-001", reason: "bad output" },
    });

    expect(res.statusCode).toBe(403);
  });

  it("allows dispute from the escrow's payee", async () => {
    const app = buildApp();
    mockOperatorCheck(true);
    vi.mocked(query)
      .mockResolvedValueOnce({ rows: [ESCROW], rowCount: 1 } as any) // candidates lookup
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as any) // UPDATE escrows status=disputed
      .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any); // audit_logs insert

    const res = await app.inject({
      method: "POST",
      url: "/admin/dispute",
      headers: { "x-wallet-address": "0xPayeeWallet" },
      payload: { intent_id: "int-001", reason: "bad output" },
    });

    expect(res.statusCode).toBe(200);
  });
});
