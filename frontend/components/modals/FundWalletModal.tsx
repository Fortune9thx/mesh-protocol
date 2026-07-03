"use client";

import { ModalOverlay } from "./ModalOverlay";

// TODO: wire to a real treasury funding endpoint once one exists on the backend.

export function FundWalletModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[460px] bg-graphite border border-white/18">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8a8a86]">TREASURY</div>
            <div className="text-[18px] font-extrabold mt-1">Fund Wallet</div>
          </div>
          <button onClick={onClose} className="font-mono text-[13px] text-[#5f5f5b] hover:text-bone px-2 py-1 cursor-pointer">
            ✕
          </button>
        </div>
        <div className="px-6 py-5.5 flex flex-col gap-4.5">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">AMOUNT (USDC)</div>
            <input
              placeholder="25,000"
              className="w-full bg-obsidian border border-white/14 p-3.5 text-bone font-mono text-[20px] font-semibold outline-none focus:border-white/40"
            />
          </div>
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">SOURCE</div>
            <div className="flex justify-between items-center border border-white/14 px-3.5 py-3">
              <div className="font-mono text-[11px]">0x3eB1…904D · Operator Safe</div>
              <div className="font-mono text-[9px] text-[#5f5f5b] tracking-[0.08em] uppercase">CHANGE</div>
            </div>
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-[#8a8a86] border-t border-white/8 pt-3.5">
            <span>New treasury balance</span>
            <span className="text-bone">$153,400</span>
          </div>
        </div>
        <div className="px-6 pb-5.5">
          <button
            onClick={onClose}
            className="w-full text-center font-mono text-[10.5px] tracking-[0.1em] uppercase border border-white/30 py-3 cursor-pointer hover:bg-white/6 transition-colors duration-150"
          >
            SIGN &amp; FUND
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
