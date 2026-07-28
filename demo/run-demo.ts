/**
 * Mesh Protocol — End-to-End Demo
 *
 * Scenario: AlphaFund asks "Find 3 AI tokens worth monitoring this week."
 *
 * Flow:
 *   1. Seed demo agents into registry
 *   2. AlphaFund submits intent
 *   3. Mesh matches providers
 *   4. Providers negotiate
 *   5. Agents execute tasks
 *   6. Deliverables returned
 *   7. Mesh verifies
 *   8. Escrow settles
 *   9. Reputation updates
 */

import "dotenv/config";
import { registerAgent } from "../backend/src/services/agents.js";
import { submitIntent } from "../backend/src/services/intents.js";
import { matchIntent } from "../backend/src/services/matching.js";
import {
  startNegotiation,
  counterOffer,
  acceptNegotiation,
  resolveCompromise,
} from "../backend/src/services/negotiation.js";
import { lockEscrow, settleEscrow } from "../backend/src/services/settlement.js";
import { verifyDeliverable } from "../backend/src/services/verification.js";
import { query, closePool } from "../backend/src/db/schema.js";
import { listRuntimes, getRuntime } from "../backend/src/runtime/index.js";
import type { Intent, Agent, Negotiation } from "../backend/src/types/index.js";

const SEPARATOR = "─".repeat(60);
const step = (n: number, label: string) =>
  console.log(`\n${SEPARATOR}\n  STEP ${n}: ${label}\n${SEPARATOR}`);

async function seedAgents(): Promise<Agent[]> {
  const runtimes = listRuntimes();
  const agents: Agent[] = [];

  for (const rt of runtimes) {
    const existing = await query(
      "SELECT * FROM agents WHERE name = $1 LIMIT 1",
      [rt.name]
    );
    if (existing.rows.length > 0) {
      agents.push(existing.rows[0] as Agent);
      continue;
    }

    const agent = await registerAgent({
      name: rt.name,
      owner_wallet: `0xDEMO_${rt.id.toUpperCase().replace(/-/g, "_")}`,
      category: rt.category,
      capabilities: rt.capabilities,
      pricing_model: "per_task",
      base_price: rt.basePrice,
      availability: true,
      endpoint_url: undefined,
      autonomy_level: 2,
      spending_limit: 500,
    });
    agents.push(agent);
  }

  return agents;
}

