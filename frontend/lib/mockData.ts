import type { TopologyNode, TopologyEdge, StreamEvent } from "./types";

// TODO: wire to GET /agents + derived negotiations/escrows for real topology.
// Mock topology data recreated from Mesh Protocol Overview.dc.html renderVals().
// Node tuple: [x, y, size, label, sub, tier, trust, load, confidence, contracts, meshId, status]
const nodeTuples: [number, number, number, string, string, TopologyNode["tier"], number, number, number, number, string, TopologyNode["status"]][] = [
  [120, 120, 58, "trading-orch-01", "orchestrator · trading", "orchestrator", 98, 72, 96, 284, "0x7fA3…c92E", "active"],
  [560, 90, 40, "research-agent-03", "sub-agent · research", "sub", 91, 44, 94, 62, "0x51bE…77f0", "active"],
  [760, 210, 40, "research-agent-07", "sub-agent · research", "sub", 88, 31, 90, 48, "0xB3C1…09aF", "active"],
  [420, 300, 58, "risk-orch-02", "orchestrator · risk", "orchestrator", 95, 58, 91, 198, "0xD9A2…e14B", "active"],
  [200, 420, 38, "risk-agent-11", "sub-agent · risk", "sub", 84, 29, 88, 31, "0x4F7c…55d1", "active"],
  [660, 440, 38, "risk-agent-07", "sub-agent · risk", "sub", 61, 42, 71, 77, "0x93fD…a21c", "dispute"],
  [960, 380, 58, "exec-orch-01", "orchestrator · execution", "orchestrator", 97, 100, 95, 341, "0xcc04…19aa", "capped"],
  [1100, 500, 38, "exec-agent-02", "sub-agent · execution", "sub", 79, 55, 82, 53, "0x2E8b…f302", "dispute"],
  [880, 600, 38, "content-agent-04", "sub-agent · content", "sub", 90, 38, 93, 44, "0xA1F0…3c87", "active"],
  [340, 620, 58, "content-orch-01", "orchestrator · content", "orchestrator", 93, 61, 89, 127, "0x6D4e…b2C0", "active"],
  [1180, 200, 38, "research-agent-12", "sub-agent · research", "sub", 86, 18, 91, 7, "0xF2b3…8eD4", "active"],
];

export const baseNodes: TopologyNode[] = nodeTuples.map(
  ([x, y, size, label, sub, tier, trust, load, confidence, contracts, meshId, status]) => ({
    id: label,
    label,
    sub,
    tier,
    x,
    y,
    size,
    trust,
    load,
    confidence,
    contracts,
    meshId,
    status,
  })
);

export const joiningNode: TopologyNode = {
  id: "research-agent-15",
  label: "research-agent-15",
  sub: "sub-agent · joining",
  tier: "sub",
  x: 1230,
  y: 640,
  size: 38,
  trust: 50,
  load: 4,
  confidence: 60,
  contracts: 0,
  meshId: "0x88Aa…41b9",
  status: "active",
};

// Edge defs by node index into baseNodes: [fromIdx, toIdx, state]
const edgeIndexDefs: [number, number, TopologyEdge["state"]][] = [
  [0, 1, "active"],
  [0, 2, "active"],
  [0, 3, "active"],
  [3, 4, "active"],
  [3, 5, "dispute"],
  [3, 6, "negotiating"],
  [6, 7, "dispute"],
  [6, 8, "active"],
  [9, 4, "active"],
  [9, 8, "negotiating"],
  [2, 10, "active"],
  [6, 10, "collapsed"],
];

export function buildEdges(simJoined: boolean, simDispute: boolean): TopologyEdge[] {
  const defs = edgeIndexDefs.map(([a, b, state]): [number, number, TopologyEdge["state"]] => {
    if (a === 6 && b === 8 && simDispute) return [a, b, "dispute"];
    return [a, b, state];
  });
  if (simJoined) defs.push([6, 11, "negotiating"]);
  const nodes = simJoined ? [...baseNodes, joiningNode] : baseNodes;
  return defs.map(([a, b, state], i) => ({
    id: `edge-${i}`,
    fromId: nodes[a].id,
    toId: nodes[b].id,
    state,
  }));
}

export const activePulsePairs: [number, number][] = [
  [0, 1],
  [0, 2],
  [3, 4],
  [6, 8],
  [9, 4],
];

export interface ConsoleAgentRow {
  name: string;
  type: string;
  trust: number;
  spend: string;
  limit: string;
  status: "active" | "dispute" | "capped";
}

export const consoleAgentRows: ConsoleAgentRow[] = [
  { name: "trading-orch-01", type: "ORCHESTRATOR · TRADING", trust: 98, spend: "$18,240", limit: "$50,000", status: "active" },
  { name: "risk-orch-02", type: "ORCHESTRATOR · RISK", trust: 95, spend: "$6,410", limit: "$25,000", status: "active" },
  { name: "exec-orch-01", type: "ORCHESTRATOR · EXECUTION", trust: 97, spend: "$50,000", limit: "$50,000", status: "capped" },
  { name: "research-agent-03", type: "SUB-AGENT · RESEARCH", trust: 91, spend: "$2,400", limit: "$10,000", status: "active" },
  { name: "risk-agent-07", type: "SUB-AGENT · RISK", trust: 61, spend: "$860", limit: "$5,000", status: "dispute" },
  { name: "exec-agent-02", type: "SUB-AGENT · EXECUTION", trust: 79, spend: "$3,120", limit: "$10,000", status: "dispute" },
  { name: "content-agent-04", type: "SUB-AGENT · CONTENT", trust: 90, spend: "$1,150", limit: "$8,000", status: "active" },
];

