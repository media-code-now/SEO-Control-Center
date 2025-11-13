"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  pageFormSchema,
  pageUpdateSchema,
  type PageFormValues,
  type PageUpdateValues,
} from "@/lib/validations/forms";

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

function handleError(error: unknown) {
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Unknown error" };
}

function refreshPagesViews() {
  revalidatePath("/pages");
  revalidatePath("/keywords");
  revalidatePath("/");
}

function toDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

export async function createPageAction(values: PageFormValues) {
  try {
    const user = await requireUser();
    const parsed = pageFormSchema.parse(values);
    await assertProjectAccess(user.id, parsed.projectId);

    await prisma.page.create({
      data: {
        projectId: parsed.projectId,
        url: parsed.url.trim(),
        pageType: parsed.pageType.trim(),
        status: parsed.status.trim(),
        owner: parsed.owner?.trim(),
        lastCrawl: toDate(parsed.lastCrawl),
      },
    });

    refreshPagesViews();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updatePageAction(values: PageUpdateValues) {
  try {
    const user = await requireUser();
    const parsed = pageUpdateSchema.parse(values);

    const page = await prisma.page.findUnique({
      where: { id: parsed.id },
      select: { projectId: true },
    });
    if (!page) {
      throw new Error("Page not found");
    }
    await assertProjectAccess(user.id, page.projectId);

    await prisma.page.update({
      where: { id: parsed.id },
      data: {
        url: parsed.url.trim(),
        pageType: parsed.pageType.trim(),
        status: parsed.status.trim(),
        owner: parsed.owner?.trim(),
        lastCrawl: toDate(parsed.lastCrawl),
      },
    });

    refreshPagesViews();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deletePageAction(pageId: string) {
  try {
    const user = await requireUser();
    const page = await prisma.page.findUnique({
      where: { id: pageId },
      select: { projectId: true },
    });
    if (!page) {
      throw new Error("Page not found");
    }
    await assertProjectAccess(user.id, page.projectId);
    await prisma.page.delete({ where: { id: pageId } });
    refreshPagesViews();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}
