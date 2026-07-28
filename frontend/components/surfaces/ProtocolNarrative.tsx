"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Replaces generic spinners during protocol actions. Each stage narrates what
// Mesh/GenLayer is actually doing. Stages advance on a timer tuned to the
// ~15-30s validator consensus window; the final stage holds until the real
// transaction resolves, so the narrative never claims completion early.

export const NARRATIVES: Record<string, string[]> = {
  register: [
    "Connecting to AgentRegistry…",
    "Broadcasting agent identity…",
    "Validator consensus forming…",
    "Writing agent to chain…",
  ],
  intent: [
    "Publishing intent…",
    "Indexing requirements…",
    "Making opportunity discoverable…",
    "Committing intent on-chain…",
  ],
  negotiate: [
    "Submitting proposal…",
    "Validators running LLM evaluation…",
    "Weighing economic fairness…",
    "Consensus verdict forming…",
  ],
  escrow: [
    "Securing funds…",
    "Escrow contract confirming…",
    "Locking GEN in the vault…",
    "Settlement guarantee establishing…",
  ],
  dispute: [
    "Submitting dispute…",
    "Assembling evidence package…",
    "Validators reviewing both cases…",
    "Arbitration consensus forming…",
  ],
  settle: [
    "Verifying obligations…",
    "Validators calculating outcome…",
    "Settlement authorizing…",
    "Releasing funds…",
  ],
};

export function ProtocolNarrative({
  stageKey,
  stages,
  running,
}: {
  stageKey?: keyof typeof NARRATIVES;
  stages?: string[];
  running: boolean;
}) {
  const steps = stages ?? (stageKey ? NARRATIVES[stageKey] : []) ?? [];
  const [active, setActive] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!running) {
      setActive(0);
      return;
    }
    timer.current = setInterval(() => {
      // Advance through all but the last stage; hold the last until resolve.
      setActive((a) => Math.min(a + 1, steps.length - 1));
    }, 6000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, steps.length]);

  if (!running) return null;

  return (
    <div className="py-2">
      {steps.map((s, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <div key={s} className="flex items-center gap-3 py-1.5">
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border text-[9px] ${
                done
                  ? "border-[--mesh-blue] bg-[--mesh-blue] text-white"
                  : current
                    ? "border-[--mesh-blue] text-[--mesh-blue]"
                    : "border-[#2E2E38] text-transparent"
              }`}
            >
              {done ? "✓" : current ? "" : ""}
              {current && (
                <motion.span
                  className="absolute h-4 w-4 rounded-full border border-[--mesh-blue]"
                  animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                />
              )}
            </span>
            <AnimatePresence mode="wait">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: done ? 0.5 : current ? 1 : 0.3 }}
                className={`text-[12.5px] ${current ? "text-[--mesh-white]" : "text-[#6B6B74]"}`}
              >
                {s}
              </motion.span>
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
