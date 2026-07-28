"use client";

import type { View } from "@/lib/types";

const navItems: { key: View; label: string }[] = [
  { key: "overview", label: "OVR" },
  { key: "console", label: "CON" },
  { key: "workbench", label: "WRK" },
];

export function LeftRail({ view, onChange }: { view: View; onChange: (v: View) => void }) {
  return (
    <div className="w-16 flex-none border-r border-white/9 flex flex-col items-center pt-5 gap-1 bg-graphite">
      {navItems.map((item) => {
        const active = view === item.key;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className="w-12 h-[54px] flex flex-col items-center justify-center gap-[5px] mb-1 cursor-pointer"
            style={{
              background: active ? "rgba(255,255,255,0.06)" : "transparent",
              borderLeft: `2px solid ${active ? "#ececea" : "transparent"}`,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16">
              <rect x="1" y="1" width="14" height="14" fill="none" stroke={active ? "#ececea" : "#5f5f5b"} strokeWidth="1.3" />
            </svg>
            <div
              className="font-mono text-[7.5px] tracking-[0.08em] uppercase"
              style={{ color: active ? "#ececea" : "#5f5f5b" }}
            >
              {item.label}
            </div>
          </button>
        );
      })}
    </div>
  );
}
