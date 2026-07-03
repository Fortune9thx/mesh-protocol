export type ChipStatus = "active" | "negotiating" | "dispute" | "settled" | "paused" | "collapsed";

const chipConfig: Record<ChipStatus, { label: string; color: string; border: string; dot: string; animate?: boolean }> = {
  active: { label: "ACTIVE", color: "#9a9a96", border: "rgba(255,255,255,0.2)", dot: "oklch(78% 0.07 245)", animate: true },
  negotiating: { label: "NEGOTIATING", color: "#9a9a96", border: "rgba(255,255,255,0.2)", dot: "rgba(255,255,255,0.55)", animate: true },
  dispute: { label: "DISPUTE", color: "oklch(65% 0.1 30)", border: "oklch(40% 0.08 30)", dot: "oklch(55% 0.1 30)" },
  settled: { label: "SETTLED", color: "oklch(78% 0.07 245)", border: "oklch(55% 0.08 245)", dot: "oklch(78% 0.07 245)" },
  paused: { label: "PAUSED", color: "#5f5f5b", border: "rgba(255,255,255,0.1)", dot: "#5f5f5b" },
  collapsed: { label: "COLLAPSED", color: "#4a4a46", border: "rgba(255,255,255,0.07)", dot: "#3a3a36" },
};

export function StatusChip({ status, label }: { status: ChipStatus; label?: string }) {
  const c = chipConfig[status];
  return (
    <div
      className="inline-flex items-center gap-[7px] font-mono text-[9.5px] tracking-[0.1em] uppercase px-3 py-[5px] border"
      style={{ borderColor: c.border, color: c.color }}
    >
      <div
        className="w-[5px] h-[5px]"
        style={{
          background: c.dot,
          animation: c.animate ? "breathe 2.4s ease-in-out infinite" : undefined,
        }}
      />
      {label ?? c.label}
    </div>
  );
}
