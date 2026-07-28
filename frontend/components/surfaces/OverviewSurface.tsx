"use client";

import { useMemo, useState } from "react";
import { Topology } from "@/components/topology/Topology";
import { NodeInspector } from "@/components/topology/NodeInspector";
import { baseNodes, joiningNode, overviewAlerts, activeNegotiations, baseEvents } from "@/lib/mockData";
import { EventStreamRow } from "@/components/primitives/EventStreamRow";
import type { StreamEvent, TopologyEdge, TopologyNode } from "@/lib/types";

interface OverviewSurfaceProps {
  onOpenArbitrate: () => void;
  onGoToConsole: () => void;
  onGoToWorkbench: (nodeId: string) => void;
  liveEvents?: StreamEvent[];
  realNodes?: TopologyNode[];
  realEdges?: TopologyEdge[];
}

const legendItems = [
  { label: "ACTIVE", dash: "solid" as const, color: "#9a9a96" },
  { label: "NEGOTIATING", dash: "dashed" as const, color: "#9a9a96" },
  { label: "DISPUTE", dash: "dashed" as const, color: "oklch(55% 0.1 30)" },
];

let simEventCounter = 0;

export function OverviewSurface({
  onOpenArbitrate,
  onGoToConsole,
  onGoToWorkbench,
  liveEvents = [],
  realNodes,
  realEdges,
}: OverviewSurfaceProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [simJoined, setSimJoined] = useState(false);
  const [simDispute, setSimDispute] = useState(false);
  const [settlePulse, setSettlePulse] = useState<{ fromId: string; toId: string; key: number } | null>(null);
  const [simEvents, setSimEvents] = useState<StreamEvent[]>([]);

  const sourceNodes = realNodes && realNodes.length > 0 ? realNodes : baseNodes;
  const nodes = useMemo(() => (simJoined ? [...sourceNodes, joiningNode] : sourceNodes), [simJoined, sourceNodes]);
  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  const pushEvent = (text: string, kind: StreamEvent["kind"]) => {
    simEventCounter += 1;
    const time = new Date().toISOString().substring(11, 19);
    setSimEvents((prev) => [{ id: `sim-${simEventCounter}`, time, text, kind }, ...prev].slice(0, 6));
  };

  const handleSettlement = () => {
    setSettlePulse(null);
    window.setTimeout(() => {
      setSettlePulse({ fromId: "exec-orch-01", toId: "content-agent-04", key: Date.now() });
      pushEvent("Settlement finalized: exec-orch-01 → content-agent-04 · $1,150", "settlement");
      window.setTimeout(() => setSettlePulse(null), 1800);
    }, 30);
  };

  const handleAgentJoinToggle = () => {
    const joining = !simJoined;
    setSimJoined(joining);
    pushEvent(
      joining ? "Agent joined mesh: research-agent-15 · negotiating first contract" : "Agent left mesh: research-agent-15",
      "info"
    );
  };

  const handleDisputeToggle = () => {
    const disputing = !simDispute;
    setSimDispute(disputing);
    pushEvent(
      disputing
        ? "Dispute flagged: exec-orch-01 ↔ content-agent-04 · escrow frozen"
        : "Dispute resolved: exec-orch-01 ↔ content-agent-04 · escrow released",
      disputing ? "dispute" : "settlement"
    );
  };

  const handleReset = () => {
    setSimJoined(false);
    setSimDispute(false);
    setSettlePulse(null);
    setSimEvents([]);
  };

  const events = [...simEvents, ...(liveEvents.length > 0 ? liveEvents : baseEvents)].slice(0, 8);

  const simButtons = [
    { label: "SETTLEMENT", border: "oklch(55% 0.08 245)", color: "oklch(78% 0.07 245)", onClick: handleSettlement },
    {
      label: simJoined ? "AGENT LEAVES" : "AGENT JOINS",
      border: "rgba(255,255,255,0.2)",
      color: "#c9c9c5",
      onClick: handleAgentJoinToggle,
    },
    {
      label: simDispute ? "HEAL DISPUTE" : "DISPUTE",
      border: "oklch(40% 0.08 30)",
      color: "oklch(65% 0.1 30)",
      onClick: handleDisputeToggle,
    },
    { label: "RESET", border: "rgba(255,255,255,0.1)", color: "#5f5f5b", onClick: handleReset },
  ];

  return (
    <div className="flex-1 flex min-h-0">
      {/* CENTER :: agent protocol plane */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          background:
            "repeating-linear-gradient(0deg, transparent 0 47px, rgba(255,255,255,0.035) 47px 48px), repeating-linear-gradient(90deg, transparent 0 47px, rgba(255,255,255,0.035) 47px 48px), #0a0a0a",
        }}
      >
        <div className="absolute top-6 left-8 z-[2]">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-signal">PLANE 02 — AGENT PROTOCOL</div>
          <div className="text-[22px] font-extrabold tracking-[-0.01em] mt-1.5">Live Topology</div>
        </div>

        <Topology
          selectedNodeId={selectedNodeId}
          onSelectNode={setSelectedNodeId}
          simJoined={simJoined}
          simDispute={simDispute}
          settlePulse={settlePulse}
          realNodes={realNodes}
          realEdges={realEdges}
        />

        {/* simulate controls */}
        <div className="absolute bottom-[22px] right-8 flex items-center gap-2 z-[3]">
          <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[#5f5f5b] mr-1.5">SIMULATE</div>
          {simButtons.map((sb) => (
            <button
              key={sb.label}
              onClick={sb.onClick}
              className="font-mono text-[9.5px] tracking-[0.08em] uppercase px-[13px] py-[7px] border cursor-pointer bg-[rgba(13,13,13,0.85)] hover:bg-white/6 transition-colors duration-150"
              style={{ borderColor: sb.border, color: sb.color }}
            >
              {sb.label}
            </button>
          ))}
        </div>

        {/* legend */}
        <div className="absolute bottom-[22px] left-8 flex gap-[22px] font-mono text-[10px] tracking-[0.05em] text-[#8a8a86] z-[2]">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <div
                className="w-[18px] h-0 border-t-[1.5px]"
                style={{ borderColor: item.color, borderStyle: item.dash === "dashed" ? "dashed" : "solid" }}
              />
              {item.label}
            </div>
          ))}
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5" style={{ background: "oklch(78% 0.07 245)" }} />
            SETTLEMENT PULSE
          </div>
        </div>

        {selectedNode ? (
          <NodeInspector
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onInspectInWorkbench={() => onGoToWorkbench(selectedNode.id)}
          />
        ) : (
          <div className="absolute top-6 right-8 w-60 bg-[rgba(13,13,13,0.85)] border border-white/10 p-3.5 z-[3]">
            <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-[oklch(55%_0.1_30)] mb-2">
              DISPUTE FLAGGED
            </div>
            <div className="text-[13px] font-bold mb-1">risk-agent-07 ↔ exec-agent-02</div>
            <div className="font-mono text-[10px] text-[#8a8a86] leading-[1.6]">Verification failed. Escrow $12,400 held.</div>
            <div className="font-mono text-[9px] text-[#5f5f5b] mt-2">Click any node to inspect →</div>
          </div>
        )}
      </div>

      {/* RIGHT :: human control plane */}
      <div className="w-[420px] flex-none border-l border-white/9 bg-graphite flex flex-col min-h-0">
        <div className="px-6 pt-6 pb-4 border-b border-white/8">
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#8a8a86]">PLANE 01 — HUMAN CONTROL</div>
          <div className="text-[22px] font-extrabold tracking-[-0.01em] mt-1.5">Governance</div>
        </div>

        {/* Alerts */}
        <div className="px-6 pt-5 pb-2">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8a8a86] mb-3">ALERTS REQUIRING ACTION</div>
          {overviewAlerts.map((a) => (
            <div key={a.id} className="border border-white/10 px-3.5 py-3 mb-2 flex justify-between items-center gap-2">
              <div>
                <div className="text-[13px] font-semibold">{a.title}</div>
                <div className="font-mono text-[10px] text-[#8a8a86] mt-[3px]">{a.detail}</div>
              </div>
              <button
                onClick={() => (a.id === "alert-1" ? onOpenArbitrate() : onGoToConsole())}
                className="font-mono text-[10px] tracking-[0.06em] uppercase border border-white/20 px-2.5 py-1.5 whitespace-nowrap cursor-pointer hover:bg-white/6 transition-colors duration-150"
              >
                {a.action}
              </button>
            </div>
          ))}
        </div>

        {/* Active negotiations */}
        <div className="px-6 pt-4 pb-2 border-t border-white/8">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8a8a86] mb-3">ACTIVE NEGOTIATIONS</div>
          {activeNegotiations.map((n) => (
            <div key={n.pair} className="flex justify-between items-center py-[9px] border-b border-white/6 last:border-b-0">
              <div className="text-[12.5px]">{n.pair}</div>
              <div className="font-mono text-[11px] text-[#8a8a86]">{n.amount}</div>
            </div>
          ))}
        </div>

        {/* Event stream */}
        <div className="flex-1 px-6 py-4 border-t border-white/8 overflow-hidden min-h-0">
          <div className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8a8a86] mb-3">EVENT STREAM</div>
          <div className="overflow-y-auto h-full">
            {events.map((e) => (
              <EventStreamRow key={e.id} event={e} />
            ))}
          </div>
        </div>

        {/* Autonomy control */}
        <div className="px-6 py-5 border-t border-white/10 bg-obsidian">
          <div className="flex items-center justify-between px-4 py-3.5 border border-white/16">
            <div>
              <div className="text-[13px] font-bold">Protocol Autonomy</div>
              <div className="font-mono text-[9.5px] text-[#8a8a86] mt-0.5">All agents operating within limits</div>
            </div>
            <button className="font-mono text-[10px] tracking-[0.08em] uppercase px-3.5 py-2 border border-white/22 cursor-pointer hover:bg-white/6 transition-colors duration-150">
              PAUSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
