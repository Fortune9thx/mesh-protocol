import type { TopologyEdge, TopologyNode } from "@/lib/types";

const edgeStyle: Record<TopologyEdge["state"], { stroke: string; width: number; dash: string; animation?: string }> = {
  active: { stroke: "rgba(255,255,255,0.32)", width: 1.2, dash: "0" },
  negotiating: { stroke: "rgba(255,255,255,0.4)", width: 1.2, dash: "5 5", animation: "dashFlow 1.4s linear infinite" },
  dispute: { stroke: "oklch(55% 0.1 30)", width: 1.4, dash: "3 4", animation: "fractureJitter 0.5s steps(4) infinite" },
  collapsed: { stroke: "rgba(255,255,255,0.14)", width: 1, dash: "2 6" },
};

function center(node: TopologyNode) {
  return { x: node.x + node.size / 2, y: node.y + node.size / 2 };
}

export function TopologyEdgeSvg({ edge, nodes }: { edge: TopologyEdge; nodes: Map<string, TopologyNode> }) {
  const from = nodes.get(edge.fromId);
  const to = nodes.get(edge.toId);
  if (!from || !to) return null;
  const p1 = center(from);
  const p2 = center(to);
  const style = edgeStyle[edge.state];

  return (
    <line
      x1={p1.x}
      y1={p1.y}
      x2={p2.x}
      y2={p2.y}
      stroke={style.stroke}
      strokeWidth={style.width}
      strokeDasharray={style.dash}
      style={style.animation ? { animation: style.animation } : undefined}
    />
  );
}
