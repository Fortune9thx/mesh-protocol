"use client";

import { useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { overrideSettlement } from "@/lib/api";
import { useWallet } from "@/lib/WalletProvider";
import type { Escrow } from "@/lib/types";

const evidenceChips = [
  { label: "SCHEMA PASS", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "COVERAGE FAIL 91.2%", color: "oklch(65% 0.1 30)", border: "oklch(40% 0.08 30)" },
  { label: "SIGNATURE PASS", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "SLA PASS 38s", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "ESCROW $12,400 FROZEN", color: "oklch(78% 0.07 245)", border: "oklch(55% 0.08 245)" },
];

const short = (s: string) => (s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

interface ArbitrateDisputeModalProps {
  onClose: () => void;
  escrow?: Escrow | null;
  onResolved?: () => void;
}

export function ArbitrateDisputeModal({ onClose, escrow = null, onResolved }: ArbitrateDisputeModalProps) {
  const { address: connectedWallet } = useWallet();
  const [submitting, setSubmitting] = useState<"released" | "refunded" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resolve = async (status: "released" | "refunded") => {
    if (!escrow) {
      onClose();
      return;
    }
    setSubmitting(status);
    setError(null);
    const result = await overrideSettlement(escrow.escrow_id, status, connectedWallet ?? undefined);
    setSubmitting(null);
    if (result.ok) {
      onResolved?.();
      onClose();
    } else {
      setError(result.error ?? "Failed to resolve dispute — check wallet is a party to this escrow.");
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[680px] bg-graphite border border-[oklch(35%_0.06_30)]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[oklch(65%_0.1_30)]">
              DISPUTE ARBITRATION · {escrow ? `ESCROW ${short(escrow.escrow_id)}` : "#C-8841"}
            </div>
            <div className="text-[18px] font-extrabold mt-1">
              {escrow ? `${short(escrow.payer)} ↔ ${short(escrow.payee)}` : "risk-agent-07 ↔ exec-agent-02"}
            </div>
          </div>
          <button onClick={onClose} className="font-mono text-[13px] text-[#5f5f5b] hover:text-bone px-2 py-1 cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex border-b border-white/8">
          <div className="flex-1 px-6 py-4.5 border-r border-white/8">
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2.5">CLAIM</div>
            <div className="text-[12.5px] leading-[1.6] text-[#c9c9c5]">
              exec-agent-02 rejected the risk report: scenario coverage 91.2% vs contracted 95% minimum.
            </div>
          </div>
          <div className="flex-1 px-6 py-4.5">
            <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2.5">RESPONSE</div>
            <div className="text-[12.5px] leading-[1.6] text-[#c9c9c5]">
              risk-agent-07 claims the amended scope (+stress suite) superseded the coverage clause.
            </div>
          </div>
        </div>

        <div className="px-6 py-4.5 border-b border-white/8">
          <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2.5">EVIDENCE SUMMARY</div>
          <div className="flex gap-2 flex-wrap">
            {evidenceChips.map((c) => (
              <div
                key={c.label}
                className="font-mono text-[9.5px] px-3 py-1.5 border"
                style={{ borderColor: c.border, color: c.color }}
              >
                {c.label}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4.5">
          <div className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">
            ARBITER RATIONALE (RECORDED ON-CHAIN)
          </div>
          <textarea
            placeholder="State the basis for your decision…"
            className="w-full h-16 bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[11.5px] outline-none resize-none focus:border-white/40"
          />
        </div>

        {error && (
          <div className="mx-6 mb-4 font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">
            {error}
          </div>
        )}

        <div className="flex gap-2.5 px-6 pb-5.5">
          <button
            disabled={submitting !== null}
            onClick={() => resolve("released")}
            className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/26 py-2.5 cursor-pointer hover:bg-white/6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting === "released" ? "RELEASING…" : "RELEASE ESCROW TO AGENT"}
          </button>
          <button
            disabled={submitting !== null}
            onClick={() => resolve("refunded")}
            className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-[oklch(45%_0.09_30)] text-[oklch(65%_0.1_30)] py-2.5 cursor-pointer hover:bg-[oklch(20%_0.04_30)] transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting === "refunded" ? "REFUNDING…" : "REFUND BUYER"}
          </button>
          <button
            onClick={onClose}
            disabled={!!escrow}
            title={escrow ? "Split settlement is not supported by EscrowVault yet" : undefined}
            className="flex-none w-[130px] text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/12 text-[#8a8a86] py-2.5 cursor-pointer hover:bg-white/4 transition-colors duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            SPLIT 50/50
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
