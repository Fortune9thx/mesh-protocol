"use client";

// Halftone bust morph — docs/MOTION.md §2.
// Augustus (CC0, Met) sampled to a dot grid on <canvas>. Dots lerp between
// portrait position and network-topology position as the section scrolls.
// Pointer adds parallax displacement. Pure 2D canvas — cheap and crisp.

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; r: number; nx: number; ny: number; seed: number };

export function HalftoneBust({ progressRef }: { progressRef: React.MutableRefObject<number> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    let dots: Dot[] = [];
    let dead = false;

    const img = new Image();
    img.src = "/art/augustus.jpg";
    img.onload = () => {
      if (dead) return;
      // sample the image on an offscreen canvas
      const S = 150; // sample grid
      const off = document.createElement("canvas");
      off.width = S; off.height = S;
      const octx = off.getContext("2d")!;
      // center-crop square
      const side = Math.min(img.width, img.height);
      octx.drawImage(img, (img.width - side) / 2, (img.height - side) * 0.25, side, side, 0, 0, S, S);
      const data = octx.getImageData(0, 0, S, S).data;
      dots = [];
      for (let y = 0; y < S; y += 2) {
        for (let x = 0; x < S; x += 2) {
          const i = (y * S + x) * 4;
          const lum = (data[i] + data[i + 1] + data[i + 2]) / 765;
          if (lum > 0.16) {
            dots.push({
              x: x / S, y: y / S,
              r: lum * 1.9,
              nx: Math.random(), ny: Math.random(),
              seed: Math.random(),
            });
          }
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.current.x = (e.clientX - rect.left) / rect.width;
      pointer.current.y = (e.clientY - rect.top) / rect.height;
    };
    window.addEventListener("pointermove", onMove);

    const draw = (t: number) => {
      const dprScale = Math.min(devicePixelRatio, 1.5);
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * dprScale) { canvas.width = w * dprScale; canvas.height = h * dprScale; }
      ctx.setTransform(dprScale, 0, 0, dprScale, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const p = progressRef.current; // 0 portrait → 1 network
      const px = (pointer.current.x - 0.5) * 14 * (1 - p);
      const py = (pointer.current.y - 0.5) * 10 * (1 - p);
      const drift = t * 0.00035;

      ctx.fillStyle = "#FAFAF7";
      for (const d of dots) {
        const bx = d.x * w + px * (d.r * 0.6);
        const by = d.y * h + py * (d.r * 0.6);
        const nx2 = d.nx * w + Math.sin(drift * 2 + d.seed * 9) * 6;
        const ny2 = d.ny * h + Math.cos(drift * 1.7 + d.seed * 7) * 6;
        const x = bx + (nx2 - bx) * p;
        const y = by + (ny2 - by) * p;
        const r = d.r * (1 - p * 0.55) + 0.4 * p;
        ctx.globalAlpha = 0.85 - p * 0.35;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // network edges appear as dots re-sort
      if (p > 0.35 && dots.length) {
        ctx.strokeStyle = `rgba(250,250,247,${(p - 0.35) * 0.12})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        for (let i = 0; i < 40; i++) {
          const a = dots[(i * 97) % dots.length];
          const b = dots[(i * 211 + 53) % dots.length];
          ctx.moveTo(a.nx * w, a.ny * h);
          ctx.lineTo(b.nx * w, b.ny * h);
        }
        ctx.stroke();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
    };
  }, [progressRef]);

  return <canvas ref={canvasRef} className="h-full w-full" aria-hidden />;
}
