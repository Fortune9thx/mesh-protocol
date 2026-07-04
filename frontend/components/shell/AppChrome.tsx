"use client";

// Product chrome — sans-dominant, serif wordmark only, mono for wallet.
// One nav, four surfaces. (DESIGN phase 2)

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/WalletProvider";

const NAV = [
  { href: "/console", label: "Command" },
  { href: "/network", label: "Network" },
  { href: "/agents", label: "Agents" },
  { href: "/chamber", label: "Chamber" },
];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

export function AppChrome() {
  const pathname = usePathname();
  const { address, connect, disconnect, signingIn } = useWallet();

  return (
    <header className="flex h-14 items-center justify-between border-b border-[#212127] px-7">
      <div className="flex items-center gap-7">
        <Link href="/" className="text-[17px] text-[--mesh-white]" style={{ fontFamily: "var(--font-serif-display)" }}>
          Mesh
        </Link>
        <nav className="flex gap-1">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}
              className={`rounded-md px-3.5 py-1.5 font-sans text-[13px] font-medium transition-colors ${
                pathname.startsWith(n.href) ? "bg-[#18181C] text-[--mesh-white]" : "text-[#6B6B74] hover:text-[#A8A7A1]"
              }`}>
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-2 font-sans text-[12px] text-[#6B6B74]">
          <span className="h-[7px] w-[7px] rounded-full bg-[--mesh-blue] shadow-[0_0_8px_rgba(46,92,255,0.7)]" />
          Protocol nominal
        </span>
        {address ? (
          <button onClick={disconnect}
            className="rounded-md border border-[#212127] px-3 py-1.5 font-mono text-[11px] text-[#A8A7A1] hover:border-[#2A2A30]">
            {short(address)}
          </button>
        ) : (
          <button onClick={connect}
            className="rounded-md border border-[#212127] px-3 py-1.5 font-mono text-[11px] text-[--mesh-white] hover:border-[#2A2A30]">
            {signingIn ? "SIGNING…" : "CONNECT"}
          </button>
        )}
      </div>
    </header>
  );
}
