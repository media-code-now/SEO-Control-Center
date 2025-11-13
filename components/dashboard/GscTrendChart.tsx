"use client";

import { MetricTrendCard } from "@/components/dashboard/MetricTrendCard";

export type GscTrendPoint = {
  date: string;
  clicks: number;
  impressions: number;
  position: number;
};

interface MetricProps {
  data: GscTrendPoint[];
}

export function GscTrendChart({ data }: MetricProps) {
  const clicks = data.map((point) => ({ date: point.date, value: point.clicks }));
  const impressions = data.map((point) => ({ date: point.date, value: point.impressions }));
  const positions = data.map((point) => ({ date: point.date, value: point.position }));

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricTrendCard title="Clicks" data={clicks} color="#38bdf8" />
      <MetricTrendCard title="Impressions" data={impressions} color="#a855f7" />
      <MetricTrendCard title="Avg. position" data={positions} color="#34d399" inverted />
    </div>
  );
}
