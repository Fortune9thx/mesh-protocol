"use client";

// Surface 1 — Command Center. "What requires my attention right now?"
// One dominant object: the Priority Queue. Everything else is secondary.

import Link from "next/link";
import { useMemo } from "react";
import { AppChrome } from "@/components/shell/AppChrome";
import { useAgents } from "@/lib/useAgents";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useLiveEvents } from "@/lib/useLiveEvents";
import { useWallet } from "@/lib/WalletProvider";

const serif = { fontFamily: "var(--font-serif-display)" } as const;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

export default function CommandCenter() {
  const { agents } = useAgents();
  const { escrows: disputes } = useDisputedEscrows();
  const { events } = useLiveEvents();
  const { address } = useWallet();

  const active = agents.filter((a) => a.status === "active").length;
  const queue = useMemo(
    () =>
      disputes.map((d) => ({
        tone: "red" as const,
        title: `Dispute — ${d.intent_id}`,
        detail: `${d.payer.slice(0, 8)}… vs ${d.payee.slice(0, 8)}… · escrow frozen`,
        meta: `${d.amount.toFixed(2)} GEN`,
        action: "Enter Chamber",
        href: `/chamber?escrow=${d.escrow_id}`,
      })),
    [disputes],
  );

  return (
    <div className="min-h-screen bg-[#0C0C0E] font-sans text-[14px] text-[--mesh-white]">
      <AppChrome />
      <main className="mx-auto max-w-[1180px] px-7 py-9">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <h1 className="text-[30px] font-light tracking-[-0.01em]" style={serif}>
              {greeting()}{address ? "" : " — connect your wallet"}.
            </h1>
            <div className="mt-1.5 text-[13px] text-[#6B6B74]">
              {queue.length > 0
                ? `${queue.length} item${queue.length > 1 ? "s" : ""} require judgment · protocol otherwise autonomous`
                : "Nothing requires judgment · protocol autonomous"}
            </div>
          </div>
          <div className="text-right">
            <div className="text-[34px] font-light" style={serif}>
              {active} <span className="text-[15px] text-[#6B6B74]">agents</span>
            </div>
            <div className="mt-1 text-[11.5px] tracking-[0.06em] text-[#6B6B74]">ACTIVE ON MESH</div>
          </div>
        </div>

        {/* ── Priority Queue — the one dominant object ── */}
        <div className="overflow-hidden rounded-xl border border-[#212127] bg-[#131316]">
          <div className="flex justify-between border-b border-[#212127] px-5 py-3.5">
            <h2 className="text-[13px] font-semibold">Priority Queue</h2>
            <span className="font-mono text-[10px] tracking-[0.14em] text-[#6B6B74]">{queue.length} OPEN</span>
          </div>
          {queue.length === 0 && (
            <div className="px-5 py-10 text-center text-[13px] text-[#6B6B74]">
              Queue clear. The mesh is coordinating without you — as designed.
            </div>
          )}
          {queue.map((q) => (
            <Link key={q.href} href={q.href}
              className="grid grid-cols-[10px_1fr_auto_auto] items-center gap-4 border-b border-[#212127] px-5 py-4 last:border-b-0 hover:bg-[#18181C]">
              <span className="h-2 w-2 animate-pulse rounded-full bg-[--mesh-red] shadow-[0_0_8px_rgba(226,61,46,0.6)]" />
              <span>
                <span className="block text-[14.5px] font-medium">{q.title}</span>
                <span className="mt-0.5 block text-[12.5px] text-[#6B6B74]">{q.detail}</span>
              </span>
              <span className="font-mono text-[12px] text-[#A8A7A1]">{q.meta}</span>
              <span className="rounded-md bg-[--mesh-red] px-4 py-2 text-[12.5px] font-semibold text-white">
                {q.action}
              </span>
            </Link>
          ))}
        </div>

        {/* ── Secondary: health + network ── */}
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-4 text-[12px] font-semibold text-[#A8A7A1]">Protocol Health</h3>
            <div className="flex gap-9">
              <div><div className="text-[34px] font-light" style={serif}>{active}</div><div className="mt-1 text-[11.5px] text-[#6B6B74]">Active agents</div></div>
              <div><div className="text-[34px] font-light" style={serif}>{agents.length}</div><div className="mt-1 text-[11.5px] text-[#6B6B74]">Registered</div></div>
              <div><div className="text-[34px] font-light" style={serif}>{disputes.length}</div><div className="mt-1 text-[11.5px] text-[#6B6B74]">Open disputes</div></div>
            </div>
          </div>
          <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
            <h3 className="mb-4 text-[12px] font-semibold text-[#A8A7A1]">Network</h3>
            <div className="flex items-center justify-between">
              <p className="max-w-[32ch] text-[12.5px] leading-relaxed text-[#6B6B74]">
                Live topology, negotiations and dispute traces live on the Network surface.
              </p>
              <Link href="/network" className="rounded-md border border-[#212127] bg-[#18181C] px-4 py-2 text-[12.5px] font-semibold">
                Open map →
              </Link>
            </div>
          </div>
        </div>

        {/* ── Tertiary: recent activity as prose ── */}
        <div className="mt-4 rounded-xl border border-[#212127] bg-[#131316] px-5 py-1.5">
          {events.length === 0 && (
            <div className="py-5 text-[13px] text-[#6B6B74]">No recent activity.</div>
          )}
          {events.slice(0, 6).map((e) => (
            <div key={e.id} className="flex items-baseline gap-3.5 border-b border-[#212127] py-3 text-[13px] text-[#A8A7A1] last:border-b-0">
              <span className="min-w-[42px] font-mono text-[11px] text-[#6B6B74]">{e.time}</span>
              <span className={e.kind === "dispute" ? "text-[--mesh-red]" : ""}>{e.text}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
