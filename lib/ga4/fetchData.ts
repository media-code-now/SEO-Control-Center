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

function buildUrlFromPath(pagePath: string, domain?: string | null) {
  if (!pagePath) return null;
  if (pagePath.startsWith("http")) {
    return normalizeUrl(pagePath);
  }
  if (!domain) {
    const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
    return normalizeUrl(path);
  }
  const base = domain.startsWith("http") ? domain : `https://${domain}`;
  const path = pagePath.startsWith("/") ? pagePath : `/${pagePath}`;
  return normalizeUrl(`${base}${path}`);
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
    throw new Error("Missing refresh token. Please reconnect GA4.");
  }

  return refreshAccessToken(integrationId, integration.refreshToken);
}

async function runReport(propertyId: string, accessToken: string, startDate: string, endDate: string) {
  const property = propertyId.startsWith("properties/") ? propertyId : `properties/${propertyId}`;
  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/${property}:runReport`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dateRanges: [
        {
          startDate,
          endDate,
        },
      ],
      dimensions: [{ name: "pagePath" }],
      metrics: [{ name: "sessions" }, { name: "conversions" }],
      limit: 2500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`GA4 API error: ${errorBody}`);
  }

  const payload = (await response.json()) as {
    rows?: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>;
  };

  return payload.rows ?? [];
}

async function persistGa4Rows(
  projectId: string,
  rows: Array<{ dimensionValues: Array<{ value: string }>; metricValues: Array<{ value: string }> }>,
  pageMap: Map<string, string>,
  domain?: string | null,
) {
  for (const row of rows) {
    const pagePath = row.dimensionValues?.[0]?.value ?? "";
    const url = buildUrlFromPath(pagePath, domain);
    if (!url) continue;

    const sessions = Number(row.metricValues?.[0]?.value ?? 0) || 0;
    const conversions = Number(row.metricValues?.[1]?.value ?? 0) || 0;
    const date = new Date();
    date.setHours(0, 0, 0, 0);

    await prisma.ga4Page.upsert({
      where: {
        projectId_url_date: {
          projectId,
          url,
          date,
        },
      },
      update: {
        sessions,
        views: sessions,
        conversions,
      },
      create: {
        projectId,
        url,
        sessions,
        views: sessions,
        conversions,
        pageId: pageMap.get(url) ?? null,
        date,
      },
    });
  }

  return rows.length;
}

async function loadIntegration(integrationId: string) {
  return prisma.integration.findUnique({
    where: { id: integrationId },
    include: {
      project: {
        select: {
          id: true,
          workspaceId: true,
          domain: true,
          pages: { select: { id: true, url: true } },
        },
      },
    },
  });
}

async function loadIntegrationByProject(projectId: string) {
  return prisma.integration.findUnique({
    where: { projectId_type: { projectId, type: "GA4" } },
    include: {
      project: {
        select: {
          id: true,
          workspaceId: true,
          domain: true,
          pages: { select: { id: true, url: true } },
        },
      },
    },
  });
}

function buildPageMap(project: { pages: { id: string; url: string }[] }) {
  const map = new Map<string, string>();
  project.pages.forEach((page) => {
    const normalized = normalizeUrl(page.url);
    if (normalized) {
      map.set(normalized, page.id);
    }
    try {
      const path = new URL(page.url).pathname;
      if (path) {
        map.set(path, page.id);
      }
    } catch (error) {
      /* ignore */
    }
  });
  return map;
}

export async function importGa4ForIntegration(integrationId: string) {
  const integration = await loadIntegration(integrationId);
  if (!integration || integration.type !== "GA4" || integration.status !== "CONNECTED") {
    throw new Error("GA4 integration not connected");
  }
  if (!integration.propertyId) {
    throw new Error("GA4 property ID missing");
  }

  const accessToken = await ensureAccessToken(integrationId);
  const endDate = new Date();
  const startDate = new Date(Date.now() - 27 * DAY_MS);
  const endDateString = endDate.toISOString().slice(0, 10);
  const startDateString = startDate.toISOString().slice(0, 10);

  const rows = await runReport(integration.propertyId, accessToken, startDateString, endDateString);
  const pageMap = buildPageMap(integration.project);

  return persistGa4Rows(integration.project.id, rows, pageMap, integration.project.domain);
}

export async function importGa4ForProject(projectId: string) {
  const integration = await loadIntegrationByProject(projectId);
  if (!integration) {
    throw new Error("GA4 integration not configured for project");
  }
  if (integration.status !== "CONNECTED") {
    throw new Error("GA4 integration is not connected");
  }
  return importGa4ForIntegration(integration.id);
}

export async function importGa4ForWorkspace(workspaceId: string) {
  const integrations = await prisma.integration.findMany({
    where: {
      type: "GA4",
      status: "CONNECTED",
      project: { workspaceId },
    },
    select: { id: true },
  });

  let total = 0;
  for (const integration of integrations) {
    try {
      total += await importGa4ForIntegration(integration.id);
    } catch (error) {
      console.error(`Failed to import GA4 for integration ${integration.id}:`, error);
    }
  }

  return total;
}
