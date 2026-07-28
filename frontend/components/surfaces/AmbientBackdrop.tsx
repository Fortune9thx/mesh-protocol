"use client";

// Quiet atmospheric depth for application surfaces. No lines, no nodes —
// soft radial light, a barely-there grid, and fine grain. The cards carry
// the information; this only gives the room its architecture.

export function AmbientBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* soft radial light — top center, like a console under a lamp */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 75% 50% at 50% -10%, rgba(46,92,255,0.05) 0%, transparent 60%)," +
            "radial-gradient(ellipse 60% 45% at 85% 110%, rgba(250,250,247,0.015) 0%, transparent 55%)",
        }}
      />
      {/* extremely faint structural grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(250,250,247,0.025) 1px, transparent 1px)," +
            "linear-gradient(to bottom, rgba(250,250,247,0.02) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 0%, transparent 85%)",
          WebkitMaskImage: "radial-gradient(ellipse 90% 80% at 50% 0%, black 0%, transparent 85%)",
        }}
      />
      {/* fine grain */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.03 0'/%3E%3C/filter%3E%3Crect width='128' height='128' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />
    </div>
  );
}
