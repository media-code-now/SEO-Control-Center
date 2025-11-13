"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  keywordFormSchema,
  keywordUpdateSchema,
  keywordMappingSchema,
  type KeywordFormValues,
  type KeywordUpdateValues,
  type KeywordMappingValues,
} from "@/lib/validations/forms";
import { KeywordPageRole } from "@prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function getProjectForKeyword(keywordId: string) {
  const keyword = await prisma.keyword.findUnique({
    where: { id: keywordId },
    select: { projectId: true, project: { select: { workspaceId: true } } },
  });
  if (!keyword) {
    throw new Error("Keyword not found");
  }
  return { projectId: keyword.projectId, workspaceId: keyword.project.workspaceId };
}

async function getWorkspaceMembership(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { id: true },
  });
  if (!membership) {
    throw new Error("Forbidden");
  }
}

async function assertProjectAccess(userId: string, projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { workspaceId: true },
  });
  if (!project) {
    throw new Error("Project not found");
  }
  await getWorkspaceMembership(userId, project.workspaceId);
  return project.workspaceId;
}

function handleError(error: unknown) {
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Unknown error" };
}

function refreshKeywordsViews() {
  revalidatePath("/keywords");
  revalidatePath("/pages");
  revalidatePath("/");
}

export async function createKeywordAction(values: KeywordFormValues) {
  try {
    const user = await requireUser();
    const parsed = keywordFormSchema.parse(values);
    await assertProjectAccess(user.id, parsed.projectId);

    await prisma.keyword.create({
      data: {
        projectId: parsed.projectId,
        userId: user.id,
        phrase: parsed.phrase.trim(),
        intent: parsed.intent.trim(),
        cluster: parsed.cluster.trim(),
        searchVolume: parsed.searchVolume,
        difficulty: parsed.difficulty,
        snapshots: {
          create: {
            position: 50,
            traffic: 0,
          },
        },
      },
    });

    refreshKeywordsViews();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateKeywordAction(values: KeywordUpdateValues) {
  try {
    const user = await requireUser();
    const parsed = keywordUpdateSchema.parse(values);
    const { projectId, workspaceId } = await (async () => {
      const keyword = await prisma.keyword.findUnique({
        where: { id: parsed.id },
        select: { projectId: true, project: { select: { workspaceId: true } } },
      });
      if (!keyword) {
        throw new Error("Keyword not found");
      }
      return { projectId: keyword.projectId, workspaceId: keyword.project.workspaceId };
    })();
    await getWorkspaceMembership(user.id, workspaceId);

    await prisma.keyword.update({
      where: { id: parsed.id },
      data: {
        phrase: parsed.phrase.trim(),
        intent: parsed.intent.trim(),
        cluster: parsed.cluster.trim(),
        searchVolume: parsed.searchVolume,
        difficulty: parsed.difficulty,
      },
    });

    refreshKeywordsViews();
    return { success: true, projectId };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteKeywordAction(keywordId: string) {
  try {
    const user = await requireUser();
    const { projectId, workspaceId } = await getProjectForKeyword(keywordId);
    await getWorkspaceMembership(user.id, workspaceId);
    await prisma.keyword.delete({ where: { id: keywordId } });
    refreshKeywordsViews();
    return { success: true, projectId };
  } catch (error) {
    return handleError(error);
  }
}

export async function upsertKeywordMappingAction(values: KeywordMappingValues) {
  try {
    const user = await requireUser();
    const parsed = keywordMappingSchema.parse(values);
    const { projectId, workspaceId } = await getProjectForKeyword(parsed.keywordId);
    await getWorkspaceMembership(user.id, workspaceId);

    const role = parsed.role as KeywordPageRole;

    await prisma.keywordPageMap.upsert({
      where: { keywordId_pageId: { keywordId: parsed.keywordId, pageId: parsed.pageId } },
      update: { role, status: "active" },
      create: {
        keywordId: parsed.keywordId,
        pageId: parsed.pageId,
        role,
        source: "manual",
      },
    });

    if (role === KeywordPageRole.PRIMARY) {
      await prisma.keyword.update({ where: { id: parsed.keywordId }, data: { targetPageId: parsed.pageId } });
    }

    refreshKeywordsViews();
    return { success: true, projectId };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteKeywordMappingAction(mappingId: string) {
  try {
    const user = await requireUser();
    const mapping = await prisma.keywordPageMap.findUnique({
      where: { id: mappingId },
      select: { keywordId: true, pageId: true, role: true, keyword: { select: { projectId: true, project: { select: { workspaceId: true } } } } },
    });
    if (!mapping) {
      throw new Error("Mapping not found");
    }
    await getWorkspaceMembership(user.id, mapping.keyword.project.workspaceId);

    await prisma.keywordPageMap.delete({ where: { id: mappingId } });

    if (mapping.role === KeywordPageRole.PRIMARY) {
      await prisma.keyword.update({
        where: { id: mapping.keywordId },
        data: { targetPageId: null },
      });
    }

    refreshKeywordsViews();
    return { success: true, projectId: mapping.keyword.projectId };
  } catch (error) {
    return handleError(error);
  }
}
