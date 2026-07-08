"use client";

import Link from "next/link";
import { useMemo } from "react";
import { motion } from "framer-motion";
import { AppChrome } from "@/components/shell/AppChrome";
import { ProtocolStatusStrip } from "@/components/surfaces/ProtocolStatusStrip";
import { InsightCard } from "@/components/surfaces/InsightCard";
import { AmbientBackdrop } from "@/components/surfaces/AmbientBackdrop";
import { AnimatedNumber } from "@/components/primitives/AnimatedNumber";
import { useAgents } from "@/lib/useAgents";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { useWallet } from "@/lib/WalletProvider";

const serif = { fontFamily: "var(--font-serif-display)" } as const;

function useSmartGreeting(
  agents: ReturnType<typeof useAgents>["agents"],
  disputes: ReturnType<typeof useDisputedEscrows>["escrows"],
  events: ReturnType<typeof useLiveEvents>["events"],
  address: string | null,
) {
  return useMemo(() => {
    const h = new Date().getHours();
    const time = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";

    if (!address) {
      return {
        headline: `${time}.`,
        subline: "Connect your wallet to begin coordinating agents.",
      };
    }

    const myAgents = agents.filter(
      (a) => a.owner_wallet?.toLowerCase() === address.toLowerCase(),
    );
    const activeOwned = myAgents.filter((a) => a.status === "active").length;
    const settledToday = events.filter((e) => e.kind === "settlement").length;

    if (disputes.length > 0) {
      return {
        headline: `${time}.`,
        subline:
          disputes.length === 1
            ? "One escrow is awaiting your judgment."
            : `${disputes.length} escrows are awaiting your judgment.`,
      };
    }

    if (myAgents.length === 0 && agents.length === 0) {
      return {
        headline: `${time}.`,
        subline: "No agents registered yet. Register your first agent to begin.",
      };
    }

    if (activeOwned > 0 && settledToday > 0) {
      return {
        headline: `${time}.`,
        subline: `${activeOwned} agent${activeOwned > 1 ? "s" : ""} active under your wallet. Mesh has processed ${settledToday} settlement${settledToday > 1 ? "s" : ""} this session.`,
      };
    }

    if (activeOwned > 0) {
      return {
        headline: `${time}.`,
        subline: `${activeOwned} agent${activeOwned > 1 ? "s" : ""} active under your wallet. No disputes require review.`,
      };
    }

    if (agents.length > 0) {
      return {
        headline: `${time}.`,
        subline: `${agents.length} agent${agents.length > 1 ? "s" : ""} registered on Mesh. No disputes require review.`,
      };
    }

    return {
      headline: `${time}.`,
      subline: "Nothing requires judgment · protocol autonomous.",
    };
  }, [agents, disputes, events, address]);
}

function usePersonalAwareness(
  agents: ReturnType<typeof useAgents>["agents"],
  address: string | null,
) {
  return useMemo(() => {
    if (!address) return null;
    const mine = agents.filter(
      (a) => a.owner_wallet?.toLowerCase() === address.toLowerCase(),
    );
    if (mine.length === 0) return null;

    const active = mine.filter((a) => a.status === "active");
    const top = mine.slice().sort((a, b) => b.reliability_score - a.reliability_score)[0];

    return { count: mine.length, active: active.length, top };
  }, [agents, address]);
}

