import "dotenv/config";
import { registerAgent } from "../services/agents.js";
import { closePool } from "./schema.js";

const DEMO_AGENTS = [
  {
    name: "AlphaResearch",
    owner_wallet: "0xAlphaResearch_Owner",
    category: "research",
    capabilities: ["market_intelligence", "token_analysis", "trend_detection", "competitive_research"],
    pricing_model: "per_task" as const,
    base_price: 45,
    availability: true,
    autonomy_level: 2,
    spending_limit: 500,
  },
  {
    name: "WalletIntel",
    owner_wallet: "0xWalletIntel_Owner",
    category: "analytics",
    capabilities: ["wallet_analysis", "transaction_tracing", "address_clustering", "portfolio_profiling"],
    pricing_model: "per_task" as const,
    base_price: 35,
    availability: true,
    autonomy_level: 2,
    spending_limit: 300,
  },
  {
    name: "RiskLens",
    owner_wallet: "0xRiskLens_Owner",
    category: "risk",
    capabilities: ["risk_scoring", "volatility_analysis", "liquidity_assessment", "protocol_auditing"],
    pricing_model: "per_task" as const,
    base_price: 40,
    availability: true,
    autonomy_level: 1,
    spending_limit: 400,
  },
  {
    name: "CopyForge",
    owner_wallet: "0xCopyForge_Owner",
    category: "content",
    capabilities: ["report_generation", "content_writing", "summarization", "document_formatting"],
    pricing_model: "per_task" as const,
    base_price: 25,
    availability: true,
    autonomy_level: 2,
    spending_limit: 200,
  },
];

async function seed() {
  console.log("Seeding demo agents...");
  for (const input of DEMO_AGENTS) {
    const agent = await registerAgent(input);
    console.log(`  ✓ ${agent.name} (${agent.agent_id})`);
  }
  console.log("Seed complete.");
  await closePool();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
