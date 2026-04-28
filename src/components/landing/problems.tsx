"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Clock, RefreshCw, ArrowDownUp } from "lucide-react";

const problems = [
  {
    icon: AlertTriangle,
    text: "Captcha triggers silently reduce success rates",
  },
  { icon: Clock, text: "Token delays break pipelines" },
  { icon: RefreshCw, text: "Browser trust resets kill reliability" },
  { icon: ArrowDownUp, text: "Sequential solvers waste seconds per request" },
];

export function Problems() {
  return (
    <section className="py-20 border-t border-border/50" id="features">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight"
          >
            Your automation is slower than you think
          </motion.h2>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {problems.map((problem, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card rounded-xl p-5 flex items-start gap-4 text-left"
              >
                <problem.icon className="h-5 w-5 text-flux-amber shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{problem.text}</p>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <p className="text-lg font-medium">
              CaptchaFlux fixes all four{" "}
              <span className="text-primary">automatically</span>
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
