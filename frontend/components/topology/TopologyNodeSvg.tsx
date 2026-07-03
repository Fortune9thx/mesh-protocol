import type { TopologyNode } from "@/lib/types";

export function TopologyNodeSvg({
  node,
  selected,
  onClick,
}: {
  node: TopologyNode;
  selected: boolean;
  onClick: () => void;
}) {
  const fill = node.tier === "orchestrator" ? "#151515" : "#101010";
  const stroke = selected ? "#ececea" : node.tier === "orchestrator" ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.3)";
  const strokeWidth = selected ? 1.8 : node.tier === "orchestrator" ? 1.6 : 1.1;
  const pad = 6;

  return (
    <g onClick={onClick} style={{ cursor: "pointer" }}>
      <rect x={node.x} y={node.y} width={node.size} height={node.size} fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
      {selected && (
        <rect
          x={node.x - pad}
          y={node.y - pad}
          width={node.size + pad * 2}
          height={node.size + pad * 2}
          fill="none"
          stroke="oklch(78% 0.07 245)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
      )}
      <text
        x={node.x + 10}
        y={node.y + node.size + 16}
        fill="#c9c9c5"
        fontFamily="var(--font-mono), monospace"
        fontSize={node.tier === "orchestrator" ? 11 : 10}
        letterSpacing="0.04em"
      >
        {node.label}
      </text>
      <text x={node.x + 10} y={node.y + node.size + 28} fill="#6f6f6b" fontFamily="var(--font-mono), monospace" fontSize={9}>
        {node.sub}
      </text>
    </g>
  );
}
