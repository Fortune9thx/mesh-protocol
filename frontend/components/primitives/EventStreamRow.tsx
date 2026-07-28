import type { StreamEvent } from "@/lib/types";

const kindColor: Record<StreamEvent["kind"], string> = {
  settlement: "oklch(78% 0.07 245)",
  dispute: "oklch(55% 0.1 30)",
  info: "rgba(255,255,255,0.4)",
};

export function EventStreamRow({ event }: { event: StreamEvent }) {
  return (
    <div className="flex gap-2.5 py-[6px] font-mono text-[10.5px]">
      <span className="text-[#5f5f5b] flex-none w-[52px]">{event.time}</span>
      <span className="flex-none w-2" style={{ color: kindColor[event.kind] }}>
        ●
      </span>
      <span className="text-[#c9c9c5]">{event.text}</span>
    </div>
  );
}
