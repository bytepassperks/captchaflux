"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { name: "reCAPTCHA v2", value: 42, color: "#5B8CFF" },
  { name: "hCaptcha", value: 28, color: "#00E0B8" },
  { name: "Turnstile", value: 18, color: "#FFB020" },
  { name: "Text/Image", value: 8, color: "#A78BFA" },
  { name: "reCAPTCHA v3", value: 4, color: "#FF5B5B" },
];

export function DistributionChart() {
  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-1">Captcha Type Distribution</h3>
      <p className="text-xs text-muted-foreground mb-6">
        Breakdown of detected captcha types
      </p>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#121821",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: "12px" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
