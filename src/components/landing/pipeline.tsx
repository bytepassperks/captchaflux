"use client";

import { motion } from "framer-motion";
import { PIPELINE_STEPS } from "@/lib/constants";

const colorMap: Record<string, string> = {
  "flux-blue": "#5B8CFF",
  "flux-teal": "#00E0B8",
  "flux-amber": "#FFB020",
  "flux-purple": "#A78BFA",
};

export function Pipeline() {
  return (
    <section className="py-20 border-t border-border/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight">
            How CaptchaFlux Works
          </h2>
          <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
            A single API call triggers an intelligent pipeline that detects,
            routes, races, and resolves.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-border/50 hidden sm:block" />

          <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-6 sm:gap-0">
            {PIPELINE_STEPS.map((step, i) => (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: step.delay }}
                className="relative flex flex-col items-center text-center"
              >
                <div
                  className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50"
                  style={{
                    backgroundColor: `${colorMap[step.color]}10`,
                    boxShadow: `0 0 30px ${colorMap[step.color]}15`,
                  }}
                >
                  <span
                    className="text-sm font-bold font-mono"
                    style={{ color: colorMap[step.color] }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-4 text-sm font-medium max-w-[120px]">
                  {step.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
