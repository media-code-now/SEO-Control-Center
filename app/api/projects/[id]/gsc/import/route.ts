import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { importSearchConsoleForProject } from "@/lib/gsc/fetchData";
import { recordAudit } from "@/lib/audit";

interface RouteParams {
  params: {
    id: string;
  };
}

export async function POST(_request: Request, { params }: RouteParams) {
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
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const imported = await importSearchConsoleForProject(params.id);
    await recordAudit({
      action: "gsc.import",
      projectId: params.id,
      workspaceId: project.workspaceId,
      userId: session.user.id,
      actorEmail: session.user.email ?? undefined,
      context: { rows: imported?.rows ?? 0 },
    });
    return NextResponse.json({ imported });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Import failed" }, { status: 400 });
  }
}
