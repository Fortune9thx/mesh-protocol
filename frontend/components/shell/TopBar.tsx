import Image from "next/image";
import type { View } from "@/lib/types";
import { useWallet } from "@/lib/WalletProvider";
import { shortenAddress } from "@/lib/wallet";

const surfaceTitles: Record<View, string> = {
  overview: "PROTOCOL OVERVIEW",
  console: "HUMAN CONTROL CONSOLE",
  workbench: "AGENT WORKBENCH",
};

export function TopBar({ view }: { view: View }) {
  const { address, connecting, connect, onCorrectChain } = useWallet();
  const signingIn = connecting;

  return (
    <div className="h-[72px] flex-none flex items-center justify-between px-8 border-b border-white/9 bg-graphite">
      <div className="flex items-center gap-4.5">
        <Image src="/mesh-logo.png" alt="Mesh" width={30} height={30} className="object-contain flex-none" />
        <div className="font-extrabold text-[21px] tracking-[-0.02em]">MESH</div>
        <div className="w-px h-5 bg-white/12" />
        <div className="font-mono text-[11px] tracking-[0.14em] uppercase text-[#8a8a86]">{surfaceTitles[view]}</div>
      </div>

      <div className="flex items-center gap-6 font-mono text-[11px] tracking-[0.06em] text-[#b7b7b3]">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5" style={{ background: "oklch(78% 0.07 245)", animation: "breathe 2.4s ease-in-out infinite" }} />
          <span>47 AGENTS ONLINE</span>
        </div>
        <div className="w-px h-3.5 bg-white/10" />
        <div>UPTIME 99.98%</div>
        <div className="w-px h-3.5 bg-white/10" />
        <div>SETTLED (24H) $1.84M</div>
      </div>

      <div className="flex items-center gap-4">
        {address ? (
          <div
            className="font-mono text-[11px] tracking-[0.08em] uppercase border px-3.5 py-1.5"
            style={{
              color: onCorrectChain ? "#8a8a86" : "oklch(65% 0.1 30)",
              borderColor: onCorrectChain ? "rgba(255,255,255,0.14)" : "oklch(40% 0.08 30)",
            }}
            title={onCorrectChain ? "GenLayer Bradbury Testnet" : "Wrong network — expected Bradbury"}
          >
            {onCorrectChain ? "BRADBURY" : "WRONG NETWORK"}
          </div>
        ) : (
          <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#8a8a86] border border-white/14 px-3.5 py-1.5">
            BRADBURY
          </div>
        )}
        <button
          onClick={connect}
          disabled={connecting || signingIn}
          className="h-8 px-3 flex items-center gap-2 rounded-sm bg-[#1c1c1c] border border-white/14 font-mono text-[10.5px] tracking-[0.06em] uppercase text-bone cursor-pointer hover:bg-white/6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
        >
          {signingIn ? "SIGNING…" : connecting ? "CONNECTING…" : address ? shortenAddress(address) : "CONNECT WALLET"}
        </button>
      </div>
    </div>
  );
}
