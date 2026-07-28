"use client";

import { ReactNode, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Standard modal shell. Guarantees a modal never exceeds the viewport and its
 * content is always reachable: the inner container caps at 90vh and scrolls
 * internally, with a 92vw cap so wide modals stay on-screen on mobile. Escape
 * closes. (Click-outside is intentionally disabled so a stray click never
 * discards a half-filled form.)
 */
export function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto p-4"
        style={{ background: "rgba(6,6,6,0.72)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="max-h-[90vh] max-w-[92vw] overflow-y-auto"
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
