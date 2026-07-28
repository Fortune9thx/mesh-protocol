import { profileMetrics, traceSteps, negotiationHistory, evidenceList, settlementProofs } from "@/lib/mockData";
import { ThinMetricBar } from "@/components/primitives/MetricBar";
import { ReasoningTraceRow } from "@/components/primitives/ReasoningTraceRow";

const metricColor: Record<(typeof profileMetrics)[number]["kind"], string> = {
  low: "oklch(55% 0.1 30)",
  neutral: "rgba(255,255,255,0.55)",
  positive: "oklch(78% 0.07 245)",
};

const outcomeColor: Record<(typeof negotiationHistory)[number]["outcome"], string> = {
  AGREED: "#9a9a96",
  DISPUTED: "oklch(65% 0.1 30)",
  SETTLED: "oklch(78% 0.07 245)",
};

export function WorkbenchSurface() {
  return (
    <div className="flex-1 flex min-w-0 bg-obsidian">
      {/* profile rail */}
      <div className="w-[320px] flex-none border-r border-white/9 p-6 flex flex-col gap-5 bg-graphite">
        <div>
          <div className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#8a8a86]">AGENT WORKBENCH</div>
          <div className="text-[24px] font-extrabold tracking-[-0.01em] mt-2">risk-agent-07</div>
          <div className="font-mono text-[10px] tracking-[0.08em] uppercase text-[#8a8a86] mt-1">SUB-AGENT · RISK SCORING</div>
        </div>

        <div className="inline-flex self-start font-mono text-[9.5px] tracking-[0.1em] uppercase text-[oklch(65%_0.1_30)] border border-[oklch(40%_0.08_30)] px-3 py-1.5">
          IN DISPUTE · #C-8841
        </div>

        <div className="flex flex-col gap-3.5">
          {profileMetrics.map((m) => (
            <ThinMetricBar key={m.label} label={m.label} value={m.value} percent={m.barWidth} color={metricColor[m.kind]} />
          ))}
        </div>

        <div className="border-t border-white/8 pt-4 font-mono text-[10px] leading-[2] text-[#8a8a86]">
          <div>MESH ID &nbsp;&nbsp;0x93fD…a21c</div>
          <div>REGISTERED &nbsp;&nbsp;2026-03-14</div>
          <div>OPERATOR &nbsp;&nbsp;quantrisk.eth</div>
          <div>CONTRACTS &nbsp;&nbsp;412 completed</div>
        </div>

        <div className="mt-auto flex flex-col gap-2">
          <button className="text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/24 py-2.5 cursor-pointer hover:bg-white/6 transition-colors duration-150">
            PAUSE AGENT
          </button>
          <button className="text-center font-mono text-[10px] tracking-[0.08em] uppercase border border-white/14 text-[#8a8a86] py-2.5 cursor-pointer hover:bg-white/4 transition-colors duration-150">
            REVOKE PERMISSIONS
          </button>
        </div>
      </div>

      {/* reasoning trace + negotiation history */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="px-7 pt-6 pb-3.5 border-b border-white/8 flex justify-between items-end">
          <div className="text-[16px] font-bold">Reasoning Trace</div>
          <div className="font-mono text-[10px] text-[#5f5f5b]">CONTRACT #C-8841 · 14:38–14:39 UTC</div>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5">
          {traceSteps.map((step, i) => (
            <ReasoningTraceRow key={i} step={step} />
          ))}
        </div>
        <div className="border-t border-white/8 px-7 py-4.5">
          <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-2.5">NEGOTIATION HISTORY</div>
          {negotiationHistory.map((h, i) => (
            <div
              key={i}
              className="grid gap-3.5 py-2 border-b border-white/5 last:border-b-0 text-[12px] items-center"
              style={{ gridTemplateColumns: "1.4fr 2fr 0.7fr 0.8fr" }}
            >
              <div>{h.party}</div>
              <div className="text-[#8a8a86] text-[11.5px]">{h.terms}</div>
              <div className="font-mono text-[11px]">{h.amount}</div>
              <div className="font-mono text-[9.5px] tracking-[0.08em] uppercase" style={{ color: outcomeColor[h.outcome] }}>
                {h.outcome}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* evidence panel */}
      <div className="w-[360px] flex-none border-l border-white/9 bg-graphite p-6 flex flex-col gap-6">
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-3">VERIFICATION EVIDENCE</div>
          {evidenceList.map((ev) => (
            <div key={ev.check} className="flex justify-between items-center px-3.5 py-2.5 border border-white/8 mb-1.5">
              <div className="text-[12.5px]">{ev.check}</div>
              <div
                className="font-mono text-[9.5px] tracking-[0.1em] uppercase"
                style={{ color: ev.pass ? "#9a9a96" : "oklch(65% 0.1 30)" }}
              >
                {ev.result}
              </div>
            </div>
          ))}
        </div>
        <div>
          <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[#8a8a86] mb-3">SETTLEMENT PROOFS</div>
          {settlementProofs.map((pr) => (
            <div key={pr.hash} className="py-2.5 border-b border-white/6 last:border-b-0">
              <div className="flex justify-between font-mono text-[10.5px]">
                <span className="text-[#c9c9c5]">{pr.hash}</span>
                <span>{pr.amount}</span>
              </div>
              <div className="font-mono text-[9.5px] text-[#5f5f5b] mt-[3px]">{pr.meta}</div>
            </div>
          ))}
        </div>
        <div className="mt-auto border border-white/12 p-4">
          <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[oklch(65%_0.1_30)] mb-2">
            DISPUTE RESOLUTION
          </div>
          <div className="text-[12px] leading-[1.5] text-[#c9c9c5]">
            Coverage check failed at 91.2% vs 95% spec. Human arbiter decision required.
          </div>
          <div className="flex gap-2 mt-3.5">
            <button className="flex-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase border border-white/24 py-2.5 cursor-pointer hover:bg-white/6 transition-colors duration-150">
              RELEASE ESCROW
            </button>
            <button className="flex-1 text-center font-mono text-[9.5px] tracking-[0.06em] uppercase border border-[oklch(45%_0.09_30)] text-[oklch(65%_0.1_30)] py-2.5 cursor-pointer hover:bg-[oklch(20%_0.04_30)] transition-colors duration-150">
              REFUND BUYER
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
