"use client";

import { ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function ModalOverlay({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="absolute inset-0 z-20 flex items-center justify-center"
        style={{ background: "rgba(6,6,6,0.72)" }}
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
