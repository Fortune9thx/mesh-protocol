"use client";

import { useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { useWallet } from "@/lib/WalletProvider";
import { shortenAddress } from "@/lib/wallet";

// Treasury address funds settle to. Not yet a deployed contract — once
// EscrowVault (or a dedicated treasury contract) is live on-chain, point
// this at it instead of a plain wallet address.
const TREASURY_ADDRESS = process.env.NEXT_PUBLIC_TREASURY_ADDRESS ?? "";

export function FundWalletModal({ onClose }: { onClose: () => void }) {
  const { address, connect, connecting, sendGen, onCorrectChain } = useWallet();
  const [amount, setAmount] = useState("");
  const [sending, setSending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSend = !!address && onCorrectChain && !!TREASURY_ADDRESS && !!amount && !sending;

  const handleSubmit = async () => {
    if (!address) {
      await connect();
      return;
    }
    if (!TREASURY_ADDRESS) {
      setError("No treasury address configured (NEXT_PUBLIC_TREASURY_ADDRESS) — nothing to fund yet.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const hash = await sendGen(TREASURY_ADDRESS, amount);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaction failed or was rejected");
    } finally {
      setSending(false);
    }
  };

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
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">AMOUNT (GEN)</div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="25,000"
              className="w-full bg-obsidian border border-white/14 p-3.5 text-bone font-mono text-[20px] font-semibold outline-none focus:border-white/40"
            />
          </div>
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">SOURCE</div>
            <div className="flex justify-between items-center border border-white/14 px-3.5 py-3">
              <div className="font-mono text-[11px]">
                {address ? `${shortenAddress(address)} · Connected Wallet` : "Not connected"}
              </div>
              {!address && (
                <button
                  onClick={connect}
                  disabled={connecting}
                  className="font-mono text-[9px] text-[#5f5f5b] tracking-[0.08em] uppercase hover:text-bone cursor-pointer"
                >
                  {connecting ? "CONNECTING…" : "CONNECT"}
                </button>
              )}
            </div>
          </div>
          <div className="flex justify-between font-mono text-[10.5px] text-[#8a8a86] border-t border-white/8 pt-3.5">
            <span>Destination</span>
            <span className="text-bone">{TREASURY_ADDRESS ? shortenAddress(TREASURY_ADDRESS) : "not configured"}</span>
          </div>
          {txHash && (
            <div className="font-mono text-[10.5px] text-[oklch(78%_0.07_245)] border border-[oklch(55%_0.08_245)] px-3.5 py-2.5 break-all">
              Sent — tx {txHash}
            </div>
          )}
          {error && (
            <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">
              {error}
            </div>
          )}
        </div>
        <div className="px-6 pb-5.5">
          <button
            onClick={handleSubmit}
            disabled={sending || (!!address && !canSend && !!TREASURY_ADDRESS)}
            className="w-full text-center font-mono text-[10.5px] tracking-[0.1em] uppercase border border-white/30 py-3 cursor-pointer hover:bg-white/6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {sending ? "SIGNING…" : address ? "SIGN & FUND" : "CONNECT WALLET"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