export const globalLimits = [
  { label: "Per-transaction cap", value: "$5,000" },
  { label: "Daily protocol cap", value: "$100,000" },
  { label: "Max negotiation rounds", value: "6" },
];

export const profileMetrics = [
  { label: "TRUST", value: "61 / 100", barWidth: 61, kind: "low" as const },
  { label: "LOAD", value: "42%", barWidth: 42, kind: "neutral" as const },
  { label: "CONFIDENCE", value: "0.87", barWidth: 87, kind: "positive" as const },
];

export interface TraceStep {
  time: string;
  kind: "OBSERVE" | "PLAN" | "ACT" | "REASON" | "NEGOTIATE" | "DELIVER" | "DISPUTE";
  text: string;
}

export const traceSteps: TraceStep[] = [
  { time: "14:38:02", kind: "OBSERVE", text: "Received risk-scoring request from risk-orch-02 · contract #C-8841" },
  { time: "14:38:04", kind: "PLAN", text: "Decomposed into 3 sub-tasks: data pull, factor model, stress scenarios" },
  { time: "14:38:11", kind: "ACT", text: "Queried market-data-agent-01 · 4,210 rows returned" },
  { time: "14:38:29", kind: "REASON", text: "VaR estimate 4.1% exceeds mandate threshold 3.5% — flagging" },
  { time: "14:38:31", kind: "NEGOTIATE", text: "Proposed scope amendment to risk-orch-02 · +$120 for stress suite" },
  { time: "14:38:40", kind: "DELIVER", text: "Submitted risk report v1.0 · hash 0x93f…a21c" },
  { time: "14:39:55", kind: "DISPUTE", text: "exec-agent-02 rejected verification: scenario coverage below spec" },
];

export const negotiationHistory = [
  { party: "risk-orch-02", terms: "Risk report + stress suite · 3 rounds", amount: "$980", outcome: "AGREED" as const },
  { party: "exec-agent-02", terms: "Verification handoff · coverage ≥ 95%", amount: "—", outcome: "DISPUTED" as const },
  { party: "trading-orch-01", terms: "Prior engagement · VaR daily feed", amount: "$2,100", outcome: "SETTLED" as const },
];

export const evidenceList = [
  { check: "Schema validation", result: "PASS", pass: true },
  { check: "Coverage ≥ 95%", result: "FAIL · 91.2%", pass: false },
  { check: "Signature valid", result: "PASS", pass: true },
  { check: "Latency SLA 60s", result: "PASS · 38s", pass: true },
];

export const settlementProofs = [
  { hash: "0x93fD…a21c", amount: "$2,100", meta: "BLOCK 19,441,208 · 2026-07-01 09:14 UTC" },
  { hash: "0x51bE…77f0", amount: "$860", meta: "BLOCK 19,438,551 · 2026-06-30 18:02 UTC" },
  { hash: "0xcc04…19aa", amount: "$1,450", meta: "BLOCK 19,431,904 · 2026-06-29 11:47 UTC" },
];

export const overviewAlerts = [
  { id: "alert-1", title: "Dispute: risk-agent-07 vs exec-agent-02", detail: "Escrow $12,400 held pending review", action: "REVIEW" },
  { id: "alert-2", title: "Spending limit reached — exec-orch-01", detail: "Daily cap $50,000 hit at 14:22 UTC", action: "RAISE LIMIT" },
];

export const activeNegotiations = [
  { pair: "trading-orch-01 → research-agent-03", amount: "$2,400" },
  { pair: "risk-orch-02 → risk-agent-07", amount: "$860" },
  { pair: "content-orch-01 → content-agent-04", amount: "$1,150" },
];

export const baseEvents: StreamEvent[] = [
  { id: "e1", time: "14:41:02", text: "Settlement finalized: exec-orch-01 → content-agent-04", kind: "settlement" },
  { id: "e2", time: "14:40:47", text: "Negotiation opened: risk-orch-02 ↔ risk-agent-07", kind: "info" },
  { id: "e3", time: "14:40:19", text: "Verification passed: research-agent-03 deliverable", kind: "settlement" },
  { id: "e4", time: "14:39:55", text: "Dispute flagged: risk-agent-07 ↔ exec-agent-02", kind: "dispute" },
  { id: "e5", time: "14:39:12", text: "Agent joined mesh: research-agent-12", kind: "info" },
  { id: "e6", time: "14:38:44", text: "Settlement finalized: trading-orch-01 → research-agent-03", kind: "settlement" },
  { id: "e7", time: "14:38:01", text: "Permission updated: exec-orch-01 spending cap", kind: "info" },
  { id: "e8", time: "14:37:30", text: "Routing complete: content-orch-01 → content-agent-04", kind: "info" },
];

export const tickerBase = [
  "SETTLEMENT $2,400 · trading-orch-01 → research-agent-03",
  "AGENT JOINED · research-agent-12",
  "VERIFICATION PASSED · content-agent-04",
  "DISPUTE OPENED · risk-agent-07 ↔ exec-agent-02",
  "SETTLEMENT $860 · risk-orch-02 → risk-agent-07",
  "ROUTING COMPLETE · exec-orch-01 → content-agent-04",
  "NEGOTIATION STARTED · trading-orch-01 ↔ research-agent-07",
  "PERMISSION UPDATED · exec-orch-01 spending cap raised",
];
