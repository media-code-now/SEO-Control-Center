"use server";

import { revalidatePath } from "next/cache";
import { AuditStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { auditFormSchema, type AuditFormValues } from "@/lib/validations/forms";

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
}

function refreshTech() {
  revalidatePath("/tech");
  revalidatePath("/");
}

export async function createAuditAction(values: AuditFormValues) {
  try {
    const user = await requireUser();
    const parsed = auditFormSchema.parse(values);
    await assertProjectAccess(user.id, parsed.projectId);

    const detectedAt = parsed.detectedAt ? new Date(parsed.detectedAt) : new Date();
    await prisma.audit.create({
      data: {
        projectId: parsed.projectId,
        title: parsed.title,
        type: parsed.type,
        status: parsed.status as AuditStatus,
        score: parsed.score ?? null,
        summary: {
          impact: parsed.impact,
          recommendation: parsed.recommendation,
          detectedAt: detectedAt.toISOString(),
        },
        findings: parsed.notes ? { notes: parsed.notes } : undefined,
        metadata: { source: "manual", recordedBy: user.email ?? user.id },
        finishedAt: detectedAt,
      },
    });

    refreshTech();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to save audit" };
  }
}
