"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AppChrome } from "@/components/shell/AppChrome";
import { ProtocolStatusStrip } from "@/components/surfaces/ProtocolStatusStrip";
import { ConsensusPanel } from "@/components/surfaces/ConsensusPanel";
import { HumanSilhouette } from "@/components/surfaces/HumanSilhouette";
import { useDisputedEscrows } from "@/lib/useDisputedEscrows";
import { useWallet } from "@/lib/WalletProvider";
import { fetchDispute } from "@/lib/contracts";
import { submitEscrowEvidence, resolveDispute } from "@/lib/api";

const serif = { fontFamily: "var(--font-serif-display)" } as const;
const short = (s: string) => (s && s.length > 12 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s);

function ChamberInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { escrows, refetch } = useDisputedEscrows();
  const { address } = useWallet();

  const [evidence, setEvidence] = useState("");
  const [dispute, setDispute] = useState<{ payer_evidence: string; payee_evidence: string; verdict: string } | null>(null);
  const [busy, setBusy] = useState<null | "evidence" | "resolve">(null);
  const [error, setError] = useState<string | null>(null);
  const [resolveHash, setResolveHash] = useState<string | null>(null);

  const wanted = params.get("escrow");
  const escrow = useMemo(
    () => escrows.find((e) => e.escrow_id === wanted) ?? escrows[0] ?? null,
    [escrows, wanted],
  );

  useEffect(() => {
    if (!escrow) return;
    fetchDispute(escrow.escrow_id).then(setDispute);
  }, [escrow]);

  const role = useMemo(() => {
    if (!escrow || !address) return "observer" as const;
    const a = address.toLowerCase();
    if (escrow.payer?.toLowerCase() === a) return "payer" as const;
    if (escrow.payee?.toLowerCase() === a) return "payee" as const;
    return "observer" as const;
  }, [escrow, address]);

  const addEvidence = async () => {
    if (!escrow || !evidence.trim()) return;
    setBusy("evidence");
    setError(null);
    const r = await submitEscrowEvidence(escrow.escrow_id, evidence.trim());
    setBusy(null);
    if (r.ok) {
      setEvidence("");
      setDispute(await fetchDispute(escrow.escrow_id));
    } else {
      setError(r.error ?? "Could not submit evidence. Only a party to this escrow may submit.");
    }
  };

  const requestConsensus = async () => {
    if (!escrow) return;
    setBusy("resolve");
    setError(null);
    const r = await resolveDispute(escrow.escrow_id);
    setBusy(null);
    if (r.ok && r.data && (r.data as { hash?: string }).hash) {
      setResolveHash((r.data as { hash: string }).hash);
      setDispute(await fetchDispute(escrow.escrow_id));
      await refetch();
    } else {
      setError(r.error ?? "Resolution failed. Only a party or arbitrator may trigger consensus.");
    }
  };

  // ── Empty state ──
  if (!escrow) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-24 text-center">
        <div className="relative mb-8 h-48 w-32 opacity-10">
          <HumanSilhouette opacity={1} />
        </div>
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-[28px] font-light italic text-[#A8A7A1]" style={serif}>The chamber is empty.</p>
          <p className="mt-3 text-[13px] text-[#6B6B74]">No open disputes. The mesh is resolving itself.</p>
          <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#2E2E38]">
            GENLAYER VALIDATORS · STANDING BY
          </p>
        </motion.div>
      </div>
    );
  }

  const e = escrow;
  const resolved = e.status === "released" || e.status === "refunded" || !!e.verdict;

  return (
    <div className="flex flex-1 flex-col"
      style={{ background: "radial-gradient(ellipse 70% 55% at 50% 38%, #131318 0%, #08080A 78%)" }}>

      <div className="pt-11 text-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
          <div className="font-mono text-[10px] tracking-[0.18em] text-[--mesh-red]">
            ● DISPUTE · ESCROW #{e.escrow_id.slice(0, 8).toUpperCase()} · GENLAYER ARBITRATION
          </div>
          <h1 className="mt-3 text-[42px] font-light tracking-[-0.015em]" style={serif}>
            {short(e.payee)} <em className="text-[#6B6B74]">vs</em> {short(e.payer)}
          </h1>
          <div className="mt-2.5 font-mono text-[13px] tracking-[0.1em] text-[#A8A7A1]">
            {e.amount.toFixed(2)} GEN IN ESCROW · {e.intent_id.toUpperCase()}
          </div>
          <p className="mx-auto mt-3 max-w-[540px] text-[12.5px] leading-relaxed text-[#6B6B74]">
            This dispute is not settled by an operator. Both parties state their case, and
            <span className="text-[#A8A7A1]"> GenLayer validators reach LLM consensus</span> on the outcome.
          </p>
        </motion.div>
      </div>

      {/* the two cases */}
      <div className="mx-auto mt-7 grid w-full max-w-[1100px] flex-1 grid-cols-1 gap-5 px-7 lg:grid-cols-2">
        {/* provider / payee */}
        <div className="h-fit rounded-2xl border border-[#212127] border-t-2 border-t-[--mesh-blue] bg-[rgba(19,19,22,0.75)] p-6">
          <div className="text-[22px]" style={serif}>{short(e.payee)}</div>
          <div className="mb-4 mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B74]">
            Provider · Payee {role === "payee" && "· You"}
          </div>
          <p className="min-h-[60px] text-[14px] leading-relaxed text-[#A8A7A1]">
            {dispute?.payee_evidence || <span className="text-[#6B6B74] italic">No statement submitted yet.</span>}
          </p>
        </div>

        {/* requester / payer */}
        <div className="h-fit rounded-2xl border border-[#212127] border-t-2 border-t-[#D9A13B] bg-[rgba(19,19,22,0.75)] p-6">
          <div className="text-[22px]" style={serif}>{short(e.payer)}</div>
          <div className="mb-4 mt-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B74]">
            Requester · Payer {role === "payer" && "· You"}
          </div>
          <p className="min-h-[60px] text-[14px] leading-relaxed text-[#A8A7A1]">
            {dispute?.payer_evidence || <span className="text-[#6B6B74] italic">No statement submitted yet.</span>}
          </p>
        </div>
      </div>

      {/* controls */}
      <div className="mx-auto w-full max-w-[1100px] px-7 pb-9 pt-5">
        {error && <div className="mb-4 text-center text-[12.5px] text-[--mesh-red]">{error}</div>}

        <AnimatePresence mode="wait">
          {resolveHash ? (
            <motion.div key="consensus" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <ConsensusPanel
                hash={resolveHash}
                title="Arbitration Consensus"
                verdict={dispute?.verdict || e.verdict}
              />
              <div className="mt-4 text-center">
                <button onClick={() => router.push("/console")}
                  className="cursor-pointer border-b border-[#26262C] pb-0.5 text-[12px] text-[#6B6B74] hover:text-[#A8A7A1]">
                  Return to Command
                </button>
              </div>
            </motion.div>
          ) : resolved ? (
            <motion.div key="resolved" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <p className="text-[24px] font-light" style={serif}>
                Validators ruled: {(dispute?.verdict || e.verdict) === "release" ? "provider paid" : "requester refunded"}.
              </p>
              <button onClick={() => router.push("/console")}
                className="mt-4 cursor-pointer border-b border-[#26262C] pb-0.5 text-[12px] text-[#6B6B74] hover:text-[#A8A7A1]">
                Return to Command
              </button>
            </motion.div>
          ) : (
            <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {role !== "observer" ? (
                <div className="mb-4 rounded-xl border border-[#212127] bg-[#131316] p-5">
                  <label className="mb-2 block text-[12px] font-semibold text-[#A8A7A1]">
                    Your statement to the validators ({role === "payer" ? "requester" : "provider"})
                  </label>
                  <textarea
                    value={evidence}
                    onChange={(ev) => setEvidence(ev.target.value)}
                    rows={3}
                    placeholder="State your case: what was agreed, what was delivered, why funds should go your way…"
                    className="w-full resize-none rounded-lg border border-[#26262C] bg-[#0C0C0E] p-3 text-[13px] text-[--mesh-white] outline-none focus:border-[--mesh-blue]"
                  />
                  <button onClick={addEvidence} disabled={busy === "evidence" || !evidence.trim()}
                    className="mt-3 cursor-pointer rounded-lg border border-[#2E2E38] bg-[#18181C] px-4 py-2 text-[12.5px] font-semibold disabled:opacity-40">
                    {busy === "evidence" ? "Submitting…" : "Submit statement"}
                  </button>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-[#191920] bg-[#0C0C0E] px-5 py-3 text-center text-[12.5px] text-[#6B6B74]">
                  You are observing this dispute. Only the two parties may submit statements.
                </div>
              )}

              <button onClick={requestConsensus} disabled={busy === "resolve"}
                className="w-full cursor-pointer rounded-lg bg-[--mesh-blue] py-4 text-[13px] font-semibold tracking-[0.04em] text-white transition-opacity disabled:opacity-50">
                {busy === "resolve"
                  ? "GENLAYER VALIDATORS DELIBERATING… (~30s)"
                  : "REQUEST VALIDATOR CONSENSUS"}
              </button>
              <p className="mt-2.5 text-center text-[11.5px] text-[#6B6B74]">
                Neither party chooses the outcome. GenLayer validators weigh both statements and agree on release or refund.
              </p>
              <div className="mt-4 text-center">
                <button onClick={() => router.push("/console")}
                  className="cursor-pointer border-b border-[#26262C] pb-0.5 text-[12px] text-[#6B6B74] hover:text-[#A8A7A1]">
                  Defer — return to Command
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function ArbitrationChamber() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0C0C0E] font-sans text-[14px] text-[--mesh-white]">
      <AppChrome />
      <ProtocolStatusStrip />
      <Suspense>
        <ChamberInner />
      </Suspense>
    </div>
  );
}
