"use client";

// Surface 4 — Arbitration Chamber. Not a modal: a dedicated, ceremonial screen.
// Two parties face each other across the evidence timeline. Judgment is a
// press-and-hold. Nothing decorative — the stillness is the ceremony.

import { Suspense, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppChrome } from "@/components/shell/AppChrome";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { overrideSettlement } from "@/lib/api";

const serif = { fontFamily: "var(--font-serif-display)" } as const;
const HOLD_MS = 800;

const short = (s: string) => (s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

function HoldButton({ label, tone, onCommit, disabled }: {
  label: string; tone: "release" | "refund"; onCommit: () => void; disabled: boolean;
}) {
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const start = useRef(0);

  const begin = () => {
    if (disabled) return;
    start.current = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - start.current) / HOLD_MS);
      setProgress(p);
      if (p >= 1) { end(); onCommit(); }
    }, 16);
  };
  const end = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgress(0);
  };

  return (
    <button
      onPointerDown={begin} onPointerUp={end} onPointerLeave={end}
      disabled={disabled}
      className={`relative cursor-pointer overflow-hidden rounded-lg py-4.5 text-[13px] font-semibold tracking-[0.04em] transition-opacity disabled:opacity-40 ${
        tone === "release" ? "bg-[--mesh-blue] text-white" : "border border-[rgba(226,61,46,0.5)] text-[--mesh-red]"
      }`}
      style={{ padding: "18px 0" }}
    >
      <span className="absolute inset-y-0 left-0 bg-[rgba(255,255,255,0.18)]" style={{ width: `${progress * 100}%` }} />
      <span className="relative">{label}</span>
    </button>
  );
}

function ChamberInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { escrows, refetch } = useDisputedEscrows();
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolved, setResolved] = useState<"released" | "refunded" | null>(null);

  const wanted = params.get("escrow");
  const escrow = useMemo(
    () => escrows.find((e) => e.escrow_id === wanted) ?? escrows[0] ?? null,
    [escrows, wanted],
  );

  const decide = async (status: "released" | "refunded") => {
    if (!escrow || resolving) return;
    setResolving(true);
    setError(null);
    const result = await overrideSettlement(escrow.escrow_id, status);
    setResolving(false);
    if (result.ok) {
      setResolved(status);
      try { new Audio("/sound/settle-tick.wav").play(); } catch { /* gesture-gated */ }
      await refetch();
      setTimeout(() => router.push("/console"), 1800);
    } else {
      setError(result.error ?? "Failed to resolve — check your wallet is a party to this escrow.");
    }
  };

  if (!escrow && !resolved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
        <p className="text-[26px] font-light italic text-[#A8A7A1]" style={serif}>The chamber is empty.</p>
        <p className="mt-3 text-[13px] text-[#6B6B74]">No open disputes. The mesh is resolving itself.</p>
      </div>
    );
  }

  if (resolved) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-32 text-center">
        <p className="text-[32px] font-light" style={serif}>
          Judgment rendered — {resolved === "released" ? "provider paid" : "requester made whole"}.
        </p>
        <p className="mt-3 font-mono text-[11px] tracking-[0.14em] text-[#6B6B74]">RETURNING TO COMMAND…</p>
      </div>
    );
  }

  const e = escrow!;
  return (
    <div className="flex flex-1 flex-col"
      style={{ background: "radial-gradient(ellipse 70% 55% at 50% 38%, #131318 0%, #08080A 78%)" }}>
      <div className="pt-11 text-center">
        <div className="font-mono text-[10px] tracking-[0.18em] text-[--mesh-red]">
          ● DISPUTE · ESCROW #{e.escrow_id.slice(0, 8).toUpperCase()} · AWAITING YOUR JUDGMENT
        </div>
        <h1 className="mt-3 text-[42px] font-light tracking-[-0.015em]" style={serif}>
          {short(e.payee)} <em className="text-[#6B6B74]">vs</em> {short(e.payer)}
        </h1>
        <div className="mt-2.5 font-mono text-[13px] tracking-[0.1em] text-[#A8A7A1]">
          {e.amount.toFixed(2)} GEN IN ESCROW · {e.intent_id.toUpperCase()}
        </div>
      </div>

      {/* the court */}
      <div className="mx-auto mt-7 grid w-full max-w-[1240px] flex-1 grid-cols-1 gap-5 px-7 lg:grid-cols-[1fr_300px_1fr]">
        <div className="h-fit rounded-2xl border border-[#212127] border-t-2 border-t-[--mesh-blue] bg-[rgba(19,19,22,0.75)] p-6">
          <div className="text-[22px]" style={serif}>{short(e.payee)}</div>
          <div className="mb-4 mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B74]">Claimant · Provider</div>
          <p className="text-[14px] leading-relaxed text-[#A8A7A1]">
            Delivered against intent <b className="font-medium text-[--mesh-white]">{e.intent_id}</b> and
            claims the deliverable satisfies the on-chain scope. Requests <b className="font-medium text-[--mesh-white]">release</b> of escrow.
          </p>
        </div>

        <div className="border-x border-[#212127] px-5">
          <h3 className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B74]">Evidence timeline</h3>
          {[
            ["INTENT", `${e.intent_id} committed · ${e.amount.toFixed(2)} GEN`, false],
            ["ESCROW", `funds locked by ${short(e.payer)}`, false],
            ["DELIVERY", "deliverable submitted for verification", false],
            ["DISPUTE", "outcome contested · escrow frozen", true],
          ].map(([k, d, key]) => (
            <div key={k as string} className="relative ml-1.5 border-l border-[#26262C] pb-5 pl-4">
              <span className={`absolute -left-1 top-0.5 h-[7px] w-[7px] rounded-full ${
                key ? "bg-[--mesh-blue] shadow-[0_0_8px_rgba(46,92,255,0.6)]" : "bg-[#6B6B74]"}`} />
              <div className="mb-1 font-mono text-[10px] text-[#6B6B74]">{k}</div>
              <div className="text-[12.5px] leading-normal text-[#A8A7A1]">{d}</div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-2xl border border-[#212127] border-t-2 border-t-[#D9A13B] bg-[rgba(19,19,22,0.75)] p-6">
          <div className="text-[22px]" style={serif}>{short(e.payer)}</div>
          <div className="mb-4 mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B74]">Respondent · Requester</div>
          <p className="text-[14px] leading-relaxed text-[#A8A7A1]">
            Contests the delivery against the committed scope of <b className="font-medium text-[--mesh-white]">{e.intent_id}</b>.
            Requests <b className="font-medium text-[--mesh-white]">refund</b> of the locked escrow.
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="mx-auto w-full max-w-[1240px] px-7 pb-9 pt-5">
        <div className="mb-5 flex justify-center gap-10 border-y border-[#212127] py-3.5 font-mono text-[11.5px] tracking-[0.08em] text-[#A8A7A1]">
          <span>ESCROW <b className="text-[--mesh-white]">DISPUTED</b></span>
          <span>AMOUNT <b className="text-[--mesh-white]">{e.amount.toFixed(2)} GEN</b></span>
          <span>OPENED <b className="text-[--mesh-white]">{new Date(e.created_at).toLocaleTimeString()}</b></span>
        </div>
        {error && <div className="mb-4 text-center text-[12.5px] text-[--mesh-red]">{error}</div>}
        <div className="mx-auto grid max-w-[760px] grid-cols-1 gap-3.5 md:grid-cols-2">
          <HoldButton label={resolving ? "COMMITTING…" : "HOLD TO RELEASE — PROVIDER PAID"} tone="release"
            onCommit={() => decide("released")} disabled={resolving} />
          <HoldButton label={resolving ? "COMMITTING…" : "HOLD TO REFUND — REQUESTER MADE WHOLE"} tone="refund"
            onCommit={() => decide("refunded")} disabled={resolving} />
        </div>
        <div className="mt-4 text-center">
          <button onClick={() => router.push("/console")}
            className="cursor-pointer border-b border-[#26262C] pb-0.5 text-[12px] text-[#6B6B74] hover:text-[#A8A7A1]">
            Defer — return to Command
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ArbitrationChamber() {
  return (
    <div className="flex min-h-screen flex-col bg-[#0C0C0E] font-sans text-[14px] text-[--mesh-white]">
      <AppChrome />
      <Suspense>
        <ChamberInner />
      </Suspense>
    </div>
  );
}
