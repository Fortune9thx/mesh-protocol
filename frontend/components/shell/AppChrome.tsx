"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWallet } from "@/lib/WalletProvider";
import { RegisterAgentModal } from "@/components/modals/RegisterAgentModal";
import { SubmitIntentModal } from "@/components/modals/SubmitIntentModal";
import { ProposeNegotiationModal } from "@/components/modals/ProposeNegotiationModal";

const NAV = [
  { href: "/console", label: "Command" },
  { href: "/network", label: "Network" },
  { href: "/agents", label: "Agents" },
  { href: "/chamber", label: "Chamber" },
];

type ActiveModal = "register" | "intent" | "negotiation" | null;

export function AppChrome() {
  const pathname = usePathname();
  const { address } = useWallet();
  const [modal, setModal] = useState<ActiveModal>(null);

  return (
    <>
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

        <div className="flex items-center gap-2.5">
          {address && (
            <>
              <button
                onClick={() => setModal("register")}
                className="rounded-md border border-[#212127] px-3 py-1.5 font-mono text-[11px] text-[#6B6B74] hover:text-[--mesh-white] hover:border-[#2A2A30] transition-colors"
              >
                + Agent
              </button>
              <button
                onClick={() => setModal("intent")}
                className="rounded-md border border-[#212127] px-3 py-1.5 font-mono text-[11px] text-[#6B6B74] hover:text-[--mesh-white] hover:border-[#2A2A30] transition-colors"
              >
                + Intent
              </button>
              <button
                onClick={() => setModal("negotiation")}
                className="rounded-md border border-[rgba(46,92,255,0.45)] bg-[rgba(46,92,255,0.08)] px-3 py-1.5 font-mono text-[11px] text-[#7EA0FF] hover:bg-[rgba(46,92,255,0.14)] transition-colors"
              >
                Negotiate + Escrow
              </button>
            </>
          )}

          <span className="flex items-center gap-2 font-sans text-[12px] text-[#6B6B74] ml-1">
            <span className="h-[7px] w-[7px] rounded-full bg-[--mesh-blue] shadow-[0_0_8px_rgba(46,92,255,0.7)]" />
            Bradbury
          </span>

          <ConnectButton
            chainStatus="none"
            showBalance={false}
            accountStatus="address"
          />
        </div>
      </header>

      {modal === "register" && (
        <RegisterAgentModal onClose={() => setModal(null)} />
      )}
      {modal === "intent" && (
        <SubmitIntentModal onClose={() => setModal(null)} />
      )}
      {modal === "negotiation" && (
        <ProposeNegotiationModal onClose={() => setModal(null)} />
      )}
    </>
  );
}
