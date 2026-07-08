"use client";

import { useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { proposeNegotiation, lockEscrow } from "@/lib/api";

type Step = "negotiate" | "lock" | "done";

export function ProposeNegotiationModal({ onClose, onDone }: { onClose: () => void; onDone?: () => void }) {
  const [step, setStep] = useState<Step>("negotiate");
  const [values, setValues] = useState<Record<string, string>>({});
  const [negId, setNegId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<string | null>(null);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const handlePropose = async () => {
    setSubmitting(true);
    setError(null);
    const id = `neg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await proposeNegotiation({
      negotiationId: id,
      intentId: values.intentId || "",
      requester: values.requester || "",
      provider: values.provider || "",
      proposedPrice: Number(values.price?.replace(/,/g, "")) || 0,
      intentDescription: values.description || "",
    });
    setSubmitting(false);
    if (result.ok) {
      setNegId(id);
      setVerdict("Pending AI evaluation — check back in ~30s after the tx is accepted.");
      setStep("lock");
    } else {
      setError(result.error ?? "Failed to propose negotiation");
    }
  };

  const handleLock = async () => {
    setSubmitting(true);
    setError(null);
    const escrowId = `escrow-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const result = await lockEscrow({
      escrowId,
      payee: values.provider || "",
      intentId: values.intentId || "",
      negotiationId: negId,
      amountGen: Number(values.lockAmount?.replace(/,/g, "")) || Number(values.price?.replace(/,/g, "")) || 0,
    });
    setSubmitting(false);
    if (result.ok) {
      setStep("done");
      onDone?.();
    } else {
      setError(result.error ?? "Failed to lock escrow");
    }
  };

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
        ) : step === "negotiate" ? (
          <>
            <div className="px-6 py-5 flex flex-col gap-4">
              {[
                { k: "intentId", label: "INTENT ID", placeholder: "intent-…", hint: "The on-chain intent ID this negotiation is for." },
                { k: "requester", label: "REQUESTER AGENT ID", placeholder: "agent-…", hint: "Agent representing the buyer side." },
                { k: "provider", label: "PROVIDER AGENT ID / WALLET", placeholder: "agent-… or 0x…", hint: "Agent or address that will deliver the work." },
                { k: "price", label: "PROPOSED PRICE (GEN)", placeholder: "250", hint: "GenLayer validators run LLM consensus to evaluate fairness." },
                { k: "description", label: "TASK DESCRIPTION", placeholder: "Describe what the provider will deliver…", hint: "Used by the AI arbitrator. Be specific about deliverables.", textarea: true },
              ].map(({ k, label, placeholder, hint, textarea }) => (
                <div key={k}>
                  <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">{label}</div>
                  {textarea ? (
                    <textarea value={values[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder} rows={3}
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40 resize-none" />
                  ) : (
                    <input value={values[k] ?? ""} onChange={(e) => set(k, e.target.value)} placeholder={placeholder}
                      className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40" />
                  )}
                  <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">{hint}</div>
                </div>
              ))}
              {error && (
                <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">{error}</div>
              )}
            </div>
            <div className="flex justify-end px-6 py-4 border-t border-white/8">
              <button disabled={submitting} onClick={handlePropose}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-5.5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors disabled:opacity-50 disabled:cursor-wait">
                {submitting ? "CONFIRMING ON GENLAYER… (~30s)" : "PROPOSE & EVALUATE →"}
              </button>
            </div>
          </>
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
              <div>
                <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">AMOUNT TO LOCK (GEN)</div>
                <input value={values.lockAmount ?? values.price ?? ""} onChange={(e) => set("lockAmount", e.target.value)}
                  placeholder={values.price || "250"}
                  className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[20px] font-semibold outline-none focus:border-white/40" />
                <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">
                  This GEN is transferred from your wallet into on-chain escrow. You will sign a MetaMask transaction.
                </div>
              </div>
              {error && (
                <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">{error}</div>
              )}
            </div>
            <div className="flex justify-between px-6 py-4 border-t border-white/8">
              <button onClick={() => { setStep("negotiate"); setError(null); }}
                className="font-mono text-[10px] tracking-[0.08em] uppercase px-4.5 py-2.5 border border-white/12 cursor-pointer hover:bg-white/4 text-[#8a8a86]">
                ← BACK
              </button>
              <button disabled={submitting} onClick={handleLock}
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
