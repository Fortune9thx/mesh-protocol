"use client";

import { useEffect, useMemo, useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { proposeNegotiation, lockEscrow } from "@/lib/api";
import { fetchNegotiationData, fetchAllIntents, fetchAllAgents } from "@/lib/contracts";
import { ProtocolNarrative } from "@/components/surfaces/ProtocolNarrative";
import { useWallet } from "@/lib/WalletProvider";
import { humanizeError } from "@/lib/errors";
import type { Agent, Intent } from "@/lib/types";

type Step = "negotiate" | "lock" | "done";

const verdictLabel = (v: string): string => {
  const s = (v || "").toLowerCase();
  if (s === "accepted") return "Validators reached consensus: price is fair — deal accepted.";
  if (s.startsWith("counter_")) {
    const wei = s.split("_")[1] || "0";
    const gen = Number(wei) / 1e18;
    return `Validators counter-propose ${gen.toLocaleString()} GEN as a fairer price.`;
  }
  if (s === "rejected") return "Validators rejected the proposal as unfair or the task as invalid.";
  return "Awaiting validator LLM consensus — verdict appears here once the tx finalizes (~30s).";
};

export function ProposeNegotiationModal({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const { address } = useWallet();
  const [step, setStep] = useState<Step>("negotiate");
  const [intents, setIntents] = useState<Intent[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  const [intentId, setIntentId] = useState("");
  const [providerAgentId, setProviderAgentId] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");

  const [negId, setNegId] = useState<string>("");
  const [agreedPriceWei, setAgreedPriceWei] = useState<string>("0");
  const [negStatus, setNegStatus] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchAllIntents(), fetchAllAgents()])
      .then(([i, a]) => {
        setIntents((i as Intent[]).filter((x) => x.status === "pending" || x.status === "matching" || x.status === "negotiating"));
        setAgents((a as Agent[]).filter((x) => x.status === "active"));
      })
      .finally(() => setLoadingOptions(false));
  }, []);

  const selectedIntent = useMemo(() => intents.find((i) => i.intent_id === intentId), [intents, intentId]);
  const selectedProvider = useMemo(() => agents.find((a) => a.agent_id === providerAgentId), [agents, providerAgentId]);

  const requesterMismatch =
    !!selectedIntent && !!address && selectedIntent.requester.toLowerCase() !== address.toLowerCase();

  const canPropose =
    !!intentId && !!providerAgentId && !!price && Number(price) > 0 && !!description.trim() && !requesterMismatch;

  const handlePropose = async () => {
    if (!selectedIntent || !selectedProvider) return;
    setSubmitting(true);
    setError(null);
    const id = `neg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await proposeNegotiation({
      negotiationId: id,
      intentId,
      requester: address ?? "",
      provider: providerAgentId,
      proposedPrice: Number(price),
      intentDescription: description.trim(),
    });
    if (result.ok) {
      setNegId(id);
      setStep("lock");
      try {
        const neg = await fetchNegotiationData(id);
        setNegStatus(neg?.status ?? "");
        setAgreedPriceWei(neg?.agreed_price_wei ?? "0");
        setVerdict(verdictLabel(neg?.ai_verdict ?? neg?.status ?? ""));
      } catch {
        setVerdict(verdictLabel(""));
      }
    } else {
      setError(humanizeError(result.error) || "Failed to propose negotiation");
    }
    setSubmitting(false);
  };

  const handleLock = async () => {
    if (!selectedProvider) return;
    setSubmitting(true);
    setError(null);
    const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await lockEscrow({
      escrowId,
      payee: selectedProvider.owner_wallet,
      intentId,
      negotiationId: negId,
      amountWei: agreedPriceWei,
    });
    setSubmitting(false);
    if (result.ok) {
      setStep("done");
      onDone?.();
    } else {
      setError(humanizeError(result.error) || "Failed to lock escrow");
    }
  };

  const agreedGen = Number(agreedPriceWei) / 1e18;
  const canLock = negStatus === "accepted" && Number(agreedPriceWei) > 0;

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[560px] bg-graphite border border-white/18">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8a8a86]">
              {step === "negotiate" ? "NEGOTIATION ENGINE" : step === "lock" ? "ESCROW VAULT" : "COMPLETE"}
            </div>
            <div className="text-[18px] font-extrabold mt-1">
              {step === "negotiate" ? "Propose Negotiation" : step === "lock" ? "Lock GEN in Escrow" : "Negotiation Submitted"}
            </div>
          </div>
          <button onClick={onClose} className="font-mono text-[13px] text-[#5f5f5b] hover:text-bone px-2 py-1 cursor-pointer">✕</button>
        </div>

        {step === "done" ? (
          <div className="px-6 py-10 text-center">
            <div className="text-[28px] font-light mb-3" style={{ fontFamily: "var(--font-serif-display)" }}>All done.</div>
            <div className="font-mono text-[11px] text-[#8a8a86] leading-[1.8]">
              Negotiation submitted for AI evaluation.<br />
              GEN locked in escrow on-chain.<br />
              Monitor the Network surface for the verdict.
            </div>
            <button onClick={onClose} className="mt-6 font-mono text-[10px] tracking-[0.08em] uppercase px-5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors">
              CLOSE
            </button>
          </div>
        ) : step === "negotiate" && submitting ? (
          <div className="px-6 py-8 min-h-[240px]">
            <ProtocolNarrative stageKey="negotiate" running />
            <p className="mt-4 text-[11.5px] text-[#6B6B74]">
              GenLayer validators are running an LLM to judge whether this price is fair — consensus, not a hardcoded rule. ~15–30s.
            </p>
          </div>
        ) : step === "negotiate" ? (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              {loadingOptions ? (
                <div className="text-[12px] text-[#6B6B74]">Loading intents and agents from chain…</div>
              ) : (
                <>
                  <div>
                    <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">INTENT</div>
                    <select value={intentId} onChange={(e) => setIntentId(e.target.value)}
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40">
                      <option value="">Select an open intent…</option>
                      {intents.map((i) => (
                        <option key={i.intent_id} value={i.intent_id}>
                          {i.title || i.intent_id} — {i.budget.toLocaleString()} GEN budget
                        </option>
                      ))}
                    </select>
                    {intents.length === 0 && (
                      <div className="text-[11px] text-[#5f5f5b] mt-1.5">No open intents. Submit one first.</div>
                    )}
                    {requesterMismatch && (
                      <div className="text-[11px] text-[oklch(65%_0.1_30)] mt-1.5">
                        This intent's registered requester is a different wallet. Only that wallet can lock escrow against it later.
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">PROVIDER AGENT</div>
                    <select value={providerAgentId} onChange={(e) => setProviderAgentId(e.target.value)}
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40">
                      <option value="">Select a registered active agent…</option>
                      {agents.map((a) => (
                        <option key={a.agent_id} value={a.agent_id}>
                          {a.name} — {a.category} · {a.base_price.toLocaleString()} GEN base
                        </option>
                      ))}
                    </select>
                    {agents.length === 0 && (
                      <div className="text-[11px] text-[#5f5f5b] mt-1.5">No active agents. Register one first.</div>
                    )}
                    <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">
                      Escrow can only ever pay this agent's registered owner wallet — never a manually typed address.
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">PROPOSED PRICE (GEN)</div>
                    <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="250"
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40" />
                    <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">
                      GenLayer validators run LLM consensus to evaluate fairness.
                    </div>
                  </div>

                  <div>
                    <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">TASK DESCRIPTION</div>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                      placeholder="Describe what the provider will deliver…"
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40 resize-none" />
                    <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">
                      Used by the AI arbitrator. Be specific about deliverables.
                    </div>
                  </div>
                </>
              )}
              {error && (
                <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">{error}</div>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-white/8">
              <button disabled={submitting || !canPropose} onClick={handlePropose}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-5.5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors disabled:opacity-50 disabled:cursor-wait">
                {submitting ? "CONFIRMING ON GENLAYER… (~30s)" : "PROPOSE & EVALUATE →"}
              </button>
            </div>
          </>
        ) : submitting ? (
          <div className="px-6 py-8 min-h-[240px]">
            <ProtocolNarrative stageKey="escrow" running />
            <p className="mt-4 text-[11.5px] text-[#6B6B74]">Locking your GEN into the on-chain escrow vault. ~15–30s.</p>
          </div>
        ) : (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              {verdict && (
                <div className="font-mono text-[10.5px] text-[oklch(78%_0.07_245)] border border-[oklch(55%_0.08_245)] px-3.5 py-2.5 leading-[1.6]">
                  {verdict}
                </div>
              )}
              <div className="font-mono text-[10.5px] text-[#8a8a86] leading-[1.7]">
                Negotiation ID: <span className="text-bone">{negId}</span>
              </div>

              {canLock ? (
                <div>
                  <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">AMOUNT TO LOCK (GEN)</div>
                  <div className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[20px] font-semibold">
                    {agreedGen.toLocaleString()}
                  </div>
                  <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">
                    This is the negotiation's validator-accepted price and cannot be edited — EscrowVault requires the
                    locked amount to match it exactly. This GEN transfers from your wallet on-chain.
                  </div>
                </div>
              ) : (
                <div className="font-mono text-[11.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5 leading-[1.6]">
                  This negotiation is not in an "accepted" state ({negStatus || "pending"}), so escrow cannot be locked
                  against it yet.
                </div>
              )}

              {error && (
                <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">{error}</div>
              )}
            </div>
            <div className="flex justify-between px-6 py-4 border-t border-white/8">
              <button onClick={() => { setStep("negotiate"); setError(null); }}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-4.5 py-2.5 border border-white/12 cursor-pointer hover:bg-white/4 text-[#8a8a86]">
                ← BACK
              </button>
              <button disabled={submitting || !canLock} onClick={handleLock}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-5.5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors disabled:opacity-50 disabled:cursor-wait">
                {submitting ? "CONFIRMING ON GENLAYER… (~30s)" : "LOCK GEN IN ESCROW →"}
              </button>
            </div>
          </>
        )}
      </div>
    </ModalOverlay>
  );
}
