import { Keyword, KeywordSnapshot } from "@prisma/client";

export type KeywordWithSnapshots = Keyword & { snapshots: KeywordSnapshot[] };

export function snapshotSeries(keyword: KeywordWithSnapshots) {
  const sorted = [...keyword.snapshots].sort((a, b) => a.recordedAt.getTime() - b.recordedAt.getTime());
  return sorted.map((snapshot) => ({
    date: snapshot.recordedAt.toISOString().slice(0, 10),
    position: snapshot.position,
    traffic: snapshot.traffic,
  }));
}

export function aggregateTraffic(keywords: KeywordWithSnapshots[]) {
  const trafficByDate: Record<string, number> = {};

  keywords.forEach((keyword) => {
    keyword.snapshots.forEach((snapshot) => {
      const key = snapshot.recordedAt.toISOString().slice(0, 10);
      trafficByDate[key] = (trafficByDate[key] ?? 0) + snapshot.traffic;
    });
  });

  return Object.entries(trafficByDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, traffic]) => ({ date, traffic }));
}
