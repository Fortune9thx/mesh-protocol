"use client";

import { useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { DEMO_WALLET, registerAgent } from "@/lib/api";

interface Field {
  key: string;
  label: string;
  placeholder: string;
  hint: string;
}

const stepTitles: Record<number, string> = { 1: "Agent Identity", 2: "Stake & Bond", 3: "Permissions & Limits" };

const stepFields: Record<number, Field[]> = {
  1: [
    { key: "name", label: "AGENT NAME", placeholder: "e.g. research-agent-16", hint: "Lowercase, hyphenated. Must be unique in the mesh registry." },
    { key: "category", label: "CATEGORY", placeholder: "e.g. research, risk, content", hint: "Used for capability matching against intents." },
    { key: "operator", label: "OPERATOR", placeholder: "yourname.eth", hint: "The human or org accountable for this agent." },
  ],
  2: [
    { key: "base_price", label: "BASE PRICE (GEN)", placeholder: "5,000", hint: "Slashable stake. Higher bond seeds a higher initial trust score." },
    { key: "owner_wallet", label: "AGENT WALLET", placeholder: "0x…", hint: "The wallet this agent settles from. Must be fresh or operator-linked." },
  ],
  3: [
    { key: "spending_limit", label: "DAILY SPEND CAP (GEN)", placeholder: "10,000", hint: "Rolling 24h limit across all contracts." },
    { key: "capabilities", label: "CAPABILITIES", placeholder: "market_intelligence, risk_scoring", hint: "Comma-separated. Matched against intent requirements." },
  ],
};

export function RegisterAgentModal({ onClose, onRegistered }: { onClose: () => void; onRegistered?: () => void }) {
  const [step, setStep] = useState(1);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bar = (n: number) => (step >= n ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.1)");

  const setField = (key: string, value: string) => setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await registerAgent({
      name: values.name || "unnamed-agent",
      owner_wallet: values.owner_wallet || DEMO_WALLET,
      category: values.category || "general",
      capabilities: (values.capabilities || "general").split(",").map((c) => c.trim()).filter(Boolean),
      pricing_model: "per_task",
      base_price: Number(values.base_price?.replace(/,/g, "")) || 0,
      availability: true,
      autonomy_level: 1,
      spending_limit: Number(values.spending_limit?.replace(/,/g, "")) || 1000,
    });
    setSubmitting(false);
    if (result.ok) {
      onRegistered?.();
      onClose();
    } else {
      setError(result.error ?? "Registration failed");
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[560px] bg-graphite border border-white/18">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8a8a86]">
              REGISTER AGENT · STEP {step} OF 3
            </div>
            <div className="text-[18px] font-extrabold mt-1">{stepTitles[step]}</div>
          </div>
          <button onClick={onClose} className="font-mono text-[13px] text-[#5f5f5b] hover:text-bone px-2 py-1 cursor-pointer">
            ✕
          </button>
        </div>

        <div className="flex gap-1 px-6 pt-4">
          <div className="h-[2px] flex-1" style={{ background: bar(1) }} />
          <div className="h-[2px] flex-1" style={{ background: bar(2) }} />
          <div className="h-[2px] flex-1" style={{ background: bar(3) }} />
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 min-h-[260px]">
          {stepFields[step].map((f) => (
            <div key={f.key}>
              <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">{f.label}</div>
              <input
                value={values[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                placeholder={f.placeholder}
                className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40"
              />
              <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">{f.hint}</div>
            </div>
          ))}
          {error && (
            <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-between px-6 py-4.5 border-t border-white/8">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-4.5 py-2.5 border border-white/12 cursor-pointer hover:bg-white/4 transition-colors duration-150"
            style={{ color: step === 1 ? "#3a3a36" : "#8a8a86" }}
          >
            ← BACK
          </button>
          <button
            disabled={submitting}
            onClick={() => (step < 3 ? setStep(step + 1) : handleSubmit())}
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-5.5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {step === 3 ? (submitting ? "SUBMITTING…" : "SUBMIT REGISTRATION →") : "CONTINUE →"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
