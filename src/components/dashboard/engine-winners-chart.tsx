"use client";

import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const data = [
  { engine: "OCR", wins: 145, color: "#00E0B8" },
  { engine: "Vision", wins: 89, color: "#5B8CFF" },
  { engine: "Audio", wins: 67, color: "#FFB020" },
  { engine: "Behavior", wins: 52, color: "#A78BFA" },
  { engine: "Token", wins: 34, color: "#FF5B5B" },
];

export function EngineWinnersChart() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-1">Engine Arbitration Winners</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Which engine wins the race most often
      </p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap="20%">
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.06)"
              horizontal={false}
            />
            <XAxis
              type="number"
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            />
            <YAxis
              dataKey="engine"
              type="category"
              tick={{ fill: "#64748B", fontSize: 12 }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              width={70}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#121821",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Bar dataKey="wins" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

