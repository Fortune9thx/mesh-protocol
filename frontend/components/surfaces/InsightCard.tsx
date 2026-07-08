"use client";

import { useMemo } from "react";
import type { Agent } from "@/lib/types";
import type { Escrow } from "@/lib/types";

function computeInsight(agents: Agent[], disputes: Escrow[], escrows: Escrow[]): string {
  if (agents.length === 0) {
    return "Register your first agent to activate the protocol. Agents are the economic participants of Mesh.";
  }

  if (disputes.length > 0) {
    return `${disputes.length} escrow${disputes.length > 1 ? "s are" : " is"} frozen pending arbitration. Human judgment is required before settlement can proceed.`;
  }

  const locked = escrows.filter((e) => e.status === "locked");
  if (locked.length > 0) {
    const total = locked.reduce((sum, e) => sum + e.amount, 0);
    return `${total.toFixed(1)} GEN locked across ${locked.length} active escrow${locked.length > 1 ? "s" : ""}. Funds release automatically on settlement acceptance.`;
  }

  const categories: Record<string, number> = {};
  agents.forEach((a) => {
    const cat = a.category || "general";
    categories[cat] = (categories[cat] || 0) + 1;
  });
  const top = Object.entries(categories).sort((a, b) => b[1] - a[1])[0];
  if (top && agents.length > 1) {
    const pct = Math.round((top[1] / agents.length) * 100);
    return `${top[0].charAt(0).toUpperCase() + top[0].slice(1)} agents account for ${pct}% of registered capacity. All agents remain within spending limits.`;
  }

  const active = agents.filter((a) => a.status === "active").length;
  if (active === agents.length && active > 0) {
    return `All ${active} registered agent${active > 1 ? "s are" : " is"} active and within spending limits. No intervention required.`;
  }

  return "All active agents remain within spending limits. No intervention required.";
}

export function InsightCard({
  agents,
  disputes,
  escrows,
}: {
  agents: Agent[];
  disputes: Escrow[];
  escrows: Escrow[];
}) {
  const insight = useMemo(
    () => computeInsight(agents, disputes, escrows),
    [agents, disputes, escrows],
  );

  return (
    <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-[5px] w-[5px] rounded-full bg-[--mesh-blue]" />
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6B6B74]">
          Protocol Insight
        </h3>
      </div>
      <p className="text-[13.5px] leading-relaxed text-[#A8A7A1]">{insight}</p>
    </div>
  );
}
