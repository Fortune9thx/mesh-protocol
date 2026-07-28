"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { explorerTxUrl } from "@/lib/consensus";

const serif = { fontFamily: "var(--font-serif-display)" } as const;

export type SuccessAction = {
  label: string;
  onClick: () => void;
  primary?: boolean;
};

// A dedicated confirmation for every completed protocol action. Never close a
// modal and leave the user guessing: show what happened, the on-chain proof,
// and the next steps.
export function SuccessScreen({
  title,
  facts,
  hash,
  actions,
}: {
  title: string;
  facts: [string, string][];
  hash?: string;
  actions: SuccessAction[];
}) {
  const [copied, setCopied] = useState(false);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="px-6 py-6">
      <div className="mb-5 flex items-center gap-3">
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 18 }}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[--mesh-blue] text-[15px] text-white"
        >
          ✓
        </motion.span>
        <div className="text-[22px] font-light" style={serif}>{title}</div>
      </div>

      <div className="mb-5 rounded-lg border border-[#212127] bg-[#0C0C0E] p-4">
        {facts.map(([k, v]) => (
          <div key={k} className="flex justify-between border-t border-[#191920] py-2 text-[12.5px] first:border-t-0">
            <span className="text-[#6B6B74]">{k}</span>
            <span className="max-w-[60%] truncate text-right font-mono text-[11.5px] text-[--mesh-white]">{v}</span>
          </div>
        ))}
      </div>

      {hash && (
        <div className="mb-5 flex items-center justify-between rounded-lg border border-[#191920] bg-[#0C0C0E] px-4 py-2.5">
          <span className="font-mono text-[11px] text-[#6B6B74]">{hash.slice(0, 12)}…{hash.slice(-8)}</span>
          <div className="flex gap-3">
            <button
              onClick={() => {
                navigator.clipboard?.writeText(hash);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="cursor-pointer font-mono text-[11px] text-[#6B6B74] hover:text-[#A8A7A1]"
            >
              {copied ? "copied" : "copy"}
            </button>
            <a href={explorerTxUrl(hash)} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[11px] text-[--mesh-blue]">
              explorer ↗
            </a>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        {actions.map((a) => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`cursor-pointer rounded-lg px-4 py-2.5 text-[12.5px] font-semibold transition-colors ${
              a.primary
                ? "bg-[--mesh-blue] text-white"
                : "border border-[#2E2E38] bg-[#18181C] text-[--mesh-white] hover:bg-[#1e1e24]"
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
