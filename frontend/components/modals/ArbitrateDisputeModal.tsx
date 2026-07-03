"use client";

import { ModalOverlay } from "./ModalOverlay";

const evidenceChips = [
  { label: "SCHEMA PASS", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "COVERAGE FAIL 91.2%", color: "oklch(65% 0.1 30)", border: "oklch(40% 0.08 30)" },
  { label: "SIGNATURE PASS", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "SLA PASS 38s", color: "#9a9a96", border: "rgba(255,255,255,0.12)" },
  { label: "ESCROW $12,400 FROZEN", color: "oklch(78% 0.07 245)", border: "oklch(55% 0.08 245)" },
];

// TODO: wire actions to POST /admin/override-settlement (release/refund) and /admin/dispute

export function ArbitrateDisputeModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[680px] bg-graphite border border-[oklch(35%_0.06_30)]">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[oklch(65%_0.1_30)]">
              DISPUTE ARBITRATION · #C-8841
            </div>
            <div className="text-[18px] font-extrabold mt-1">risk-agent-07 ↔ exec-agent-02</div>
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

        <div className="flex gap-2.5 px-6 pb-5.5">
          <button
            onClick={onClose}
            className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/26 py-2.5 cursor-pointer hover:bg-white/6 transition-colors duration-150"
          >
            RELEASE ESCROW TO AGENT
          </button>
          <button
            onClick={onClose}
            className="flex-1 text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-[oklch(45%_0.09_30)] text-[oklch(65%_0.1_30)] py-2.5 cursor-pointer hover:bg-[oklch(20%_0.04_30)] transition-colors duration-150"
          >
            REFUND BUYER
          </button>
          <button
            onClick={onClose}
            className="flex-none w-[130px] text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/12 text-[#8a8a86] py-2.5 cursor-pointer hover:bg-white/4 transition-colors duration-150"
          >
            SPLIT 50/50
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
