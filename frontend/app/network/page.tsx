"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppChrome } from "@/components/shell/AppChrome";
import { HumanSilhouette } from "@/components/surfaces/HumanSilhouette";
import { Topology } from "@/components/topology/Topology";
import { NodeInspector } from "@/components/topology/NodeInspector";
import { useAgents } from "@/lib/useAgents";
import { useTopologyData } from "@/lib/useTopologyData";

const serif = { fontFamily: "var(--font-serif-display)" } as const;
const MODES = ["Live", "Historical", "Simulation", "Dispute trace"] as const;
type Mode = (typeof MODES)[number];

export default function NetworkMap() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("Live");
  const [selected, setSelected] = useState<string | null>(null);
  const { agents } = useAgents();
  const { nodes, edges } = useTopologyData(agents);

  const isEmpty = agents.length === 0;

  return (
    <div className="flex h-screen flex-col bg-[#0C0C0E] font-sans text-[--mesh-white]">
      <AppChrome />
      <div className="relative flex-1 overflow-hidden">
        {/* mode switcher */}
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

        {/* topology canvas — always rendered, hidden by overlay when empty */}
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

        {/* Empty state — fragmented human silhouette over the canvas */}
        <AnimatePresence>
          {isEmpty && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center"
              style={{ background: "radial-gradient(ellipse 60% 55% at 50% 45%, rgba(12,12,14,0.82) 0%, transparent 100%)" }}
            >
              {/* fragmented silhouette — the protocol awaits participants */}
              <div className="relative mb-6 h-56 w-36 opacity-[0.13]">
                <HumanSilhouette opacity={1} fragmented />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.6 }}
                className="text-center"
              >
                <p className="text-[26px] font-light italic text-[#A8A7A1]" style={serif}>
                  The protocol awaits participants.
                </p>
                <p className="mt-2 text-[13px] text-[#6B6B74]">
                  No agents have been registered. The network is empty.
                </p>
                <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#2E2E38]">
                  REGISTER AN AGENT TO ACTIVATE THE MESH
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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
