"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { day: "Mon", ocr: 210, vision: 1200, audio: 1500, behavior: 8000 },
  { day: "Tue", ocr: 195, vision: 1150, audio: 1450, behavior: 7200 },
  { day: "Wed", ocr: 220, vision: 1180, audio: 1380, behavior: 6800 },
  { day: "Thu", ocr: 200, vision: 1100, audio: 1420, behavior: 7500 },
  { day: "Fri", ocr: 185, vision: 1050, audio: 1350, behavior: 6500 },
  { day: "Sat", ocr: 205, vision: 1120, audio: 1400, behavior: 7100 },
  { day: "Sun", ocr: 190, vision: 1080, audio: 1320, behavior: 6900 },
];

export function LatencyChart() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-1">Rolling 7-Day Latency</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Average solve time per engine (ms)
      </p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="day"
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
              dataKey="ocr"
              stroke="#00E0B8"
              strokeWidth={2}
              dot={false}
              name="OCR"
            />
            <Line
              type="monotone"
              dataKey="vision"
              stroke="#5B8CFF"
              strokeWidth={2}
              dot={false}
              name="Vision"
            />
            <Line
              type="monotone"
              dataKey="audio"
              stroke="#FFB020"
              strokeWidth={2}
              dot={false}
              name="Audio"
            />
            <Line
              type="monotone"
              dataKey="behavior"
              stroke="#A78BFA"
              strokeWidth={2}
              dot={false}
              name="Behavior"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
