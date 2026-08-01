"use client";

import { useEffect, useMemo, useState } from "react";
import { useAgents } from "@/lib/useAgents";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { fetchPaused } from "@/lib/contracts";

function PauseBanner() {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    let mounted = true;
    const check = () => fetchPaused().then((p) => { if (mounted) setPaused(p); });
    check();
    const id = setInterval(check, 20_000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  if (!paused) return null;
  return (
    <div role="alert" className="flex items-center gap-2.5 border-b border-[oklch(45%_0.1_75)] bg-[oklch(22%_0.05_75)] px-7 py-2">
      <span className="h-[6px] w-[6px] shrink-0 rounded-full bg-[oklch(78%_0.14_75)]" />
      <span className="font-mono text-[10.5px] tracking-[0.08em] text-[oklch(85%_0.1_75)]">
        PROTOCOL PAUSED — escrow locking, settlement, and disputes are temporarily disabled by the admin. Reads still work.
      </span>
    </div>
  );
}

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
    <>
    <PauseBanner />
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
    </>
  );
}
