"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { contentCalendarFormSchema, briefGeneratorSchema } from "@/lib/validations/content";
import { buildBrief } from "@/lib/content/generator";
import type { ContentStatus } from "@prisma/client";
import { recordAudit } from "@/lib/audit";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function assertProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) {
    throw new Error("Project not found");
  }

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: project.workspaceId, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Forbidden");
  }
  return project.workspaceId;
}

function refreshContent() {
  revalidatePath("/content");
  revalidatePath("/tasks");
}

export async function createContentCalendarItemAction(formData: unknown) {
  try {
    const user = await requireUser();
    const parsed = contentCalendarFormSchema.parse(formData);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);
    await prisma.contentCalendarItem.create({
      data: {
        projectId: parsed.projectId,
        title: parsed.title,
        status: parsed.status as ContentStatus,
        owner: parsed.owner,
        publishDate: new Date(parsed.publishDate),
        draftLink: parsed.draftLink || null,
        briefId: parsed.briefId ?? null,
        notes: parsed.notes,
      },
    });
    await recordAudit({
      action: "content.calendar.create",
      projectId: parsed.projectId,
      workspaceId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { title: parsed.title, publishDate: parsed.publishDate, status: parsed.status },
    });
    refreshContent();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to create calendar item" };
  }
}

export async function updateContentCalendarStatusAction(values: { id: string; status: ContentStatus }) {
  try {
    const user = await requireUser();
    const item = await prisma.contentCalendarItem.findUnique({
      where: { id: values.id },
      select: { projectId: true },
    });
    if (!item) {
      throw new Error("Calendar item not found");
    }
    await assertProjectAccess(user.id, item.projectId);
    await prisma.contentCalendarItem.update({
      where: { id: values.id },
      data: { status: values.status },
    });
    refreshContent();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to update status" };
  }
}

export async function generateBriefAction(formData: unknown) {
  try {
    const user = await requireUser();
    const parsed = briefGeneratorSchema.parse(formData);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);

    const internalPages = await prisma.page.findMany({
      where: { projectId: parsed.projectId },
      orderBy: { createdAt: "asc" },
      take: 5,
    });
    const internalTargets = internalPages.map((page) => ({
      title: page.title ?? page.url,
      url: page.url,
    }));

    const brief = buildBrief(parsed.keyword, {
      intent: parsed.intent,
      audience: parsed.audience,
      internalLinks: internalTargets,
    });

    const created = await prisma.contentBrief.create({
      data: {
        projectId: parsed.projectId,
        keyword: parsed.keyword,
        title: brief.title,
        outline: brief.outline,
        questions: brief.questions,
        entities: brief.entities,
        internalLinks: brief.internalLinks,
        competitorOutlines: brief.competitorOutlines,
      },
    });

    await recordAudit({
      action: "content.brief.generate",
      workspaceId,
      projectId: parsed.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { keyword: parsed.keyword, briefId: created.id },
    });

    refreshContent();
    return { success: true, brief: created };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to generate brief" };
  }
}
