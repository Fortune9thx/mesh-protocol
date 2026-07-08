"use client";

import { useEffect, useRef } from "react";

const NODES = [
  { x: 0.12, y: 0.22 }, { x: 0.28, y: 0.55 }, { x: 0.45, y: 0.18 },
  { x: 0.55, y: 0.72 }, { x: 0.68, y: 0.38 }, { x: 0.82, y: 0.62 },
  { x: 0.38, y: 0.85 }, { x: 0.72, y: 0.14 }, { x: 0.92, y: 0.42 },
];

const EDGES = [
  [0,1],[1,2],[2,4],[4,5],[3,5],[1,3],[6,3],[4,7],[5,8],[2,7],[0,2],
];

export function TopologyWatermark({ opacity = 0.06 }: { opacity?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const phaseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = () => {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const w = canvas.width;
      const h = canvas.height;
      phaseRef.current += 0.004;
      const phase = phaseRef.current;

      // edges
      EDGES.forEach(([a, b], i) => {
        const na = NODES[a], nb = NODES[b];
        const pulse = 0.4 + 0.6 * Math.abs(Math.sin(phase + i * 0.7));
        ctx.beginPath();
        ctx.moveTo(na.x * w, na.y * h);
        ctx.lineTo(nb.x * w, nb.y * h);
        ctx.strokeStyle = `rgba(255,255,255,${opacity * pulse * 0.6})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      });

      // nodes
      NODES.forEach((n, i) => {
        const pulse = 0.5 + 0.5 * Math.abs(Math.sin(phase * 0.8 + i * 1.1));
        ctx.beginPath();
        ctx.arc(n.x * w, n.y * h, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${opacity * pulse * 1.4})`;
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      ro.disconnect();
    };
  }, [opacity]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ opacity }}
      aria-hidden
    />
  );
}
