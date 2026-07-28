import { describe, it, expect } from "vitest";
import { AlphaResearchAgent } from "../../src/runtime/agents/AlphaResearch.js";
import { WalletIntelAgent } from "../../src/runtime/agents/WalletIntel.js";
import { RiskLensAgent } from "../../src/runtime/agents/RiskLens.js";
import { CopyForgeAgent } from "../../src/runtime/agents/CopyForge.js";
import { listRuntimes, getRuntime } from "../../src/runtime/index.js";

const baseTask = {
  intent_id: "int-001",
  title: "Find 3 AI tokens",
  description: "Identify AI tokens worth monitoring",
  requirements: ["market_intelligence"],
  budget: 100,
  deadline: new Date(Date.now() + 86400000),
};

describe("AlphaResearchAgent", () => {
  const agent = new AlphaResearchAgent();

  it("has correct capabilities", () => {
    expect(agent.capabilities).toContain("market_intelligence");
    expect(agent.capabilities).toContain("token_analysis");
  });

  it("executes and returns content", async () => {
    const output = await agent.execute(baseTask);
    expect(output.content).toBeTruthy();
    expect(output.confidence).toBeGreaterThan(0);
    expect(output.confidence).toBeLessThanOrEqual(100);
    expect(output.metadata.agent).toBe("AlphaResearch");
  });

  it("negotiates within budget", async () => {
    const price = await agent.negotiate(50, 100);
    expect(price).toBeGreaterThan(0);
    expect(price).toBeLessThanOrEqual(100);
  });
});

describe("RiskLensAgent", () => {
  it("produces risk scores in output", async () => {
    const agent = new RiskLensAgent();
    const output = await agent.execute(baseTask);
    expect(output.content).toContain("Risk");
    expect(output.confidence).toBeGreaterThan(50);
  });
});

describe("CopyForgeAgent", () => {
  it("synthesizes output", async () => {
    const agent = new CopyForgeAgent();
    const output = await agent.execute(baseTask);
    expect(output.content.length).toBeGreaterThan(100);
    expect(output.metadata.report_type).toBe("synthesis");
  });
});

describe("runtime registry", () => {
  it("lists all 4 agents", () => {
    const runtimes = listRuntimes();
    expect(runtimes.length).toBe(4);
  });

  it("can look up by name", () => {
    const rt = getRuntime("AlphaResearch");
    expect(rt).toBeDefined();
    expect(rt?.name).toBe("AlphaResearch");
  });

  it("returns undefined for unknown agent", () => {
    expect(getRuntime("DoesNotExist")).toBeUndefined();
  });
});
