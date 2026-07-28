"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getConsensus, explorerTxUrl, type ConsensusData } from "@/lib/consensus";

const serif = { fontFamily: "var(--font-serif-display)" } as const;

/**
 * Renders the REAL GenLayer validator consensus behind a transaction.
 * Pass a tx hash; the panel fetches the receipt and shows the actual vote
 * counts, agreement, and confidence. While loading it narrates the round
 * forming — never a bare spinner.
 */
export function ConsensusPanel({
  hash,
  title = "Validator Consensus",
  verdict,
}: {
  hash: string;
  title?: string;
  verdict?: string; // optional contract-decided outcome (e.g. "release" | "refund")
}) {
  const [data, setData] = useState<ConsensusData | null>(null);
  const [phase, setPhase] = useState(0);

  const phases = [
    "Broadcasting to validator set…",
    "Validators evaluating…",
    "Votes committing…",
    "Consensus forming…",
  ];

  useEffect(() => {
    let active = true;
    const tick = setInterval(
      () => setPhase((p) => (p + 1) % phases.length),
      1400,
    );
    getConsensus(hash).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  return (
    <div className="rounded-xl border border-[#212127] bg-[#0F0F12] p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-[6px] w-[6px] animate-pulse rounded-full bg-[--mesh-blue]" />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#A8A7A1]">
            {title}
          </h3>
        </div>
        <span className="font-mono text-[10px] tracking-[0.1em] text-[#6B6B74]">
          GENLAYER · CHAIN 4221
        </span>
      </div>

      {!data ? (
        <div className="py-6 text-center">
          <motion.div
            key={phase}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-[12px] tracking-[0.06em] text-[#6B6B74]"
          >
            {phases[phase]}
          </motion.div>
          <div className="mx-auto mt-4 flex max-w-[200px] justify-center gap-1.5">
            {[0, 1, 2, 3, 4].map((i) => (
              <motion.span
                key={i}
                className="h-6 w-1.5 rounded-full bg-[#26262C]"
                animate={{ backgroundColor: ["#26262C", "#2E5CFF", "#26262C"] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        </div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* validator agreement bar */}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="text-[40px] font-light leading-none" style={serif}>
                {data.confidence}
                <span className="ml-1 text-[15px] text-[#6B6B74]">% confidence</span>
              </div>
              <div className="mt-1.5 font-mono text-[11px] tracking-[0.06em] text-[#6B6B74]">
                {data.agreements}/{data.validators} VALIDATORS IN AGREEMENT
              </div>
            </div>
            {verdict && (
              <div className="text-right">
                <div className="font-mono text-[10px] tracking-[0.12em] text-[#6B6B74]">
                  OUTCOME
                </div>
                <div
                  className={`text-[20px] font-light ${
                    verdict === "release" || verdict === "released"
                      ? "text-[--mesh-blue]"
                      : "text-[#D9A13B]"
                  }`}
                  style={serif}
                >
                  {verdict === "release" || verdict === "released"
                    ? "Funds released"
                    : verdict === "refund" || verdict === "refunded"
                      ? "Funds refunded"
                      : verdict}
                </div>
              </div>
            )}
          </div>

          {/* validator dots */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {Array.from({ length: data.validators }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.05 }}
                className={`h-2.5 w-2.5 rounded-full ${
                  i < data.agreements ? "bg-[--mesh-blue]" : "bg-[#2E2E38]"
                }`}
                title={i < data.agreements ? "Agreed" : "Did not agree"}
              />
            ))}
          </div>

          {/* consensus facts */}
          <div className="grid grid-cols-3 gap-3 border-t border-[#212127] pt-3.5">
            {[
              ["Committed", `${data.committed}/${data.validators}`],
              ["Revealed", `${data.revealed}/${data.validators}`],
              ["Rounds", String(data.rounds)],
            ].map(([k, v]) => (
              <div key={k}>
                <div className="font-mono text-[16px]">{v}</div>
                <div className="mt-0.5 text-[10.5px] uppercase tracking-[0.08em] text-[#6B6B74]">
                  {k}
                </div>
              </div>
            ))}
          </div>

          <a
            href={explorerTxUrl(data.hash)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex items-center justify-between border-t border-[#212127] pt-3 font-mono text-[11px] text-[#6B6B74] hover:text-[#A8A7A1]"
          >
            <span>{data.hash.slice(0, 10)}…{data.hash.slice(-8)}</span>
            <span>View on explorer ↗</span>
          </a>
        </motion.div>
      )}
    </div>
  );
}
