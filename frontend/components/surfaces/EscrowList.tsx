"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useWallet } from "@/lib/WalletProvider";
import { openEscrowDispute, submitDelivery, releaseEscrow, refundEscrow, reportReputationFromEscrow } from "@/lib/api";
import { humanizeError } from "@/lib/errors";

const short = (s: string) => (s && s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

const statusTone: Record<string, string> = {
  locked: "text-[--mesh-blue]",
  disputed: "text-[--mesh-red]",
  released: "text-emerald-400",
  refunded: "text-[#D9A13B]",
};

// Left-border color communicates what's happening at a glance, before
// reading any text -- awaiting delivery (blue), ready to settle (emerald),
// disputed (red), or a plain settled record (neutral).
const borderTone: Record<string, string> = {
  awaiting_delivery: "border-l-[--mesh-blue]",
  ready: "border-l-emerald-500",
  disputed: "border-l-[--mesh-red]",
  settled: "border-l-[#26262C]",
};

type Action = "dispute" | "delivery";

/**
 * Lists the connected wallet's escrows. For a locked escrow, surfaces ONE
 * primary action per role (provider: submit delivery; payer: release once
 * delivery exists) so the thing to do is obvious at a glance, with dispute
 * always available as a secondary path.
 */
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
      setError(humanizeError(r.error));
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
      setError(humanizeError(r.error));
    }
  };

  const doRelease = async (escrowId: string) => {
    setBusy(escrowId);
    setError(null);
    const r = await releaseEscrow(escrowId);
    setBusy(null);
    if (r.ok) {
      await refetch();
      // Best-effort, permissionless reputation update -- the ledger verifies
      // this itself via view() calls, so a failure here (e.g. someone else
      // already reported it) doesn't affect the release that already succeeded.
      reportReputationFromEscrow(escrowId).catch(() => {});
    } else {
      setError(humanizeError(r.error));
    }
  };

  const doRefund = async (escrowId: string) => {
    setBusy(escrowId);
    setError(null);
    const r = await refundEscrow(escrowId);
    setBusy(null);
    if (r.ok) {
      await refetch();
      reportReputationFromEscrow(escrowId).catch(() => {});
    } else {
      setError(humanizeError(r.error));
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
          const isOpen = openFor?.id === e.escrow_id;

          const border =
            e.status === "disputed" ? borderTone.disputed
            : e.status !== "locked" ? borderTone.settled
            : role === "payer" && e.has_delivery ? borderTone.ready
            : borderTone.awaiting_delivery;

          return (
            <div key={e.escrow_id} className={`rounded-lg border border-l-2 border-[#191920] bg-[#0C0C0E] p-3.5 ${border}`}>
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-[13px] tabular-nums">{e.amount.toFixed(2)} GEN</span>
                  <span className="ml-2 text-[11.5px] text-[#6B6B74]">
                    {role === "payer" ? "to" : "from"} {short(counter)}
                  </span>
                </div>
                <span className={`font-mono text-[10px] uppercase tracking-[0.1em] ${statusTone[e.status] ?? "text-[#6B6B74]"}`}>
                  {e.status}{e.verdict ? ` · ${e.verdict}` : ""}
                </span>
              </div>

              {e.status === "locked" && (
                <div className="mt-3">
                  {isOpen ? (
                    <AnimatePresence>
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                        <textarea
                          value={evidence}
                          onChange={(ev) => setEvidence(ev.target.value)}
                          rows={2}
                          autoFocus
                          placeholder={
                            openFor.action === "delivery"
                              ? "Describe or link the completed work — stored immutably on-chain…"
                              : "State your case for the validators…"
                          }
                          className="w-full resize-none rounded-md border border-[#26262C] bg-[#131316] p-2.5 text-[12.5px] outline-none focus:border-[--mesh-red]"
                        />
                        {error && <div className="mt-1.5 text-[11px] leading-relaxed text-[--mesh-red]">{error}</div>}
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
                    <>
                      <div className="flex items-center justify-between gap-3">
                        {/* Primary, role-specific action */}
                        {role === "payee" && !e.has_delivery && (
                          <button onClick={() => { setOpenFor({ id: e.escrow_id, action: "delivery" }); setEvidence(""); }}
                            className="cursor-pointer rounded-md bg-[--mesh-blue] px-3.5 py-1.5 text-[12px] font-semibold text-white">
                            Submit delivery proof
                          </button>
                        )}
                        {role === "payee" && e.has_delivery && (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-emerald-400">
                            <span className="h-[5px] w-[5px] rounded-full bg-emerald-400" />
                            Delivery proof submitted — awaiting release
                          </span>
                        )}
                        {role === "payer" && e.has_delivery && (
                          <button onClick={() => doRelease(e.escrow_id)} disabled={busy === e.escrow_id}
                            className="cursor-pointer rounded-md bg-emerald-500 px-3.5 py-1.5 text-[12px] font-semibold text-black disabled:opacity-50">
                            {busy === e.escrow_id ? "Releasing…" : "Release funds"}
                          </button>
                        )}
                        {role === "payer" && !e.has_delivery && (
                          <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[#6B6B74]">
                            <span className="h-[5px] w-[5px] rounded-full bg-[--mesh-blue] animate-pulse" />
                            Waiting on the provider's delivery proof
                          </span>
                        )}

                        {/* Secondary actions */}
                        <div className="flex shrink-0 items-center gap-3">
                          {role === "payee" && (
                            <button onClick={() => doRefund(e.escrow_id)} disabled={busy === e.escrow_id}
                              className="cursor-pointer text-[11.5px] text-[#D9A13B] underline decoration-[#26262C] underline-offset-2 disabled:opacity-40">
                              Refund
                            </button>
                          )}
                          <button onClick={() => { setOpenFor({ id: e.escrow_id, action: "dispute" }); setEvidence(""); }}
                            className="cursor-pointer text-[11.5px] text-[#6B6B74] underline decoration-[#26262C] underline-offset-2 hover:text-[--mesh-red]">
                            Dispute
                          </button>
                        </div>
                      </div>
                      {error && (
                        <div className="mt-1.5 text-[11px] leading-relaxed text-[--mesh-red]">{error}</div>
                      )}
                    </>
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
