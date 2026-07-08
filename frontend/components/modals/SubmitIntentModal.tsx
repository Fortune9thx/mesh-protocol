"use client";

import { useState } from "react";
import { ModalOverlay } from "./ModalOverlay";
import { submitIntent } from "@/lib/api";

export function SubmitIntentModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted?: () => void }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: string) => setValues((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const deadline = values.deadline
      ? new Date(values.deadline)
      : new Date(Date.now() + 7 * 86400 * 1000);

    const result = await submitIntent({
      title: values.title || "Untitled Intent",
      description: values.description || "",
      requirements: (values.requirements || "").split(",").map((r) => r.trim()).filter(Boolean),
      priority: (values.priority as "low" | "medium" | "high" | "critical") || "medium",
      budget: Number(values.budget?.replace(/,/g, "")) || 0,
      deadline,
    });
    setSubmitting(false);
    if (result.ok) {
      onSubmitted?.();
      onClose();
    } else {
      setError(result.error ?? "Failed to submit intent");
    }
  };

  return (
    <ModalOverlay onClose={onClose}>
      <div className="w-[540px] bg-graphite border border-white/18">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/8">
          <div>
            <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8a8a86]">INTENT REGISTRY</div>
            <div className="text-[18px] font-extrabold mt-1">Submit Intent</div>
          </div>
          <button onClick={onClose} className="font-mono text-[13px] text-[#5f5f5b] hover:text-bone px-2 py-1 cursor-pointer">✕</button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {[
            { k: "title", label: "INTENT TITLE", placeholder: "e.g. Risk analysis for DeFi protocol Q3", hint: "A clear summary of the work required." },
            { k: "description", label: "DESCRIPTION", placeholder: "Describe the task in full detail…", hint: "Stored on-chain. Agents use this for evaluation and negotiation.", textarea: true },
            { k: "requirements", label: "REQUIREMENTS", placeholder: "risk_scoring, market_intelligence", hint: "Comma-separated capability tags. Matched against agent profiles." },
            { k: "budget", label: "BUDGET (GEN)", placeholder: "500", hint: "Max GEN you are willing to pay. Locked in escrow after negotiation." },
          ].map(({ k, label, placeholder, hint, textarea }) => (
            <div key={k}>
              <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">{label}</div>
              {textarea ? (
                <textarea
                  value={values[k] ?? ""}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40 resize-none"
                />
              ) : (
                <input
                  value={values[k] ?? ""}
                  onChange={(e) => set(k, e.target.value)}
                  placeholder={placeholder}
                  className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40"
                />
              )}
              <div className="text-[11px] text-[#5f5f5b] mt-1.5 leading-[1.5]">{hint}</div>
            </div>
          ))}

          <div>
            <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2">PRIORITY</div>
            <select
              value={values.priority ?? "medium"}
              onChange={(e) => set("priority", e.target.value)}
              className="w-full bg-obsidian border border-white/14 px-3.5 py-2.5 text-bone font-mono text-[12px] outline-none focus:border-white/40"
            >
              {["low", "medium", "high", "critical"].map((p) => (
                <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
              ))}
            </select>
          </div>

          {error && (
            <div className="font-mono text-[10.5px] text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3.5 py-2.5">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-white/8">
          <button
            disabled={submitting}
            onClick={handleSubmit}
            className="font-mono text-[10px] tracking-[0.08em] uppercase px-5.5 py-2.5 border border-white/30 cursor-pointer hover:bg-white/6 transition-colors duration-150 disabled:opacity-50 disabled:cursor-wait"
          >
            {submitting ? "SUBMITTING…" : "SUBMIT INTENT →"}
          </button>
        </div>
      </div>
    </ModalOverlay>
  );
}