async function runDemo() {
  console.log("\n🕸️  MESH PROTOCOL — DEMO RUN");
  console.log("   Coordination layer for the autonomous agent economy\n");

  // ── STEP 1: Register demo agents ──────────────────────────────
  step(1, "Seeding Agent Registry");
  const agents = await seedAgents();
  for (const a of agents) {
    console.log(`  ✓ ${a.name} (${a.category}) — ${a.agent_id.slice(0, 8)}...`);
  }

  // ── STEP 2: Submit intent ──────────────────────────────────────
  step(2, "AlphaFund Submits Intent");
  const deadline = new Date(Date.now() + 86_400_000); // 24h from now
  const intent = await submitIntent({
    requester: "0xAlphaFund_Operator",
    title: "Find 3 AI tokens worth monitoring this week",
    description:
      "Identify 3 AI-sector tokens with strong signals this week. Include market intelligence, wallet activity analysis, and risk scoring. Produce a synthesized report.",
    requirements: ["market_intelligence", "wallet_analysis", "risk_scoring", "report_generation"],
    budget: 150,
    deadline,
    priority: "high",
  });
  console.log(`  Intent ID : ${intent.intent_id}`);
  console.log(`  Budget    : ${intent.budget} GEN`);
  console.log(`  Priority  : ${intent.priority}`);

  // ── STEP 3: Match providers ────────────────────────────────────
  step(3, "Mesh Matches Providers");
  const matches = await matchIntent(intent, undefined, 4);
  for (const m of matches) {
    const agent = agents.find((a) => a.agent_id === m.agent_id);
    console.log(
      `  #${m.rank} ${agent?.name ?? m.agent_id.slice(0, 8)} — score: ${m.score.toFixed(1)} (cap: ${m.capability_score.toFixed(0)}, rep: ${m.reputation_score.toFixed(0)}, cost: ${m.cost_score.toFixed(0)})`
    );
  }

  // ── STEP 4: Negotiate with top provider ───────────────────────
  step(4, "Autonomous Negotiation");
  const topMatch = matches[0];
  const topAgent = agents.find((a) => a.agent_id === topMatch.agent_id)!;
  const requesterAgent = agents[0]; // AlphaResearch acts as coordinator

  // Lock escrow first
  const escrow = await lockEscrow(
    intent.intent_id,
    "0xAlphaFund_Operator",
    topAgent.owner_wallet,
    intent.budget
  );
  console.log(`  Escrow locked: ${escrow.amount} GEN (ID: ${escrow.escrow_id.slice(0, 8)}...)`);

  const negotiation = await startNegotiation({
    intent_id: intent.intent_id,
    requester_agent: requesterAgent.agent_id,
    provider_agent: topAgent.agent_id,
    proposed_price: intent.budget * 0.8, // requester offers 80% of budget
    deadline,
    quality_threshold: 80,
    confidence_guarantee: 75,
  });
  console.log(`  Requester proposes: ${negotiation.proposed_price} GEN`);

  // Provider counters at base price
  const runtime = getRuntime(topAgent.name)!;
  const counterPrice = await runtime.negotiate(negotiation.proposed_price, intent.budget);
  console.log(`  Provider counters : ${counterPrice} GEN`);

  await counterOffer(negotiation.negotiation_id, counterPrice);

  // Resolve compromise
  const { price: agreedPrice, acceptable } = resolveCompromise(
    negotiation.proposed_price,
    counterPrice,
    intent.budget
  );
  console.log(`  Midpoint          : ${agreedPrice.toFixed(2)} GEN — acceptable: ${acceptable}`);

  const accepted = await acceptNegotiation(negotiation.negotiation_id);
  console.log(`  ✓ Negotiation ACCEPTED at ${agreedPrice.toFixed(2)} GEN`);

  // ── STEP 5 + 6: Agents execute and return deliverables ────────
  step(5, "Agents Execute Tasks & Return Deliverables");
  const deliverables: Array<{ agentName: string; output: string; confidence: number; dbId: string }> = [];

  for (const agent of agents) {
    const rt = getRuntime(agent.name);
    if (!rt) continue;

    process.stdout.write(`  Running ${agent.name}...`);
    const output = await rt.execute({
      intent_id: intent.intent_id,
      title: intent.title,
      description: intent.description,
      requirements: intent.requirements as string[],
      budget: Number(intent.budget),
      deadline: intent.deadline,
      negotiation: accepted ?? negotiation,
    });

    const { rows } = await query(
      `INSERT INTO deliverables (deliverable_id, intent_id, provider_id, content, metadata)
       VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING deliverable_id`,
      [intent.intent_id, agent.agent_id, output.content, JSON.stringify(output.metadata)]
    );
    deliverables.push({
      agentName: agent.name,
      output: output.content,
      confidence: output.confidence,
      dbId: rows[0].deliverable_id,
    });
    console.log(` ✓ (confidence: ${output.confidence}%)`);
  }

  // ── STEP 7: Verify final deliverable ──────────────────────────
  step(7, "GenLayer Verifies Deliverable");
  const finalDeliverable = deliverables[deliverables.length - 1]; // CopyForge synthesis
  console.log(`  Verifying: ${finalDeliverable.agentName} output...`);

  const { rows: drows } = await query(
    "SELECT * FROM deliverables WHERE deliverable_id = $1",
    [finalDeliverable.dbId]
  );

  const verification = await verifyDeliverable(
    drows[0],
    intent,
    accepted ?? negotiation
  );
  console.log(`  Result        : ${verification.result}`);
  console.log(`  Completeness  : ${verification.completeness}`);
  console.log(`  Relevance     : ${verification.relevance}`);
  console.log(`  Usefulness    : ${verification.usefulness}`);
  console.log(`  Confidence    : ${verification.confidence}`);

  // ── STEP 8: Settle escrow ─────────────────────────────────────
  step(8, "Escrow Settles");
  const settled = await settleEscrow(intent.intent_id, verification, topAgent.agent_id);
  console.log(`  Escrow status : ${settled.status.toUpperCase()}`);
  if (settled.status === "released") {
    console.log(`  ✓ ${settled.amount} GEN released to ${topAgent.name}`);
  } else if (settled.status === "refunded") {
    console.log(`  ↩ ${settled.amount} GEN refunded to requester`);
  } else {
    console.log(`  ⚠ Escrow disputed — human arbitration required`);
  }

  // ── STEP 9: Print final report ────────────────────────────────
  step(9, "Demo Complete — Final Report");
  console.log(`\n${finalDeliverable.output}\n`);

  console.log("\n" + SEPARATOR);
  console.log("  Mesh Protocol demo complete.");
  console.log("  Intelligence coordinated. Capital settled. Reputation updated.");
  console.log(SEPARATOR + "\n");
}

runDemo()
  .catch((err) => {
    console.error("\nDemo failed:", err);
    process.exit(1);
  })
  .finally(() => closePool());