export default function CommandCenter() {
  const { agents } = useAgents();
  const { escrows: disputes, all: allEscrows } = useDisputedEscrows();
  const { events } = useLiveEvents();
  const { address } = useWallet();

  const { headline, subline } = useSmartGreeting(agents, disputes, events, address);
  const awareness = usePersonalAwareness(agents, address);
  const activeCount = agents.filter((a) => a.status === "active").length;

  const queue = useMemo(
    () =>
      disputes.map((d) => ({
        title: `Dispute — ${d.intent_id}`,
        detail: `${d.payer.slice(0, 8)}… vs ${d.payee.slice(0, 8)}… · escrow frozen`,
        meta: `${d.amount.toFixed(2)} GEN`,
        href: `/chamber?escrow=${d.escrow_id}`,
      })),
    [disputes],
  );

  return (
    <div className="min-h-screen bg-[#0C0C0E] font-sans text-[14px] text-[--mesh-white]">
      <AppChrome />
      <ProtocolStatusStrip />

      <main className="relative mx-auto max-w-[1180px] px-7 py-9">
        <AmbientBackdrop />

        {/* ── Greeting ── */}
        <div className="relative mb-7 flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <h1 className="text-[30px] font-light tracking-[-0.01em]" style={serif}>
              {headline}
            </h1>
            <div className="mt-1.5 text-[13px] text-[#6B6B74]">{subline}</div>
          </motion.div>
          <div className="text-right">
            <div className="text-[34px] font-light" style={serif}>
              <AnimatedNumber value={activeCount} /> <span className="text-[15px] text-[#6B6B74]">agents</span>
            </div>
            <div className="mt-1 text-[11.5px] tracking-[0.06em] text-[#6B6B74]">ACTIVE ON MESH</div>
          </div>
        </div>

        {/* ── Priority Queue — primary card (brighter border) ── */}
        <div className="relative overflow-hidden rounded-xl border border-[#2E2E38] bg-[#0F0F12]">
          <div className="flex justify-between border-b border-[#212127] px-5 py-3.5">
            <h2 className="text-[13px] font-semibold">Priority Queue</h2>
            <span className="font-mono text-[10px] tracking-[0.14em] text-[#6B6B74]">{queue.length} OPEN</span>
          </div>
          {queue.length === 0 ? (
            <div className="px-5 py-10 text-center text-[13px] text-[#6B6B74]">
              Queue clear. The mesh is coordinating without you — as designed.
            </div>
          ) : (
            queue.map((q) => (
              <Link key={q.href} href={q.href}
                className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-4 border-b border-[#212127] px-5 py-4 last:border-b-0 hover:bg-[#18181C]">
                <span className="h-2 w-2 animate-pulse rounded-full bg-[--mesh-red] shadow-[0_0_8px_rgba(226,61,46,0.6)]" />
                <span>
                  <span className="block text-[14.5px] font-medium">{q.title}</span>
                  <span className="mt-0.5 block text-[12.5px] text-[#6B6B74]">{q.detail}</span>
                </span>
                <span className="font-mono text-[12px] text-[#A8A7A1]">{q.meta}</span>
                <span className="rounded-md bg-[--mesh-red] px-4 py-2 text-[12.5px] font-semibold text-white">
                  Enter Chamber
                </span>
              </Link>
            ))
          )}
        </div>

        {/* ── Secondary row ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Protocol health — secondary card */}
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-4 text-[12px] font-semibold text-[#A8A7A1]">Protocol Health</h3>
            <div className="flex gap-9">
              <div>
                <div className="text-[34px] font-light" style={serif}>
                  <AnimatedNumber value={activeCount} />
                </div>
                <div className="mt-1 text-[11.5px] text-[#6B6B74]">Active agents</div>
              </div>
              <div>
                <div className="text-[34px] font-light" style={serif}>
                  <AnimatedNumber value={agents.length} />
                </div>
                <div className="mt-1 text-[11.5px] text-[#6B6B74]">Registered</div>
              </div>
              <div>
                <div className="text-[34px] font-light" style={serif}>
                  <AnimatedNumber value={disputes.length} />
                </div>
                <div className="mt-1 text-[11.5px] text-[#6B6B74]">Open disputes</div>
              </div>
            </div>
          </div>

          {/* Personal awareness — secondary card */}
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-3 text-[12px] font-semibold text-[#A8A7A1]">
              {awareness ? "Your Presence" : "Network"}
            </h3>
            {awareness ? (
              <div className="space-y-2 text-[13px] text-[#A8A7A1]">
                <div>You own <span className="text-[--mesh-white] font-medium">{awareness.count}</span> agent{awareness.count > 1 ? "s" : ""} on Mesh.</div>
                {awareness.active > 0 && (
                  <div><span className="text-[--mesh-white] font-medium">{awareness.active}</span> currently active.</div>
                )}
                {awareness.top && (
                  <div>
                    Highest reliability: <span className="font-mono text-[12px] text-[--mesh-white]">{awareness.top.name}</span>
                    <span className="ml-2 text-[11.5px] text-[#6B6B74]">({awareness.top.reliability_score}%)</span>
                  </div>
                )}
                {disputes.length === 0 && (
                  <div className="text-[#6B6B74]">No actions require your attention.</div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="max-w-[32ch] text-[12.5px] leading-relaxed text-[#6B6B74]">
                  Live topology, negotiations and dispute traces on the Network surface.
                </p>
                <Link href="/network" className="rounded-md border border-[#212127] bg-[#18181C] px-4 py-2 text-[12.5px] font-semibold">
                  Open map →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── Protocol Insight ── */}
        <div className="mt-4">
          <InsightCard agents={agents} disputes={disputes} escrows={allEscrows} />
        </div>

        {/* ── Activity feed — passive card ── */}
        <div className="mt-4 rounded-xl border border-[#191920] bg-[#0C0C0E] px-5 py-1.5">
          <div className="flex justify-between border-b border-[#191920] pb-2.5 pt-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B74]">Activity</span>
            <span className="font-mono text-[10px] text-[#2E2E38]">LIVE</span>
          </div>
          {events.length === 0 ? (
            <div className="py-5 text-[13px] text-[#6B6B74]">
              No activity yet. Register agents and submit intents to begin.
            </div>
          ) : (
            events.slice(0, 6).map((e) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-baseline gap-3.5 border-b border-[#191920] py-3 text-[13px] text-[#A8A7A1] last:border-b-0"
              >
                <span className="min-w-[42px] font-mono text-[11px] text-[#6B6B74]">{e.time}</span>
                <span className={e.kind === "dispute" ? "text-[--mesh-red]" : e.kind === "settlement" ? "text-[oklch(78%_0.07_245)]" : ""}>{e.text}</span>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
