"use client";

import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  color?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  subtitle,
  color = "#5B8CFF",
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="glass-card rounded-xl p-5"
    >
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <p className="mt-2 text-2xl font-bold font-mono" style={{ color }}>
        {value}
      </p>
      {subtitle && (
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      )}
    </motion.div>
  );
}
