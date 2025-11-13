"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  projectFormSchema,
  projectUpdateSchema,
  workspaceFormSchema,
  workspaceUpdateSchema,
  type ProjectFormValues,
  type ProjectUpdateValues,
  type WorkspaceFormValues,
  type WorkspaceUpdateValues,
} from "@/lib/validations/forms";
import { WorkspaceRole } from "@prisma/client";

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

async function requireSessionUser() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  return session.user;
}

async function assertWorkspaceAccess(userId: string, workspaceId: string) {
  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
  if (!membership) {
    throw new Error("Not a workspace member");
  }
  return membership.role;
}

function handleError(error: unknown) {
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Unknown error" };
}

export async function createWorkspaceAction(values: WorkspaceFormValues) {
  try {
    const user = await requireSessionUser();
    const parsed = workspaceFormSchema.parse(values);
    const slug = normalizeSlug(parsed.slug);

    const workspace = await prisma.workspace.create({
      data: {
        name: parsed.name.trim(),
        slug,
        plan: "pro",
        ownerId: user.id,
      },
    });

    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        role: WorkspaceRole.OWNER,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateWorkspaceAction(values: WorkspaceUpdateValues) {
  try {
    const user = await requireSessionUser();
    const parsed = workspaceUpdateSchema.parse(values);
    const role = await assertWorkspaceAccess(user.id, parsed.id);

    if (role !== WorkspaceRole.OWNER) {
      throw new Error("Only owners can update workspace settings");
    }

    await prisma.workspace.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name.trim(),
        slug: normalizeSlug(parsed.slug),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteWorkspaceAction(workspaceId: string) {
  try {
    const user = await requireSessionUser();
    const role = await assertWorkspaceAccess(user.id, workspaceId);

    if (role !== WorkspaceRole.OWNER) {
      throw new Error("Only owners can delete workspaces");
    }

    await prisma.workspace.delete({ where: { id: workspaceId } });
    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function createProjectAction(values: ProjectFormValues) {
  try {
    const user = await requireSessionUser();
    const parsed = projectFormSchema.parse(values);
    await assertWorkspaceAccess(user.id, parsed.workspaceId);

    await prisma.project.create({
      data: {
        workspaceId: parsed.workspaceId,
        name: parsed.name.trim(),
        domain: parsed.domain.trim(),
        targetMarket: parsed.targetMarket?.trim() || null,
        gscSiteUrl: parsed.gscSiteUrl.trim(),
        ga4PropertyId: parsed.ga4PropertyId.trim(),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateProjectAction(values: ProjectUpdateValues) {
  try {
    const user = await requireSessionUser();
    const parsed = projectUpdateSchema.parse(values);

    const project = await prisma.project.findUnique({
      where: { id: parsed.id },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await assertWorkspaceAccess(user.id, project.workspaceId);

    await prisma.project.update({
      where: { id: parsed.id },
      data: {
        name: parsed.name.trim(),
        domain: parsed.domain.trim(),
        targetMarket: parsed.targetMarket?.trim() || null,
        gscSiteUrl: parsed.gscSiteUrl.trim(),
        ga4PropertyId: parsed.ga4PropertyId.trim(),
      },
    });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteProjectAction(projectId: string) {
  try {
    const user = await requireSessionUser();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { workspaceId: true },
    });

    if (!project) {
      throw new Error("Project not found");
    }

    await assertWorkspaceAccess(user.id, project.workspaceId);
    await prisma.project.delete({ where: { id: projectId } });

    revalidatePath("/settings");
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}
