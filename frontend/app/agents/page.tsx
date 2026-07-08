"use client";

// Surface 3 — Agent Profile. Investigative: identity header, numbers column,
// mind column (trace / negotiations / verification). The trace is the only
// mono-dense zone in the product, by design.

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppChrome } from "@/components/shell/AppChrome";
import { useAgents } from "@/lib/useAgents";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { pauseAgent } from "@/lib/api";

const serif = { fontFamily: "var(--font-serif-display)" } as const;
type Tab = "Reasoning trace" | "Negotiation history" | "Verification evidence";

function AgentProfileInner() {
  const params = useSearchParams();
  const { agents, refetch } = useAgents();
  const { events } = useLiveEvents();
  const [tab, setTab] = useState<Tab>("Reasoning trace");
  const [pausing, setPausing] = useState(false);

  const wanted = params.get("id");
  const agent = useMemo(
    () => agents.find((a) => a.agent_id === wanted) ?? agents[0] ?? null,
    [agents, wanted],
  );

  const doPause = async () => {
    if (!agent) return;
    setPausing(true);
    await pauseAgent(agent.agent_id);
    await refetch();
    setPausing(false);
  };

  if (!agent) {
    return (
      <main className="mx-auto max-w-[1180px] px-7 py-16 text-center text-[13px] text-[#6B6B74]">
        No agents registered yet. Connect your wallet and click <strong className="text-[#A8A7A1]">+ Agent</strong> in the header.
      </main>
    );
  }

  const trust = Math.round(agent.reliability_score);
  const agentEvents = events.filter((e) => e.text.includes(agent.name) || e.text.includes(agent.agent_id));

  return (
    <main className="mx-auto max-w-[1180px] px-7 py-9">
      {/* identity header */}
      <div className="mb-7 flex items-start justify-between border-b border-[#212127] pb-7">
        <div>
          <h1 className="text-[38px] font-light tracking-[-0.015em]" style={serif}>{agent.name}</h1>
          <div className="mt-2.5 flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-2.5 py-1 text-[11.5px] font-medium ${
              agent.status === "active"
                ? "border-[rgba(46,92,255,0.4)] bg-[rgba(46,92,255,0.08)] text-[#7EA0FF]"
                : "border-[#212127] text-[#A8A7A1]"}`}>
              ● {agent.status === "active" ? "Active" : agent.status}
            </span>
            <span className="rounded-full border border-[#212127] px-2.5 py-1 text-[11.5px] font-medium text-[#A8A7A1]">{agent.category}</span>
            <span className="rounded-full border border-[#212127] px-2.5 py-1 text-[11.5px] font-medium text-[#A8A7A1]">Autonomy L{agent.autonomy_level}</span>
            <span className="font-mono text-[11px] tracking-[0.06em] text-[#6B6B74]">
              OWNER {agent.owner_wallet.slice(0, 6)}…{agent.owner_wallet.slice(-4)}
            </span>
          </div>
        </div>
        <button onClick={doPause} disabled={pausing || agent.status !== "active"}
          className="cursor-pointer rounded-lg border border-[rgba(226,61,46,0.35)] bg-[#18181C] px-4 py-2 text-[12.5px] font-semibold text-[--mesh-red] disabled:opacity-40">
          {pausing ? "Pausing…" : "Pause agent"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* numbers column */}
        <div className="space-y-4">
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-4 text-[12px] font-semibold text-[#A8A7A1]">Trust</h3>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[64px] font-light tracking-[-0.03em]" style={serif}>{trust}</span>
              <span className="text-[12px] text-[#6B6B74]">/ 100</span>
            </div>
            <div className="mt-3.5 h-1 rounded bg-[#26262C]"><i className="block h-full rounded bg-[--mesh-blue]" style={{ width: `${trust}%` }} /></div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[#6B6B74]">
              <span>Reliability {agent.reliability_score}%</span>
              <span>Confidence {agent.confidence_score}</span>
            </div>
          </div>
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-2 text-[12px] font-semibold text-[#A8A7A1]">Contracts</h3>
            {[
              ["Base price", `${agent.base_price} GEN`],
              ["Pricing model", agent.pricing_model.replace("_", " ")],
              ["Spending limit", `${agent.spending_limit} GEN`],
              ["Capabilities", agent.capabilities.join(", ") || "—"],
              ["Registered", new Date(agent.created_at).toLocaleDateString()],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-t border-[#212127] py-2 text-[12.5px] first:border-t-0">
                <span className="text-[#6B6B74]">{k}</span>
                <span className="max-w-[55%] truncate text-right font-mono text-[11.5px]">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* mind column */}
        <div>
          <div className="flex gap-0.5 border-b border-[#212127]">
            {(["Reasoning trace", "Negotiation history", "Verification evidence"] as Tab[]).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`cursor-pointer px-4 py-3 text-[13px] font-medium transition-colors ${
                  tab === t ? "border-b-2 border-[--mesh-blue] text-[--mesh-white]" : "text-[#6B6B74] hover:text-[#A8A7A1]"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="rounded-b-xl border border-t-0 border-[#212127] bg-[#131316] px-5 py-2">
            {agentEvents.length === 0 && (
              <div className="py-6 text-[13px] text-[#6B6B74]">
                No {tab.toLowerCase()} recorded for {agent.name} in this session yet.
              </div>
            )}
            {agentEvents.slice(0, 12).map((e) => (
              <div key={e.id} className="flex gap-4 border-b border-[#212127] py-2.5 font-mono text-[11.5px] text-[#A8A7A1] last:border-b-0">
                <span className="min-w-[56px] text-[#6B6B74]">{e.time}</span>
                <span className={`min-w-[86px] ${e.kind === "dispute" ? "text-[--mesh-red]" : "text-[--mesh-blue]"}`}>
                  {e.kind.toUpperCase()}
                </span>
                <span>{e.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function AgentProfile() {
  return (
    <div className="min-h-screen bg-[#0C0C0E] font-sans text-[14px] text-[--mesh-white]">
      <AppChrome />
      <Suspense>
        <AgentProfileInner />
      </Suspense>
    </div>
  );
}
