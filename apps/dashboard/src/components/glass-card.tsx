"use client";

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

interface GlassCardProps {
  children: ReactNode;
  elevated?: boolean;
  delay?: number;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
}

export function GlassCard({
  children,
  elevated = false,
  delay = 0,
  className = "",
  style,
  onClick,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={`${elevated ? "glass-elevated" : "glass"} ${className}`}
      style={{
        padding: "var(--space-xl)",
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
