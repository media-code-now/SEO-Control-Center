"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";

interface MetricTrendCardProps {
  title: string;
  data: Array<{ date: string; value: number }>;
  color: string;
  inverted?: boolean;
}

export function MetricTrendCard({ title, data, color, inverted = false }: MetricTrendCardProps) {
  const chartData = data.length > 0 ? data : [{ date: "", value: 0 }];
  const values = chartData.map((point) => point.value);
  const domain = inverted
    ? [Math.min(...values) - 1, Math.max(...values) + 1]
    : [0, Math.max(...values) + 10];

  return (
    <div className="rounded-lg border bg-card/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Last 28 days</p>
        <p className="text-lg font-semibold">{title}</p>
      </div>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" hide />
            <YAxis domain={domain as [number, number]} hide />
            <Tooltip contentStyle={{ fontSize: 12 }} formatter={(value) => [value as number, title]} />
            <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#gradient-${title})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
