"use client";

import { motion } from "framer-motion";

const metrics = [
  { label: "Detection Accuracy", value: "100%", color: "#00E0B8" },
  { label: "Engine Arbitration", value: "Enabled", color: "#5B8CFF" },
  { label: "Solve Latency", value: "1.2s avg", color: "#FFB020" },
  { label: "Browser Pool", value: "Active (4)", color: "#A78BFA" },
  { label: "Adaptive Routing", value: "Learning", color: "#00E0B8" },
];

export function MetricsStrip() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight">
            Live System Diagnostics
          </h2>
          <p className="mt-3 text-muted-foreground">
            Real metrics from the CaptchaFlux pipeline
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {metrics.map((metric, i) => (
            <motion.div
              key={metric.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-xl p-5 text-center"
            >
              <div
                className="text-xl font-bold font-mono"
                style={{ color: metric.color }}
              >
                {metric.value}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                {metric.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
