"use client";

import { MetricCard } from "@/components/dashboard/metric-card";
import { LatencyChart } from "@/components/dashboard/latency-chart";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { EngineWinnersChart } from "@/components/dashboard/engine-winners-chart";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Real-time captcha intelligence metrics
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          title="Detection Accuracy"
          value="100%"
          subtitle="Last 7 days"
          color="#00E0B8"
          delay={0}
        />
        <MetricCard
          title="Solve Latency"
          value="1.2s"
          subtitle="Average across engines"
          color="#5B8CFF"
          delay={0.05}
        />
        <MetricCard
          title="Browser Pool"
          value="2 / 4"
          subtitle="Active / Max slots"
          color="#A78BFA"
          delay={0.1}
        />
        <MetricCard
          title="Arbitration"
          value="Active"
          subtitle="250ms window"
          color="#FFB020"
          delay={0.15}
        />
        <MetricCard
          title="Routing"
          value="Learning"
          subtitle="Adaptive mode"
          color="#00E0B8"
          delay={0.2}
        />
        <MetricCard
          title="Cache Hit Rate"
          value="64%"
          subtitle="Token cache"
          color="#5B8CFF"
          delay={0.25}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyChart />
        <DistributionChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EngineWinnersChart />
        <div className="glass-card rounded-xl p-6">
          <h3 className="text-sm font-semibold mb-1">System Status</h3>
          <p className="text-xs text-muted-foreground mb-6">
            Current pipeline health
          </p>
          <div className="space-y-4">
            {[
              { label: "Engine Racing", status: "Active", ok: true },
              { label: "Adaptive Routing", status: "Learning", ok: true },
              { label: "Detector Cache", status: "Enabled", ok: true },
              { label: "Token Cache", status: "Memory", ok: true },
              { label: "Browser Pool", status: "2 active", ok: true },
              { label: "Benchmark Scheduler", status: "Every 6h", ok: true },
              { label: "CLIP Model", status: "Lazy-load", ok: true },
              { label: "YOLO Model", status: "Warm", ok: true },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-2 border-b border-border/30 last:border-0"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <div className="flex items-center gap-2">
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      item.ok ? "bg-flux-teal" : "bg-flux-red"
                    }`}
                  />
                  <span className="text-sm font-mono">{item.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
