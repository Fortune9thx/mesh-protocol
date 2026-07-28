"use client";

// Industrial sliding-knob toggle — square knob, square track. Not an iOS pill.
export function AutonomyToggle({ paused, onToggle }: { paused: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={!paused}
      aria-label={paused ? "Resume agent autonomy" : "Pause agent autonomy"}
      className="w-[34px] h-[18px] flex items-center cursor-pointer border"
      style={{ borderColor: paused ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.3)" }}
    >
      <div
        className="w-3 h-3 transition-[margin-left] duration-150 ease-out"
        style={{
          background: paused ? "#5f5f5b" : "#ececea",
          marginLeft: paused ? 2 : 18,
        }}
      />
    </button>
  );
}
