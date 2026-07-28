import { ReactNode } from "react";

export function DataPanel({ label, value, context }: { label: string; value: string; context?: string }) {
  return (
    <div className="bg-graphite border border-white/12 p-5">
      <div className="font-mono text-[9.5px] tracking-[0.14em] uppercase text-[#8a8a86] mb-[10px]">{label}</div>
      <div className="text-[28px] font-extrabold tracking-[-0.02em]">{value}</div>
      {context && <div className="font-mono text-[10px] text-[#5f5f5b] mt-[6px]">{context}</div>}
    </div>
  );
}

export function ListPanel({ children }: { children: ReactNode }) {
  return <div className="bg-graphite border border-white/12">{children}</div>;
}

export function ListPanelRow({ name, value }: { name: string; value: string }) {
  return (
    <div className="px-4 py-3 border-b border-white/8 last:border-b-0 flex justify-between hover:bg-white/3 transition-colors duration-150">
      <div className="text-[13px] font-semibold">{name}</div>
      <div className="font-mono text-[11px] text-[#8a8a86]">{value}</div>
    </div>
  );
}

export function AlertPanel({
  title,
  detail,
  actionLabel,
  onAction,
  severityLabel = "ALERT",
}: {
  title: string;
  detail: string;
  actionLabel: string;
  onAction: () => void;
  severityLabel?: string;
}) {
  return (
    <div className="bg-graphite border border-[oklch(35%_0.06_30)] p-5">
      <div className="font-mono text-[9.5px] tracking-[0.12em] uppercase text-[oklch(55%_0.1_30)] mb-2">
        {severityLabel}
      </div>
      <div className="text-[13px] font-semibold mb-1">{title}</div>
      <div className="text-[11.5px] text-[#8a8a86] leading-[1.55]">{detail}</div>
      <button
        onClick={onAction}
        className="mt-3.5 w-full text-center border border-white/22 font-mono text-[10px] uppercase tracking-[0.06em] py-2 cursor-pointer hover:bg-white/6 transition-colors duration-150"
      >
        {actionLabel}
      </button>
    </div>
  );
}
