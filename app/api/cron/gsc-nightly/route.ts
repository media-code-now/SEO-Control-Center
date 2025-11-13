import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { importSearchConsoleForIntegration } from "@/lib/gsc/fetchData";
import { importGa4ForIntegration } from "@/lib/ga4/fetchData";

export async function POST(request: Request) {
  const token = request.headers.get("x-cron-token");
  if (token !== env.CRON_JOB_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const gscIntegrations = await prisma.integration.findMany({
    where: { type: "SEARCH_CONSOLE", status: "CONNECTED" },
    select: { id: true },
  });

  const ga4Integrations = await prisma.integration.findMany({
    where: { type: "GA4", status: "CONNECTED" },
    select: { id: true },
  });

  let importedGsc = 0;
  for (const integration of gscIntegrations) {
    try {
      importedGsc += await importSearchConsoleForIntegration(integration.id);
    } catch (error) {
      console.error(`Nightly GSC import failed for integration ${integration.id}`, error);
    }
  }

  let importedGa4 = 0;
  for (const integration of ga4Integrations) {
    try {
      importedGa4 += await importGa4ForIntegration(integration.id);
    } catch (error) {
      console.error(`Nightly GA4 import failed for integration ${integration.id}`, error);
    }
  }

  return NextResponse.json({ gsc: importedGsc, ga4: importedGa4 });
}
