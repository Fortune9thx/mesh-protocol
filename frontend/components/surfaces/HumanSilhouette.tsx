"use client";

import { motion } from "framer-motion";

export function HumanSilhouette({
  opacity = 0.06,
  fragmented = false,
  className = "",
}: {
  opacity?: number;
  fragmented?: boolean;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity }}
      transition={{ duration: 2, ease: "easeInOut" }}
      className={`pointer-events-none select-none ${className}`}
      aria-hidden
    >
      <svg
        viewBox="0 0 200 340"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full"
      >
        {/* head */}
        {fragmented ? (
          <>
            <motion.circle
              cx="100" cy="58" r="36"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.3, 0.9], x: [0, 2, -1, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.rect
              x="62" y="110" width="76" height="140" rx="6"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.2, 0.9], x: [0, -3, 2, 0] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            />
            <motion.rect
              x="22" y="118" width="36" height="110" rx="6"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.15, 0.9], x: [0, 4, -2, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            />
            <motion.rect
              x="142" y="118" width="36" height="110" rx="6"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.2, 0.9], x: [0, -3, 1, 0] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            />
            <motion.rect
              x="62" y="258" width="34" height="70" rx="6"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.1, 0.9], y: [0, 3, -1, 0] }}
              transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1.2 }}
            />
            <motion.rect
              x="104" y="258" width="34" height="70" rx="6"
              fill="rgba(255,255,255,0.9)"
              animate={{ opacity: [0.9, 0.15, 0.9], y: [0, -2, 2, 0] }}
              transition={{ duration: 8.5, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />
          </>
        ) : (
          <>
            <circle cx="100" cy="58" r="36" fill="white" />
            <rect x="62" y="110" width="76" height="140" rx="6" fill="white" />
            <rect x="22" y="118" width="36" height="110" rx="6" fill="white" />
            <rect x="142" y="118" width="36" height="110" rx="6" fill="white" />
            <rect x="62" y="258" width="34" height="70" rx="6" fill="white" />
            <rect x="104" y="258" width="34" height="70" rx="6" fill="white" />
          </>
        )}
      </svg>
    </motion.div>
  );
}
