import { tickerBase } from "@/lib/mockData";

interface BottomTickerProps {
  liveLines?: string[];
}

export function BottomTicker({ liveLines }: BottomTickerProps) {
  const source = liveLines && liveLines.length > 0 ? liveLines : tickerBase;
  const loop = [...source, ...source];
  return (
    <div className="h-[34px] flex-none border-t border-white/9 bg-graphite flex items-center overflow-hidden">
      <div
        className="flex gap-12 whitespace-nowrap font-mono text-[10.5px] text-[#8a8a86] pl-6"
        style={{ animation: "tickerScroll 32s linear infinite" }}
      >
        {loop.map((t, i) => (
          <span key={i}>{t}</span>
        ))}
      </div>
    </div>
  );
}
