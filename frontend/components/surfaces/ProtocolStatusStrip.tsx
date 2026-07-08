"use client";

import { useMemo } from "react";
import { useAgents } from "@/lib/useAgents";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useLiveEvents } from "@/lib/useLiveEvents";

export function ProtocolStatusStrip() {
  const { agents } = useAgents();
  const { escrows: disputes } = useDisputedEscrows();
  const { events } = useLiveEvents();

  const active = agents.filter((a) => a.status === "active").length;
  const hasDisputes = disputes.length > 0;

  const lastSettlement = useMemo(() => {
    const settle = events.find((e) => e.kind === "settlement");
    if (!settle) return null;
    return settle.time;
  }, [events]);

  return (
    <div className="flex items-center gap-6 border-b border-[#212127] bg-[#0C0C0E] px-7 py-2">
      <div className="flex items-center gap-2">
        <span
          className={`h-[6px] w-[6px] rounded-full ${hasDisputes ? "bg-[--mesh-red]" : "bg-emerald-500"} animate-pulse`}
        />
        <span className="font-mono text-[10px] tracking-[0.12em] text-[#6B6B74]">
          {hasDisputes ? "INTERVENTION REQUIRED" : "OPERATIONAL"}
        </span>
      </div>

      <div className="h-3 w-px bg-[#212127]" />

      <span className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B74]">
        <span className="text-[#A8A7A1]">{active}</span> ACTIVE AGENT{active !== 1 ? "S" : ""}
      </span>

      <div className="h-3 w-px bg-[#212127]" />

      <span className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B74]">
        <span className={disputes.length > 0 ? "text-[--mesh-red]" : "text-[#A8A7A1]"}>
          {disputes.length}
        </span>{" "}
        DISPUTE{disputes.length !== 1 ? "S" : ""}
      </span>

      <div className="h-3 w-px bg-[#212127]" />

      <span className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B74]">
        <span className="text-[#A8A7A1]">{agents.length}</span> REGISTERED
      </span>

      {lastSettlement && (
        <>
          <div className="h-3 w-px bg-[#212127]" />
          <span className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B74]">
            LAST SETTLEMENT <span className="text-[#A8A7A1]">{lastSettlement}</span>
          </span>
        </>
      )}

      <div className="ml-auto font-mono text-[10px] tracking-[0.1em] text-[#2E2E38]">
        BRADBURY TESTNET · CHAIN 4221
      </div>
    </div>
  );
}
