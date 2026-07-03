import Image from "next/image";
import type { View } from "@/lib/types";

const surfaceTitles: Record<View, string> = {
  overview: "PROTOCOL OVERVIEW",
  console: "HUMAN CONTROL CONSOLE",
  workbench: "AGENT WORKBENCH",
};

export function TopBar({ view }: { view: View }) {
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
        <div className="font-mono text-[11px] tracking-[0.08em] uppercase text-[#8a8a86] border border-white/14 px-3.5 py-1.5">
          MAINNET
        </div>
        <div className="w-8 h-8 rounded-sm bg-[#1c1c1c] border border-white/14" />
      </div>
    </div>
  );
}
