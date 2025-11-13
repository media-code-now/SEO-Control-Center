import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

async function resolveProject(userId: string, projectId?: string | null) {
  if (projectId) {
    return prisma.project.findUnique({ where: { id: projectId } });
  }

  return prisma.project.findFirst({
    where: {
      workspace: {
        members: {
          some: { userId },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const projectId = url.searchParams.get("projectId");
  const project = await resolveProject(session.user.id, projectId);

  if (!project) {
    return NextResponse.json({ data: [] });
  }

  const keywords = await prisma.keyword.findMany({ where: { projectId: project.id }, include: { snapshots: true } });
  return NextResponse.json({ data: keywords });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { phrase, projectId } = body as { phrase?: string; projectId?: string };

  if (!phrase || !projectId) {
    return NextResponse.json({ error: "Missing phrase or projectId" }, { status: 400 });
  }

  const project = await resolveProject(session.user.id, projectId);
  if (!project || project.id !== projectId) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const result = await prisma.keyword.upsert({
    where: { projectId_phrase: { projectId: project.id, phrase } },
    update: {},
    create: {
      phrase,
      projectId: project.id,
      userId: session.user.id,
      searchVolume: 0,
      snapshots: {
        create: { position: 50, traffic: 0 },
      },
    },
  });

  return NextResponse.json({ data: result });
}
