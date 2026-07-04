"use client";

// The hero canvas — docs/MOTION.md §1.
// Boot: particles lerp from a random cloud into the MESH logo glyph, hold,
// then loosen into an ambient topology field. Pointer acts as a gravity well.
// Fallback: static poster div when reduced-motion or WebGL unavailable.

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const COUNT_MAX = 2400;

type Stage = { t: number; boot: number; pointer: THREE.Vector2 };

function Particles({ logoPoints, stage }: { logoPoints: [number, number][]; stage: React.MutableRefObject<Stage> }) {
  const ref = useRef<THREE.Points>(null);
  const { viewport } = useThree();

  const { positions, logo, topo, seeds } = useMemo(() => {
    const n = Math.min(logoPoints.length, COUNT_MAX);
    const positions = new Float32Array(n * 3);
    const logo = new Float32Array(n * 3);
    const topo = new Float32Array(n * 3);
    const seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      // start: loose sphere shell
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const r = 6 + Math.random() * 4;
      positions[i * 3] = r * Math.sin(ph) * Math.cos(th);
      positions[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
      positions[i * 3 + 2] = r * Math.cos(ph) - 4;
      // logo glyph target (scaled)
      const [lx, ly] = logoPoints[i % logoPoints.length];
      logo[i * 3] = lx * 2.6;
      logo[i * 3 + 1] = ly * 2.6;
      logo[i * 3 + 2] = 0;
      // ambient topology target: flattened wide band
      topo[i * 3] = (Math.random() * 2 - 1) * 9;
      topo[i * 3 + 1] = (Math.random() * 2 - 1) * 4.5 - 1.2;
      topo[i * 3 + 2] = (Math.random() * 2 - 1) * 2.5;
      seeds[i] = Math.random();
    }
    return { positions, logo, topo, seeds };
  }, [logoPoints]);

  const n = positions.length / 3;

  useFrame(({ clock }) => {
    const pts = ref.current;
    if (!pts) return;
    const pos = pts.geometry.attributes.position.array as Float32Array;
    const s = stage.current;
    const t = clock.elapsedTime;

    // boot phases: 0→1 cloud→logo (0.4s–1.6s), hold, 1→2 logo→topology (2.0s–3.4s)
    const toLogo = THREE.MathUtils.smoothstep(t, 0.4, 1.8);
    const toTopo = THREE.MathUtils.smoothstep(t, 2.4, 4.2);
    const px = (s.pointer.x * viewport.width) / 2;
    const py = (s.pointer.y * viewport.height) / 2;

    for (let i = 0; i < n; i++) {
      const i3 = i * 3;
      // base target through boot stages
      let tx = THREE.MathUtils.lerp(positions[i3], logo[i3], toLogo);
      let ty = THREE.MathUtils.lerp(positions[i3 + 1], logo[i3 + 1], toLogo);
      let tz = THREE.MathUtils.lerp(positions[i3 + 2], logo[i3 + 2], toLogo);
      tx = THREE.MathUtils.lerp(tx, topo[i3], toTopo);
      ty = THREE.MathUtils.lerp(ty, topo[i3 + 1], toTopo);
      tz = THREE.MathUtils.lerp(tz, topo[i3 + 2], toTopo);

      // ambient drift (agent layer: alive, low amplitude)
      const dr = toTopo * 0.12;
      tx += Math.sin(t * 0.6 + seeds[i] * 12.9) * dr;
      ty += Math.cos(t * 0.5 + seeds[i] * 7.3) * dr;

      // pointer gravity well
      const dx = px - tx, dy = py - ty;
      const d2 = dx * dx + dy * dy;
      const g = Math.min(0.6, 1.2 / (d2 + 1.5)) * toTopo;
      tx += dx * g * 0.25;
      ty += dy * g * 0.25;

      // spring-smoothed approach
      pos[i3] += (tx - pos[i3]) * 0.06;
      pos[i3 + 1] += (ty - pos[i3 + 1]) * 0.06;
      pos[i3 + 2] += (tz - pos[i3 + 2]) * 0.06;
    }
    pts.geometry.attributes.position.needsUpdate = true;

    const mat = pts.material as THREE.PointsMaterial;
    mat.opacity = THREE.MathUtils.smoothstep(t, 0.35, 1.0) * (1 - toTopo * 0.45);
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions.slice(), 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.035} color="#FAFAF7" transparent opacity={0} sizeAttenuation depthWrite={false} />
    </points>
  );
}

export function MeshHero({ className = "" }: { className?: string }) {
  const [logoPoints, setLogoPoints] = useState<[number, number][] | null>(null);
  const [reduced, setReduced] = useState(false);
  const stage = useRef<Stage>({ t: 0, boot: 0, pointer: new THREE.Vector2(0, 0) });

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    fetch("/brand/logo-points.json")
      .then((r) => r.json())
      .then(setLogoPoints)
      .catch(() => setLogoPoints([]));
    const onMove = (e: PointerEvent) => {
      stage.current.pointer.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  if (reduced || logoPoints === null) {
    // poster fallback / loading: static logo
    return (
      <div className={`absolute inset-0 flex items-center justify-center ${className}`} aria-hidden>
        {reduced && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/brand/mesh-logo-white.png" alt="" className="w-40 opacity-30" />
        )}
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 ${className}`} aria-hidden>
      <Canvas camera={{ position: [0, 0, 8], fov: 50 }} dpr={[1, 1.5]} gl={{ antialias: false, alpha: true }}>
        <Particles logoPoints={logoPoints} stage={stage} />
      </Canvas>
    </div>
  );
}
