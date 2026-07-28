import type { TraceStep } from "@/lib/mockData";

const kindColor = (kind: TraceStep["kind"]) =>
  kind === "DISPUTE" ? "oklch(65% 0.1 30)" : kind === "DELIVER" ? "oklch(78% 0.07 245)" : "#8a8a86";

const dotColor = (kind: TraceStep["kind"]) => {
  const c = kindColor(kind);
  return c === "#8a8a86" ? "rgba(255,255,255,0.4)" : c;
};

const kindBorder = (kind: TraceStep["kind"]) => (kind === "DISPUTE" ? "oklch(40% 0.08 30)" : "rgba(255,255,255,0.14)");

export function ReasoningTraceRow({ step }: { step: TraceStep }) {
  return (
    <div className="flex gap-4 py-[11px] border-b border-white/5 border-l border-white/12 pl-5 relative">
      <div className="absolute left-[-3.5px] top-4 w-[6px] h-[6px]" style={{ background: dotColor(step.kind) }} />
      <div className="font-mono text-[10px] text-[#5f5f5b] flex-none w-[58px] pt-[2px]">{step.time}</div>
      <div
        className="font-mono text-[9px] tracking-[0.1em] uppercase border px-2 py-[3px] h-fit flex-none"
        style={{ color: kindColor(step.kind), borderColor: kindBorder(step.kind) }}
      >
        {step.kind}
      </div>
      <div className="text-[12.5px] leading-[1.55] text-[#c9c9c5]">{step.text}</div>
    </div>
  );
}
