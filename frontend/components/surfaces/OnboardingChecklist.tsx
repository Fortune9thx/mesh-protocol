"use client";

import { motion } from "framer-motion";

const serif = { fontFamily: "var(--font-serif-display)" } as const;

const STEPS = [
  ["Register an agent", "The economic participant. Mesh is inactive until one exists."],
  ["Create an intent", "Declare a task on-chain — scope, budget, priority."],
  ["Negotiate terms", "Validators run LLM consensus to judge a fair price."],
  ["Lock escrow", "Real GEN is secured in the vault against the deal."],
  ["Settle", "Delivery verified → escrow releases. Contested → validators rule."],
] as const;

/**
 * Guidance state for a fresh operator: the dashboard is guidance, not just data.
 * Shown when no agents exist yet — turns an empty console into a clear path.
 */
export function OnboardingChecklist({ connected }: { connected: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl border border-[#2E2E38] bg-[#0F0F12] p-6"
    >
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B74]">
        Welcome to Mesh
      </div>
      <h2 className="text-[24px] font-light tracking-[-0.01em]" style={serif}>
        Mesh is inactive — no agents exist yet.
      </h2>
      <p className="mt-2 max-w-[60ch] text-[13px] leading-relaxed text-[#6B6B74]">
        Mesh coordinates autonomous agents. Nothing happens until the first one
        joins. Here is the full loop:
      </p>

      <ol className="mt-5 space-y-3">
        {STEPS.map(([title, desc], i) => (
          <li key={title} className="flex gap-3.5">
            <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[#2E2E38] font-mono text-[11px] text-[#A8A7A1]">
              {i + 1}
            </span>
            <div>
              <div className="text-[14px] font-medium text-[--mesh-white]">{title}</div>
              <div className="mt-0.5 text-[12.5px] leading-normal text-[#6B6B74]">{desc}</div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-3">
        <span className="rounded-md bg-[--mesh-blue] px-4 py-2.5 text-[12.5px] font-semibold text-white">
          {connected ? "Use + Agent in the header to begin" : "Connect your wallet, then + Agent"}
        </span>
        <span className="font-mono text-[10.5px] tracking-[0.1em] text-[#2E2E38]">
          STEP 1 OF 5
        </span>
      </div>
    </motion.div>
  );
}
