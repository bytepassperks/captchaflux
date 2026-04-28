"use client";

import { motion } from "framer-motion";
import {
  Fingerprint,
  Zap,
  Activity,
  Brain,
  Database,
  Layers,
} from "lucide-react";
import { ARCHITECTURE_FEATURES } from "@/lib/constants";

const iconMap: Record<string, React.ElementType> = {
  fingerprint: Fingerprint,
  zap: Zap,
  activity: Activity,
  brain: Brain,
  database: Database,
  layers: Layers,
};

export function Architecture() {
  return (
    <section className="py-20 border-t border-border/50" id="architecture">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            Built for Reliability
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            Every layer engineered for speed, resilience, and observability
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {ARCHITECTURE_FEATURES.map((feature, i) => {
            const Icon = iconMap[feature.icon];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-xl p-6 hover:border-primary/20 transition-colors group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/15 transition-colors">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 text-sm font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
