import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

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

async function refreshAccessToken(integrationId: string, refreshToken: string) {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Failed to refresh Google token: ${errorBody}`);
  }

  const payload = (await response.json()) as { access_token: string; expires_in: number };

  await prisma.integration.update({
    where: { id: integrationId },
    data: {
      accessToken: payload.access_token,
      accessTokenExpires: new Date(Date.now() + payload.expires_in * 1000),
    },
  });

  return payload.access_token;
}

async function ensureAccessToken(integrationId: string) {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
    select: { accessToken: true, accessTokenExpires: true, refreshToken: true },
  });

  if (!integration) throw new Error("Integration not found");

  if (integration.accessToken && integration.accessTokenExpires && integration.accessTokenExpires.getTime() > Date.now() + 60_000) {
    return integration.accessToken;
  }

  if (!integration.refreshToken) {
    throw new Error("Missing refresh token. Please reconnect Search Console.");
  }

  return refreshAccessToken(integrationId, integration.refreshToken);
}

async function fetchSearchConsoleRows(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["date", "query", "page"],
      rowLimit: 2500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Search Console API error: ${errorBody}`);
  }

  const payload = (await response.json()) as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
  return payload.rows ?? [];
}

async function persistRows(
  projectId: string,
  rows: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }>,
  keywordMap: Map<string, string>,
  pageMap: Map<string, string>,
) {
  const bestPositions = new Map<
    string,
    { keywordId: string; pageId?: string | null; position: number; clicks: number; capturedAt: Date }
  >();

  for (const row of rows) {
    const [dateKey, queryRaw, pageRaw] = row.keys;
    const query = (queryRaw ?? "(not set)").toLowerCase();
    const date = dateKey ? new Date(dateKey) : new Date();
    date.setHours(0, 0, 0, 0);
    const pageUrl = normalizeUrl(pageRaw);

    await prisma.gscQuery.upsert({
      where: {
        projectId_query_pageUrl_date: {
          projectId,
          query,
          pageUrl,
          date,
        },
      },
      update: {
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr ?? (row.impressions > 0 ? row.clicks / row.impressions : 0),
        position: row.position,
      },
      create: {
        projectId,
        query,
        pageUrl,
        clicks: row.clicks,
        impressions: row.impressions,
        ctr: row.ctr ?? (row.impressions > 0 ? row.clicks / row.impressions : 0),
        position: row.position,
        date,
      },
    });

    const keywordId = keywordMap.get(query);
    if (keywordId) {
      const key = `${keywordId}:${date.toISOString()}`;
      const existing = bestPositions.get(key);
      if (!existing || row.position < existing.position) {
        bestPositions.set(key, {
          keywordId,
          pageId: pageUrl ? pageMap.get(pageUrl) ?? null : null,
          position: row.position,
          clicks: row.clicks,
          capturedAt: date,
        });
      }
    }
  }

  for (const best of bestPositions.values()) {
    await prisma.serpPosition.upsert({
      where: {
        keywordId_capturedAt: {
          keywordId: best.keywordId,
          capturedAt: best.capturedAt,
        },
      },
      update: {
        position: Math.round(best.position),
        pageId: best.pageId ?? undefined,
        traffic: best.clicks,
      },
      create: {
        keywordId: best.keywordId,
        pageId: best.pageId,
        position: Math.round(best.position),
        traffic: best.clicks,
        capturedAt: best.capturedAt,
      },
    });
  }

  return rows.length;
}

async function loadIntegrationByProject(projectId: string) {
  return prisma.integration.findUnique({
    where: { projectId_type: { projectId, type: "SEARCH_CONSOLE" } },
    include: {
      project: {
        select: {
          id: true,
          workspaceId: true,
          keywords: { select: { id: true, phrase: true } },
          pages: { select: { id: true, url: true } },
        },
      },
    },
  });
}

async function loadIntegration(integrationId: string) {
  return prisma.integration.findUnique({
    where: { id: integrationId },
    include: {
      project: {
        select: {
          id: true,
          workspaceId: true,
          keywords: { select: { id: true, phrase: true } },
          pages: { select: { id: true, url: true } },
        },
      },
    },
  });
}

function buildKeywordMap(project: { keywords: { id: string; phrase: string }[] }) {
  const map = new Map<string, string>();
  project.keywords.forEach((keyword) => {
    map.set(keyword.phrase.toLowerCase(), keyword.id);
  });
  return map;
}

function buildPageMap(project: { pages: { id: string; url: string }[] }) {
  const map = new Map<string, string>();
  project.pages.forEach((page) => {
    const normalized = normalizeUrl(page.url);
    if (normalized) {
      map.set(normalized, page.id);
    }
  });
  return map;
}

export async function importSearchConsoleForIntegration(integrationId: string) {
  const integration = await loadIntegration(integrationId);
  if (!integration || integration.type !== "SEARCH_CONSOLE" || integration.status !== "CONNECTED") {
    throw new Error("Search Console integration not connected");
  }
  if (!integration.siteUrl) {
    throw new Error("Search Console site URL missing");
  }

  const accessToken = await ensureAccessToken(integrationId);
  const endDate = new Date();
  const startDate = new Date(Date.now() - 27 * DAY_MS);
  const endDateString = endDate.toISOString().slice(0, 10);
  const startDateString = startDate.toISOString().slice(0, 10);

  const rows = await fetchSearchConsoleRows(accessToken, integration.siteUrl, startDateString, endDateString);
  const keywordMap = buildKeywordMap(integration.project);
  const pageMap = buildPageMap(integration.project);

  return persistRows(integration.project.id, rows, keywordMap, pageMap);
}

export async function importSearchConsoleForProject(projectId: string) {
  const integration = await loadIntegrationByProject(projectId);
  if (!integration) {
    throw new Error("Search Console integration not configured for project");
  }
  if (integration.status !== "CONNECTED") {
    throw new Error("Search Console integration is not connected");
  }
  return importSearchConsoleForIntegration(integration.id);
}

export async function importSearchConsoleForWorkspace(workspaceId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      type: "SEARCH_CONSOLE",
      status: "CONNECTED",
      project: { workspaceId },
    },
    select: { id: true },
  });

  let total = 0;
  for (const integration of integrations) {
    try {
      total += await importSearchConsoleForIntegration(integration.id);
    } catch (error) {
      console.error(`Failed to import GSC for integration ${integration.id}:`, error);
    }
  }

  return total;
}
