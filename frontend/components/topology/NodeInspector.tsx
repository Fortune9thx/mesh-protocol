import type { TopologyNode } from "@/lib/types";
import { Button } from "@/components/primitives/Button";

const statusColors: Record<TopologyNode["status"], string> = {
  active: "#9a9a96",
  dispute: "oklch(65% 0.1 30)",
  capped: "oklch(78% 0.07 245)",
};

const accentColor = (t: number) => (t < 70 ? "oklch(55% 0.1 30)" : t < 90 ? "rgba(255,255,255,0.55)" : "oklch(78% 0.07 245)");

export function NodeInspector({
  node,
  onClose,
  onInspectInWorkbench,
}: {
  node: TopologyNode;
  onClose: () => void;
  onInspectInWorkbench: () => void;
}) {
  const metrics = [
    { label: "TRUST", value: `${node.trust}/100`, pct: node.trust, color: accentColor(node.trust) },
    {
      label: "LOAD",
      value: `${node.load}%`,
      pct: Math.min(node.load, 100),
      color: node.load >= 100 ? "oklch(78% 0.07 245)" : "rgba(255,255,255,0.45)",
    },
    { label: "CONFIDENCE", value: (node.confidence / 100).toFixed(2), pct: node.confidence, color: "oklch(78% 0.07 245)" },
  ];

  return (
    <div className="absolute top-6 right-8 w-64 bg-graphite border border-white/16 z-10">
      <div className="flex justify-between items-center px-3.5 py-3 border-b border-white/8">
        <div className="font-mono text-[9px] tracking-[0.14em] uppercase" style={{ color: statusColors[node.status] }}>
          {node.status.toUpperCase()}
        </div>
        <button onClick={onClose} className="font-mono text-[11px] text-[#5f5f5b] hover:text-bone px-1.5 py-0.5 cursor-pointer">
          ✕
        </button>
      </div>
      <div className="p-3.5">
        <div className="text-[15px] font-extrabold tracking-[-0.01em] mb-0.5">{node.label}</div>
        <div className="font-mono text-[9px] text-[#5f5f5b] mb-3.5">{node.sub}</div>
        <div className="flex flex-col gap-2.5">
          {metrics.map((m) => (
            <div key={m.label}>
              <div className="flex justify-between font-mono text-[9px] tracking-[0.08em] uppercase text-[#8a8a86] mb-[5px]">
                <span>{m.label}</span>
                <span style={{ color: m.color }}>{m.value}</span>
              </div>
              <div className="h-1 bg-white/8">
                <div className="h-1" style={{ background: m.color, width: `${m.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-white/8 mt-2.5 pt-3 font-mono text-[9px] text-[#5f5f5b] leading-[2]">
          <div>CONTRACTS &nbsp;{node.contracts}</div>
          <div>MESH ID &nbsp;&nbsp;&nbsp;{node.meshId}</div>
        </div>
        <Button variant="secondary" className="mt-3 w-full text-center text-[9.5px]" onClick={onInspectInWorkbench}>
          INSPECT IN WORKBENCH →
        </Button>
      </div>
    </div>
  );
}
