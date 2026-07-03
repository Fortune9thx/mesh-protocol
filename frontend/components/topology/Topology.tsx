"use client";

import { useMemo } from "react";
import type { TopologyEdge, TopologyNode } from "@/lib/types";
import { activePulsePairs, baseNodes, buildEdges, joiningNode } from "@/lib/mockData";
import { TopologyNodeSvg } from "./TopologyNodeSvg";
import { TopologyEdgeSvg } from "./TopologyEdgeSvg";

interface TopologyProps {
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
  simJoined: boolean;
  simDispute: boolean;
  settlePulse: { fromId: string; toId: string; key: number } | null;
  // Real backend-derived nodes/edges. When omitted or empty, falls back to
  // the reference mock topology so the surface still demos meaningfully
  // before any agents/negotiations/escrows exist.
  realNodes?: TopologyNode[];
  realEdges?: TopologyEdge[];
}

function center(node: TopologyNode) {
  return { x: node.x + node.size / 2, y: node.y + node.size / 2 };
}

export function Topology({
  selectedNodeId,
  onSelectNode,
  simJoined,
  simDispute,
  settlePulse,
  realNodes,
  realEdges,
}: TopologyProps) {
  const usingRealData = !!realNodes && realNodes.length > 0;

  const nodes = useMemo(() => {
    if (usingRealData) return simJoined ? [...realNodes!, joiningNode] : realNodes!;
    return simJoined ? [...baseNodes, joiningNode] : baseNodes;
  }, [usingRealData, realNodes, simJoined]);

  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const edges = useMemo(() => {
    if (usingRealData) return realEdges ?? [];
    return buildEdges(simJoined, simDispute);
  }, [usingRealData, realEdges, simJoined, simDispute]);

  // Routing pulses are illustrative motion over the *mock* topology only —
  // with real data we don't yet infer which edges represent active in-flight
  // routing, so we skip the decorative pulse animation rather than fake it.
  const pulses = useMemo(() => {
    if (usingRealData) return [];
    return activePulsePairs.map(([a, b], i) => {
      const p1 = center(baseNodes[a]);
      const p2 = center(baseNodes[b]);
      return { path: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, dur: `${2.4 + i * 0.6}s`, key: i };
    });
  }, [usingRealData]);

  const settlePath = useMemo(() => {
    if (!settlePulse) return null;
    const from = nodeMap.get(settlePulse.fromId);
    const to = nodeMap.get(settlePulse.toId);
    if (!from || !to) return null;
    const p1 = center(from);
    const p2 = center(to);
    return { path: `M${p1.x},${p1.y} L${p2.x},${p2.y}`, end: p2 };
  }, [settlePulse, nodeMap]);

  return (
    <svg width="100%" height="100%" viewBox="0 0 1436 936" preserveAspectRatio="xMidYMid meet" className="absolute inset-0">
      {edges.map((edge) => (
        <TopologyEdgeSvg key={edge.id} edge={edge} nodes={nodeMap} />
      ))}

      {pulses.map((p) => (
        <circle key={p.key} r={3} fill="oklch(78% 0.07 245)">
          <animateMotion dur={p.dur} repeatCount="indefinite" path={p.path} />
        </circle>
      ))}

      {settlePath && (
        <g key={settlePulse?.key}>
          <circle r={5.5} fill="oklch(78% 0.07 245)">
            <animateMotion dur="0.9s" repeatCount={1} fill="freeze" path={settlePath.path} />
          </circle>
          <circle cx={settlePath.end.x} cy={settlePath.end.y} r={10} fill="none" stroke="oklch(78% 0.07 245)" strokeWidth={1}>
            <animate attributeName="r" from="6" to="26" dur="0.6s" begin="0.85s" fill="freeze" />
            <animate attributeName="opacity" from="0.9" to="0" dur="0.6s" begin="0.85s" fill="freeze" />
          </circle>
        </g>
      )}

      {nodes.map((node) => (
        <TopologyNodeSvg
          key={node.id}
          node={node}
          selected={selectedNodeId === node.id}
          onClick={() => onSelectNode(selectedNodeId === node.id ? null : node.id)}
        />
      ))}
    </svg>
  );
}

export { center };
