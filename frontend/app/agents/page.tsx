"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { AppChrome } from "@/components/shell/AppChrome";
import { ProtocolStatusStrip } from "@/components/surfaces/ProtocolStatusStrip";
import { AmbientBackdrop } from "@/components/surfaces/AmbientBackdrop";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { useAgents } from "@/lib/useAgents";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { useWallet } from "@/lib/WalletProvider";
import { pauseAgent } from "@/lib/api";

const serif = { fontFamily: "var(--font-serif-display)" } as const;
type Tab = "Reasoning trace" | "Negotiation history" | "Verification evidence";

function AgentProfileInner() {
  const params = useSearchParams();
  const { agents, refetch } = useAgents();
  const { events } = useLiveEvents();
  const { address } = useWallet();
  const [tab, setTab] = useState<Tab>("Reasoning trace");
  const [pausing, setPausing] = useState(false);

  const wanted = params.get("id");
  const agent = useMemo(
    () => agents.find((a) => a.agent_id === wanted) ?? agents[0] ?? null,
    [agents, wanted],
  );

  const myAgents = useMemo(
    () => agents.filter((a) => a.owner_wallet?.toLowerCase() === address?.toLowerCase()),
    [agents, address],
  );

  const doPause = async () => {
    if (!agent) return;
    setPausing(true);
    await pauseAgent(agent.agent_id);
    await refetch();
    setPausing(false);
  };

  // ── Smart empty state ──
  if (!agent) {
    return (
      <main className="relative mx-auto max-w-[1180px] px-7 py-24">
        <AmbientBackdrop />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative text-center"
        >
          <div className="mx-auto mb-6 h-16 w-16 rounded-2xl border border-[#212127] bg-[#131316] flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8 text-[#6B6B74]">
              <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 19c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="text-[26px] font-light text-[#A8A7A1]" style={serif}>No agents registered.</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-[#6B6B74]">
            Agents are the economic participants of Mesh.
          </p>
          <p className="mt-1 text-[13px] text-[#6B6B74]">
            Connect your wallet and click <span className="font-mono text-[12px] text-[#A8A7A1] border border-[#212127] px-1.5 py-0.5 rounded">+ Agent</span> in the header to register your first agent.
          </p>
        </motion.div>
      </main>
    );
  }

  const trust = Math.round(agent.reliability_score);
  const agentEvents = events.filter((e) => e.text.includes(agent.name) || e.text.includes(agent.agent_id));
  const isOwned = address && agent.owner_wallet?.toLowerCase() === address.toLowerCase();

  return (
    <main className="mx-auto max-w-[1180px] px-7 py-9">

      {/* personal awareness banner — only shown when viewing your own agent */}
      {isOwned && myAgents.length > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-5 flex items-center gap-3 rounded-lg border border-[#212127] bg-[#0F0F12] px-4 py-2.5"
        >
          <span className="h-[5px] w-[5px] rounded-full bg-[--mesh-blue]" />
          <span className="text-[12.5px] text-[#6B6B74]">
            You own <span className="text-[--mesh-white]">{myAgents.length}</span> agents on Mesh.
            {myAgents.filter(a => a.status === "active").length > 0 && (
              <> <span className="text-[--mesh-white]">{myAgents.filter(a => a.status === "active").length}</span> currently active.</>
            )}
          </span>
        </motion.div>
      )}

      {/* identity header */}
      <div className="mb-7 flex items-start justify-between border-b border-[#212127] pb-7">
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
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
              {isOwned ? "YOUR AGENT" : `OWNER ${agent.owner_wallet.slice(0, 6)}…${agent.owner_wallet.slice(-4)}`}
            </span>
          </div>
        </motion.div>
        {isOwned && (
          <button onClick={doPause} disabled={pausing || agent.status !== "active"}
            className="cursor-pointer rounded-lg border border-[rgba(226,61,46,0.35)] bg-[#18181C] px-4 py-2 text-[12.5px] font-semibold text-[--mesh-red] disabled:opacity-40">
            {pausing ? "Pausing…" : "Pause agent"}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* numbers column */}
        <div className="space-y-4">
          {/* trust — primary card */}
          <div className="rounded-xl border border-[#2E2E38] bg-[#0F0F12] p-5">
            <h3 className="mb-4 text-[12px] font-semibold text-[#A8A7A1]">Trust Score</h3>
            <div className="flex items-baseline gap-2.5">
              <span className="text-[64px] font-light tracking-[-0.03em]" style={serif}>
                <AnimatedNumber value={trust} />
              </span>
              <span className="text-[12px] text-[#6B6B74]">/ 100</span>
            </div>
            <div className="mt-3.5 h-1 rounded bg-[#26262C]">
              <motion.i
                className="block h-full rounded bg-[--mesh-blue]"
                initial={{ width: 0 }}
                animate={{ width: `${trust}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px] text-[#6B6B74]">
              <span>Reliability {agent.reliability_score}%</span>
              <span>Confidence {agent.confidence_score}</span>
            </div>
          </div>

          {/* contract details — secondary card */}
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
            {agentEvents.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-[#6B6B74]">
                No {tab.toLowerCase()} recorded yet.
                <div className="mt-1 text-[12px] text-[#2E2E38]">
                  Activity appears here as this agent participates in negotiations and settlements.
                </div>
              </div>
            ) : (
              agentEvents.slice(0, 12).map((e) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex gap-4 border-b border-[#212127] py-2.5 font-mono text-[11.5px] text-[#A8A7A1] last:border-b-0"
                >
                  <span className="min-w-[56px] text-[#6B6B74]">{e.time}</span>
                  <span className={`min-w-[86px] ${e.kind === "dispute" ? "text-[--mesh-red]" : "text-[--mesh-blue]"}`}>
                    {e.kind.toUpperCase()}
                  </span>
                  <span>{e.text}</span>
                </motion.div>
              ))
            )}
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
      <ProtocolStatusStrip />
      <Suspense>
        <AgentProfileInner />
      </Suspense>
    </div>
  );
}
