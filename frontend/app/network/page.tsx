"use client";

// Surface 2 — Network Map. The topology, promoted to a fullscreen surface.
// Reuses the existing Topology + NodeInspector components; modes change
// rendering context, layout never moves.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppChrome } from "@/components/shell/AppChrome";
import { Topology } from "@/components/topology/Topology";
import { NodeInspector } from "@/components/topology/NodeInspector";
import { useAgents } from "@/lib/useAgents";
import { useTopologyData } from "@/lib/useTopologyData";

const MODES = ["Live", "Historical", "Simulation", "Dispute trace"] as const;
type Mode = (typeof MODES)[number];

export default function NetworkMap() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("Live");
  const [selected, setSelected] = useState<string | null>(null);
  const { agents } = useAgents();
  const { nodes, edges } = useTopologyData(agents);

  return (
    <div className="flex h-screen flex-col bg-[#0C0C0E] font-sans text-[--mesh-white]">
      <AppChrome />
      <div className="relative flex-1 overflow-hidden">
        {/* mode switcher — the only fixed chrome on the canvas */}
        <div className="absolute left-7 top-5 z-10 flex gap-1 rounded-lg border border-[#212127] bg-[#131316] p-1">
          {MODES.map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`rounded-md px-3.5 py-1.5 text-[12px] font-medium transition-colors ${
                mode === m ? "bg-[#18181C] text-[--mesh-white]" : "text-[#6B6B74] hover:text-[#A8A7A1]"
              }`}>
              {m}
            </button>
          ))}
        </div>

        {/* the topology — full canvas */}
        <div className="h-full w-full">
          <Topology
            selectedNodeId={selected}
            onSelectNode={setSelected}
            simJoined={mode === "Simulation"}
            simDispute={mode === "Dispute trace"}
            settlePulse={null}
            realNodes={nodes}
            realEdges={edges}
          />
        </div>

        {/* contextual inspector — appears only on selection */}
        {(() => {
          const node = nodes.find((n) => n.id === selected);
          return node ? (
            <NodeInspector
              node={node}
              onClose={() => setSelected(null)}
              onInspectInWorkbench={() => router.push(`/agents?id=${encodeURIComponent(node.id)}`)}
            />
          ) : null;
        })()}

        <div className="absolute bottom-5 right-7 z-10 flex gap-4 text-[11px] text-[#6B6B74]">
          <span><i className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[--mesh-blue]" />Active negotiation</span>
          <span><i className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[--mesh-red]" />Dispute</span>
          <span><i className="mr-1.5 inline-block h-[7px] w-[7px] rounded-full bg-[rgba(250,250,247,0.4)]" />Idle</span>
        </div>
      </div>
    </div>
  );
}
