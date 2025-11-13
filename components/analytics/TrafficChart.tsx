"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type TrafficPoint = { date: string; traffic: number };

interface TrafficChartProps {
  data: TrafficPoint[];
}

export function TrafficChart({ data }: TrafficChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Organic sessions</p>
            <p className="text-2xl font-semibold">{data.at(-1)?.traffic ?? 0}</p>
          </div>
          <span className="text-xs text-slate-400">Last {data.length} days</span>
        </div>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ left: 0, top: 16, right: 8 }}>
            <defs>
              <linearGradient id="traffic" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1C64F2" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#1C64F2" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} tickMargin={8} />
            <Tooltip labelStyle={{ color: "#020617" }} formatter={(value) => [`${value} visits`, "Traffic"]} />
            <Area
              type="monotone"
              dataKey="traffic"
              stroke="#1C64F2"
              fillOpacity={1}
              fill="url(#traffic)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
