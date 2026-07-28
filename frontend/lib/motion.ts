// Mesh motion language — docs/MOTION.md §0
// GSAP owns the scroll axis · Framer Motion owns pointer state · R3F owns the canvas.

export const springs = {
  /** Human layer — calm and certain */
  editorial: { type: "spring", stiffness: 120, damping: 24, mass: 1 } as const,
  /** Agent layer — alive, slightly nervous */
  reactive: { type: "spring", stiffness: 300, damping: 22, mass: 0.6 } as const,
  /** Torn paper / world transitions */
  tear: { duration: 0.6, ease: [0.76, 0, 0.24, 1] as const },
};

export const EASE_CINEMATIC = "power3.inOut";
export const EASE_ARRIVAL = "power4.out";
export const STAGGER_WORD = 0.04;
export const STAGGER_CHAR = 0.012;
