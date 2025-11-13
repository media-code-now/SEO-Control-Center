import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PageTableView, type PageRow } from "@/components/pages/PageTableView";

const DAY_MS = 86_400_000;

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

interface PagesPageProps {
  searchParams?: {
    workspaceId?: string;
  };
}

export default async function PagesPage({ searchParams }: PagesPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to manage pages.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];
  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before managing pages.</p>;
  }

  const pageRecords = await prisma.page.findMany({
    where: { projectId: activeProject.id },
    include: {
      mappings: {
        include: {
          keyword: true,
        },
      },
      serpPositions: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
    orderBy: { url: "asc" },
  });

  const since = new Date(Date.now() - 27 * DAY_MS);
  since.setHours(0, 0, 0, 0);
  const gscMetrics = await prisma.gscQuery.groupBy({
    by: ["pageUrl"],
    where: { projectId: activeProject.id, pageUrl: { not: null }, date: { gte: since } },
    _sum: { clicks: true, impressions: true },
    _avg: { ctr: true, position: true },
  });

  const ga4Metrics = await prisma.ga4Page.groupBy({
    by: ["url"],
    where: { projectId: activeProject.id, date: { gte: since } },
    _sum: { sessions: true, conversions: true },
  });

  const metricMap = new Map<string, { clicks: number; impressions: number; ctr: number; position: number | null }>();
  gscMetrics.forEach((entry) => {
    if (!entry.pageUrl) return;
    const key = normalizeUrl(entry.pageUrl);
    if (!key) return;
    metricMap.set(key, {
      clicks: entry._sum.clicks ?? 0,
      impressions: entry._sum.impressions ?? 0,
      ctr: entry._avg.ctr ?? 0,
      position: entry._avg.position ?? null,
    });
  });

  const ga4Map = new Map<string, { sessions: number; conversions: number }>();
  ga4Metrics.forEach((entry) => {
    const key = normalizeUrl(entry.url);
    if (!key) return;
    ga4Map.set(key, {
      sessions: entry._sum.sessions ?? 0,
      conversions: entry._sum.conversions ?? 0,
    });
  });

  const pages: PageRow[] = pageRecords.map((page) => {
    const primaryMapping = page.mappings.find((mapping) => mapping.role === "PRIMARY");
    const fallbackMapping = page.mappings[0];
    const targetKeyword = primaryMapping?.keyword.phrase ?? fallbackMapping?.keyword.phrase ?? null;
    const normalizedUrl = normalizeUrl(page.url);
    const metrics = normalizedUrl ? metricMap.get(normalizedUrl) : undefined;
    const ga4 = normalizedUrl ? ga4Map.get(normalizedUrl) : undefined;
    const conversionRate = ga4 && ga4.sessions > 0 ? ga4.conversions / ga4.sessions : null;
    return {
      id: page.id,
      url: page.url,
      pageType: page.pageType,
      status: page.status,
      owner: page.owner,
      lastCrawl: page.lastCrawl?.toISOString() ?? null,
      targetKeyword,
      currentRank: page.serpPositions[0]?.position ?? null,
      clicks: metrics?.clicks ?? 0,
      impressions: metrics?.impressions ?? 0,
      ctr: metrics?.ctr ?? null,
      avgPosition: metrics?.position ?? null,
      conversions: ga4?.conversions ?? 0,
      conversionRate,
    };
  });

  return <PageTableView projectId={activeProject.id} pages={pages} />;
}
