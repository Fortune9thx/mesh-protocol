"use client";

import { useEffect, useState } from "react";
import { getEscrows, getNegotiations } from "./api";
import type { Agent, EdgeState, Escrow, Negotiation, TopologyEdge, TopologyNode } from "./types";

// Simple circular layout — the backend has no concept of node position.
// Real force-directed layout (d3-force) is a documented follow-up per the
// design handoff's own recommendation, not required for this data-wiring pass.
function layoutNodes(agents: Agent[]): TopologyNode[] {
  const cx = 700;
  const cy = 460;
  const radius = Math.min(360, 140 + agents.length * 18);
  const medianLimit = [...agents].map((a) => a.spending_limit).sort((a, b) => a - b)[Math.floor(agents.length / 2)] ?? 0;

  return agents.map((agent, i) => {
    const angle = (i / Math.max(agents.length, 1)) * Math.PI * 2 - Math.PI / 2;
    const size = agent.spending_limit >= medianLimit && agents.length > 1 ? 52 : 38;
    const x = Math.round(cx + radius * Math.cos(angle) - size / 2);
    const y = Math.round(cy + radius * Math.sin(angle) - size / 2);
    return {
      id: agent.agent_id,
      label: agent.name,
      sub: `${agent.category}`,
      tier: size >= 52 ? "orchestrator" : "sub",
      x,
      y,
      size,
      trust: Math.round(agent.reliability_score),
      load: 0,
      confidence: Math.round(agent.confidence_score),
      contracts: 0,
      meshId: agent.owner_wallet,
      status: agent.status === "paused" ? "capped" : "active",
    };
  });
}

function deriveEdges(agents: Agent[], negotiations: Negotiation[], escrows: Escrow[]): TopologyEdge[] {
  const walletToAgentId = new Map(agents.map((a) => [a.owner_wallet, a.agent_id]));
  const edges: TopologyEdge[] = [];
  const seen = new Set<string>();

  const push = (fromId: string | undefined, toId: string | undefined, state: EdgeState, id: string) => {
    if (!fromId || !toId || fromId === toId) return;
    const key = [fromId, toId].sort().join("|");
    if (seen.has(key)) return; // one edge per pair, most-recent-status wins (input order is newest-first)
    seen.add(key);
    edges.push({ id, fromId, toId, state });
  };

  for (const n of negotiations) {
    if (n.status === "pending" || n.status === "counter") {
      push(n.requester_agent, n.provider_agent, "negotiating", `neg-${n.negotiation_id}`);
    } else if (n.status === "rejected" || n.status === "expired") {
      push(n.requester_agent, n.provider_agent, "collapsed", `neg-${n.negotiation_id}`);
    }
  }

  for (const e of escrows) {
    const fromId = walletToAgentId.get(e.payer);
    const toId = walletToAgentId.get(e.payee);
    if (e.status === "disputed") push(fromId, toId, "dispute", `esc-${e.escrow_id}`);
    else if (e.status === "locked" || e.status === "released") push(fromId, toId, "active", `esc-${e.escrow_id}`);
  }

  return edges;
}

export function useTopologyData(agents: Agent[]) {
  const [edges, setEdges] = useState<TopologyEdge[]>([]);

  useEffect(() => {
    if (agents.length === 0) {
      setEdges([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const [negotiations, escrows] = await Promise.all([getNegotiations(), getEscrows()]);
      if (cancelled) return;
      setEdges(deriveEdges(agents, negotiations ?? [], escrows ?? []));
    })();
    return () => {
      cancelled = true;
    };
  }, [agents]);

  const nodes = agents.length > 0 ? layoutNodes(agents) : [];
  return { nodes, edges };
}
