import { NextResponse } from "next/server";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { generateLinkSuggestionsForProject } from "@/lib/linking/linkOpportunities";

export async function GET() {
  const projects = await prisma.project.findMany({
    select: { id: true, status: true },
  });

  const results = [];
  for (const project of projects) {
    if (project.status !== ProjectStatus.ACTIVE) continue;
    const suggestions = await generateLinkSuggestionsForProject(project.id, { maxPerProject: 20 });
    results.push({ projectId: project.id, created: suggestions.length });
  }

  return NextResponse.json({ ok: true, results });
}
