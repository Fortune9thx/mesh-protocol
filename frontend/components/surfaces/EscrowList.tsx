"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useWallet } from "@/lib/WalletProvider";
import { openEscrowDispute, submitDelivery, releaseEscrow, refundEscrow } from "@/lib/api";

const short = (s: string) => (s && s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

const statusTone: Record<string, string> = {
  locked: "text-[--mesh-blue]",
  disputed: "text-[--mesh-red]",
  released: "text-emerald-400",
  refunded: "text-[#D9A13B]",
};

/**
 * Lists the connected wallet's escrows and provides the dispute entry point.
 * A party to a locked escrow can open a dispute (stating their case), which
 * routes to the Chamber for validator-consensus resolution.
 */
type Action = "dispute" | "delivery";

export function EscrowList() {
  const { all, refetch } = useDisputedEscrows();
  const { address } = useWallet();
  const router = useRouter();
  const [openFor, setOpenFor] = useState<{ id: string; action: Action } | null>(null);
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mine = useMemo(() => {
    if (!address) return [];
    const a = address.toLowerCase();
    return all.filter((e) => e.payer?.toLowerCase() === a || e.payee?.toLowerCase() === a);
  }, [all, address]);

  if (!address || mine.length === 0) return null;

  const submitDispute = async (escrowId: string) => {
    if (!evidence.trim()) return;
    setBusy(escrowId);
    setError(null);
    const r = await openEscrowDispute(escrowId, evidence.trim());
    setBusy(null);
    if (r.ok) {
      setOpenFor(null);
      setEvidence("");
      router.push(`/chamber?escrow=${escrowId}`);
    } else {
      setError(r.error ?? "Could not open dispute. Only a party to the escrow may dispute.");
    }
  };

  const submitDeliveryProof = async (escrowId: string) => {
    if (!evidence.trim()) return;
    setBusy(escrowId);
    setError(null);
    const r = await submitDelivery(escrowId, evidence.trim());
    setBusy(null);
    if (r.ok) {
      setOpenFor(null);
      setEvidence("");
      await refetch();
    } else {
      setError(r.error ?? "Could not submit delivery evidence.");
    }
  };

  const doRelease = async (escrowId: string) => {
    setBusy(escrowId);
    setError(null);
    const r = await releaseEscrow(escrowId);
    setBusy(null);
    if (r.ok) {
      await refetch();
    } else {
      setError(r.error ?? "Release failed. Delivery evidence must be submitted first.");
    }
  };

  const doRefund = async (escrowId: string) => {
    setBusy(escrowId);
    setError(null);
    const r = await refundEscrow(escrowId);
    setBusy(null);
    if (r.ok) {
      await refetch();
    } else {
      setError(r.error ?? "Refund failed.");
    }
  };

  return (
    <div className="rounded-xl border border-[#212127] bg-[#131316] p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-semibold text-[#A8A7A1]">Your Escrows</h3>
        <span className="font-mono text-[10px] tracking-[0.12em] text-[#6B6B74]">{mine.length}</span>
      </div>
      <div className="space-y-2">
        {mine.map((e) => {
          const role = e.payer?.toLowerCase() === address.toLowerCase() ? "payer" : "payee";
          const counter = role === "payer" ? e.payee : e.payer;
          return (
            <div key={e.escrow_id} className="rounded-lg border border-[#191920] bg-[#0C0C0E] p-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[13px]">{e.amount.toFixed(2)} GEN</span>
                  <span className="ml-2 text-[11.5px] text-[#6B6B74]">
                    {role === "payer" ? "to" : "from"} {short(counter)}
                  </span>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-[0.1em] ${statusTone[e.status] ?? "text-[#6B6B74]"}`}>
                  {e.status}{e.verdict ? ` · ${e.verdict}` : ""}
                </span>
              </div>

              {e.status === "locked" && (
                <div className="mt-2.5">
                  {openFor?.id === e.escrow_id ? (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <textarea
                          value={evidence}
                          onChange={(ev) => setEvidence(ev.target.value)}
                          rows={2}
                          placeholder={
                            openFor.action === "delivery"
                              ? "Describe or link the completed work — this is stored immutably on-chain…"
                              : "State your case for the validators…"
                          }
                          className="w-full resize-none rounded-md border border-[#26262C] bg-[#131316] p-2.5 text-[12.5px] outline-none focus:border-[--mesh-red]"
                        />
                        {error && <div className="mt-1.5 text-[11px] text-[--mesh-red]">{error}</div>}
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() =>
                              openFor.action === "delivery"
                                ? submitDeliveryProof(e.escrow_id)
                                : submitDispute(e.escrow_id)
                            }
                            disabled={busy === e.escrow_id || !evidence.trim()}
                            className="cursor-pointer rounded-md bg-[--mesh-red] px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-40"
                          >
                            {busy === e.escrow_id
                              ? "Submitting…"
                              : openFor.action === "delivery"
                                ? "Submit delivery proof"
                                : "Open dispute"}
                          </button>
                          <button onClick={() => { setOpenFor(null); setError(null); }}
                            className="cursor-pointer rounded-md border border-[#26262C] px-3 py-1.5 text-[11.5px] text-[#6B6B74]">
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      {role === "payee" && !e.has_delivery && (
                        <button onClick={() => { setOpenFor({ id: e.escrow_id, action: "delivery" }); setEvidence(""); }}
                          className="cursor-pointer text-[11.5px] font-semibold text-[--mesh-blue] underline decoration-[#26262C] underline-offset-2">
                          Submit delivery proof
                        </button>
                      )}
                      {role === "payee" && e.has_delivery && (
                        <span className="text-[11.5px] text-emerald-400">Delivery proof submitted</span>
                      )}
                      {role === "payer" && (
                        <button onClick={() => doRelease(e.escrow_id)} disabled={busy === e.escrow_id || !e.has_delivery}
                          title={!e.has_delivery ? "Waiting on the provider's delivery proof" : undefined}
                          className="cursor-pointer text-[11.5px] font-semibold text-emerald-400 underline decoration-[#26262C] underline-offset-2 disabled:opacity-40 disabled:cursor-not-allowed">
                          {busy === e.escrow_id ? "Releasing…" : "Release funds"}
                        </button>
                      )}
                      {role === "payee" && (
                        <button onClick={() => doRefund(e.escrow_id)} disabled={busy === e.escrow_id}
                          className="cursor-pointer text-[11.5px] text-[#D9A13B] underline decoration-[#26262C] underline-offset-2 disabled:opacity-40">
                          Refund requester
                        </button>
                      )}
                      <button onClick={() => { setOpenFor({ id: e.escrow_id, action: "dispute" }); setEvidence(""); }}
                        className="cursor-pointer text-[11.5px] text-[#6B6B74] underline decoration-[#26262C] underline-offset-2 hover:text-[--mesh-red]">
                        Open dispute
                      </button>
                    </div>
                  )}
                  {error && openFor === null && (
                    <div className="mt-1.5 text-[11px] text-[--mesh-red]">{error}</div>
                  )}
                </div>
              )}

              {e.status === "disputed" && (
                <button onClick={() => router.push(`/chamber?escrow=${e.escrow_id}`)}
                  className="mt-2 cursor-pointer text-[11.5px] font-semibold text-[--mesh-red]">
                  Enter Chamber →
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
