// Segmented 10-block metric bar — discrete resolution, not continuous.
// White blocks = healthy, rust = below threshold.

interface MetricBarProps {
  label: string;
  value: string;
  percent: number; // 0-100
  threshold?: number; // below this, filled blocks turn rust
  valueColor?: string;
}

export function MetricBar({ label, value, percent, threshold = 70, valueColor }: MetricBarProps) {
  const filledCount = Math.round(percent / 10);
  const isBad = percent < threshold;
  const color = valueColor ?? (isBad ? "oklch(55% 0.1 30)" : "rgba(255,255,255,0.6)");

  return (
    <div>
      <div className="flex justify-between font-mono text-[9.5px] tracking-[0.1em] uppercase text-[#8a8a86] mb-2">
        <span>{label}</span>
        <span style={{ color: valueColor ?? (isBad ? "oklch(65% 0.1 30)" : undefined) }}>{value}</span>
      </div>
      <div className="flex gap-[2px]">
        {Array.from({ length: 10 }, (_, i) => (
          <div
            key={i}
            className="w-[18px] h-[10px]"
            style={{ background: i < filledCount ? color : "rgba(255,255,255,0.1)" }}
          />
        ))}
      </div>
    </div>
  );
}

// Thin continuous-look bar (still block-free) used in Workbench profile rail.
export function ThinMetricBar({ label, value, percent, color }: { label: string; value: string; percent: number; color: string }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-[9.5px] tracking-[0.1em] uppercase text-[#8a8a86] mb-[6px]">
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="h-[5px] bg-white/8">
        <div className="h-[5px]" style={{ background: color, width: `${percent}%` }} />
      </div>
    </div>
  );
}
