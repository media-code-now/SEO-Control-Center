import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateLinkSuggestionsForProject } from "@/lib/linking/linkOpportunities";
import { recordAudit } from "@/lib/audit";

export async function POST(_: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    select: { workspaceId: true },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId: session.user.id } },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const suggestions = await generateLinkSuggestionsForProject(params.id);
  await recordAudit({
    action: "links.suggest",
    workspaceId: project.workspaceId,
    projectId: params.id,
    userId: session.user.id,
    actorEmail: session.user.email ?? undefined,
    context: { created: suggestions.length },
  });

  return NextResponse.json({ suggestions });
}
