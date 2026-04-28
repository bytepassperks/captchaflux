"use client";

import { motion } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const historyData = [
  {
    date: "Apr 22",
    detections: 5,
    solves: 1,
    latency: 9800,
    fastest: "vision",
    slowest: "behavior",
  },
  {
    date: "Apr 23",
    detections: 5,
    solves: 1,
    latency: 10200,
    fastest: "vision",
    slowest: "behavior",
  },
  {
    date: "Apr 24",
    detections: 5,
    solves: 2,
    latency: 8900,
    fastest: "ocr",
    slowest: "behavior",
  },
  {
    date: "Apr 25",
    detections: 5,
    solves: 1,
    latency: 10500,
    fastest: "vision",
    slowest: "behavior",
  },
  {
    date: "Apr 26",
    detections: 5,
    solves: 1,
    latency: 9600,
    fastest: "vision",
    slowest: "behavior",
  },
  {
    date: "Apr 27",
    detections: 5,
    solves: 2,
    latency: 8400,
    fastest: "ocr",
    slowest: "behavior",
  },
  {
    date: "Apr 28",
    detections: 5,
    solves: 1,
    latency: 10624,
    fastest: "vision",
    slowest: "behavior",
  },
];

const engineStats = [
  {
    engine: "OCR",
    avgLatency: "854ms",
    successRate: "95%",
    color: "#00E0B8",
  },
  {
    engine: "Vision",
    avgLatency: "1.2s",
    successRate: "78%",
    color: "#5B8CFF",
  },
  {
    engine: "Audio",
    avgLatency: "1.6s",
    successRate: "72%",
    color: "#FFB020",
  },
  {
    engine: "Behavior",
    avgLatency: "16.1s",
    successRate: "100%",
    color: "#A78BFA",
  },
  {
    engine: "Token Harvest",
    avgLatency: "7.6s",
    successRate: "12%",
    color: "#FF5B5B",
  },
];

export default function BenchmarksPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Benchmark History
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Rolling 7-day performance across 5 captcha demo endpoints
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Avg Detection Rate",
            value: "100%",
            color: "#00E0B8",
          },
          {
            label: "Avg Solve Rate",
            value: "24%",
            color: "#5B8CFF",
          },
          {
            label: "Avg Latency",
            value: "9.7s",
            color: "#FFB020",
          },
          {
            label: "Benchmark Runs",
            value: "28",
            color: "#A78BFA",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-card rounded-xl p-5"
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wider">
              {stat.label}
            </p>
            <p
              className="mt-2 text-2xl font-bold font-mono"
              style={{ color: stat.color }}
            >
              {stat.value}
            </p>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-1">Latency Trend</h3>
        <p className="text-xs text-muted-foreground mb-6">
          Average solve latency over the last 7 days (ms)
        </p>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historyData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "#64748B", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <YAxis
                tick={{ fill: "#64748B", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#121821",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="latency"
                stroke="#5B8CFF"
                strokeWidth={2}
                dot={{ fill: "#5B8CFF", r: 3 }}
                name="Avg Latency (ms)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/30">
          <h3 className="text-sm font-semibold">Per-Engine Performance</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Rolling averages from continuous benchmark runs
          </p>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-6 py-3 border-b border-border/20 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Engine</span>
          <span>Avg Latency</span>
          <span>Success Rate</span>
          <span>Status</span>
        </div>
        {engineStats.map((engine, i) => (
          <motion.div
            key={engine.engine}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 px-6 py-4 border-b border-border/20 last:border-0 items-center"
          >
            <div className="flex items-center gap-3">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: engine.color }}
              />
              <span className="text-sm font-medium">{engine.engine}</span>
            </div>
            <span className="text-sm font-mono text-muted-foreground">
              {engine.avgLatency}
            </span>
            <span className="text-sm font-mono" style={{ color: engine.color }}>
              {engine.successRate}
            </span>
            <span className="text-xs font-mono text-flux-teal">Active</span>
          </motion.div>
        ))}
      </div>

      <div className="glass-card rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border/30">
          <h3 className="text-sm font-semibold">Recent Benchmark Runs</h3>
        </div>
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/20 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>Date</span>
          <span>Detections</span>
          <span>Solves</span>
          <span>Avg Latency</span>
          <span>Fastest</span>
          <span>Slowest</span>
        </div>
        {historyData
          .slice()
          .reverse()
          .map((run, i) => (
            <motion.div
              key={run.date}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border/20 last:border-0 items-center text-sm"
            >
              <span className="text-muted-foreground">{run.date}</span>
              <span className="font-mono text-flux-teal">
                {run.detections}/5
              </span>
              <span className="font-mono">{run.solves}/5</span>
              <span className="font-mono text-muted-foreground">
                {(run.latency / 1000).toFixed(1)}s
              </span>
              <span className="font-mono text-flux-blue">{run.fastest}</span>
              <span className="font-mono text-flux-amber">{run.slowest}</span>
            </motion.div>
          ))}
      </div>
    </div>
  );
}
