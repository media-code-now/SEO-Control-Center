"use server";

import { prisma } from "@/lib/prisma";

const DAY_MS = 86_400_000;

function buildDateRange(days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const range: Date[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(today.getTime() - i * DAY_MS);
    range.push(date);
  }
  return range;
}

export async function getGscOverview(projectId: string, days = 28) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.gscQuery.findMany({
    where: {
      projectId,
      date: {
        gte: since,
      },
    },
    orderBy: { date: "asc" },
  });

  const totalClicks = rows.reduce((acc, row) => acc + row.clicks, 0);
  const totalImpressions = rows.reduce((acc, row) => acc + row.impressions, 0);

  const dayKeywordBest = new Map<string, number>();
  const buckets = new Map<string, { clicks: number; impressions: number; positionTotal: number; count: number }>();

  rows.forEach((row) => {
    const dateKey = row.date.toISOString().slice(0, 10);
    const bucket = buckets.get(dateKey) ?? { clicks: 0, impressions: 0, positionTotal: 0, count: 0 };
    bucket.clicks += row.clicks;
    bucket.impressions += row.impressions;
    buckets.set(dateKey, bucket);

    const keywordKey = `${dateKey}:${row.query.toLowerCase()}`;
    const best = dayKeywordBest.get(keywordKey);
    if (best === undefined || row.position < best) {
      dayKeywordBest.set(keywordKey, row.position);
    }
  });

  dayKeywordBest.forEach((position, key) => {
    const dateKey = key.split(":")[0];
    const bucket = buckets.get(dateKey);
    if (bucket) {
      bucket.positionTotal += position;
      bucket.count += 1;
    }
  });

  const avgPosition = dayKeywordBest.size > 0
    ? Array.from(dayKeywordBest.values()).reduce((acc, pos) => acc + pos, 0) / dayKeywordBest.size
    : 0;

  const series = buildDateRange(days).map((date) => {
    const key = date.toISOString().slice(0, 10);
    const bucket = buckets.get(key);
    return {
      date: key,
      clicks: bucket?.clicks ?? 0,
      impressions: bucket?.impressions ?? 0,
      position: bucket && bucket.count > 0 ? bucket.positionTotal / bucket.count : 0,
    };
  });

  return {
    totals: {
      clicks: totalClicks,
      impressions: totalImpressions,
      avgPosition: Number(avgPosition.toFixed(2)),
    },
    series,
  };
}

export async function getTopPageOpportunities(projectId: string, days = 28) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const pages = await prisma.page.findMany({
    where: { projectId },
    select: { id: true, url: true, title: true },
  });

  const pageUrlMap = new Map<string, { id: string; url: string; title: string | null }>();
  pages.forEach((page) => {
    const normalized = normalizeUrl(page.url);
    if (normalized) {
      pageUrlMap.set(normalized, page);
    }
  });

  const aggregates = await prisma.gscQuery.groupBy({
    by: ["pageUrl"],
    where: {
      projectId,
      pageUrl: { not: null },
      date: { gte: since },
    },
    _sum: { impressions: true, clicks: true },
    _avg: { position: true },
  });

  const opportunities = aggregates
    .map((entry) => {
      if (!entry.pageUrl) return null;
      const normalized = normalizeUrl(entry.pageUrl);
      if (!normalized) return null;
      const page = pageUrlMap.get(normalized);
      if (!page) return null;
      return {
        id: page.id,
        url: page.url,
        title: page.title || page.url,
        impressions: entry._sum.impressions ?? 0,
        clicks: entry._sum.clicks ?? 0,
        position: entry._avg.position ?? 0,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.impressions > 1000 && item.position >= 5 && item.position <= 20)
    .sort((a, b) => b.impressions - a.impressions)
    .slice(0, 5);

  return opportunities;
}

function normalizeUrl(url?: string | null) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    parsed.hash = "";
    return parsed.href.replace(/\/$/, "");
  } catch (error) {
    return url.trim().replace(/\/$/, "");
  }
}

export async function getGa4Overview(projectId: string, days = 28) {
  const since = new Date(Date.now() - (days - 1) * DAY_MS);
  since.setHours(0, 0, 0, 0);

  const rows = await prisma.ga4Page.findMany({
    where: {
      projectId,
      date: {
        gte: since,
      },
    },
  });

  const totalSessions = rows.reduce((acc, row) => acc + row.sessions, 0);
  const totalConversions = rows.reduce((acc, row) => acc + row.conversions, 0);
  const conversionRate = totalSessions > 0 ? totalConversions / totalSessions : 0;

  return {
    sessions: totalSessions,
    conversions: totalConversions,
    conversionRate,
  };
}

export async function getTopOpportunities(projectId: string, limit = 5) {
  const tasks = await prisma.task.findMany({
    where: {
      projectId,
      status: {
        not: "DONE",
      },
    },
    orderBy: [{ scorePotential: "desc" }, { updatedAt: "desc" }],
    take: limit,
  });

  return tasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: task.type,
    status: task.status,
    scoreCurrent: task.scoreCurrent,
    scorePotential: task.scorePotential,
  }));
}
