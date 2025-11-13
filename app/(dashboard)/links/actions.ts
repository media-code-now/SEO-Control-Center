"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { prospectFormSchema, emailTemplateSchema, mailMergeSchema } from "@/lib/validations/prospect";
import type { ProspectStage } from "@prisma/client";
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

function refreshLinks() {
  revalidatePath("/links");
}

export async function createProspectAction(formData: unknown) {
  try {
    const user = await requireUser();
    const parsed = prospectFormSchema.parse(formData);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);
    await prisma.prospect.create({
      data: {
        projectId: parsed.projectId,
        domain: parsed.domain,
        contact: parsed.contact,
        email: parsed.email || null,
        stage: parsed.stage as ProspectStage,
        authority: parsed.authority,
        notes: parsed.notes,
        templateId: parsed.templateId ?? null,
      },
    });
    await recordAudit({
      action: "prospect.create",
      projectId: parsed.projectId,
      workspaceId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { domain: parsed.domain, stage: parsed.stage },
    });
    refreshLinks();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to create prospect" };
  }
}

export async function updateProspectStageAction(values: { id: string; stage: ProspectStage }) {
  try {
    const user = await requireUser();
    const prospect = await prisma.prospect.findUnique({
      where: { id: values.id },
      select: { projectId: true },
    });
    if (!prospect) {
      throw new Error("Prospect not found");
    }
    const workspaceId = await assertProjectAccess(user.id, prospect.projectId);
    await prisma.prospect.update({
      where: { id: values.id },
      data: { stage: values.stage },
    });
    await recordAudit({
      action: "prospect.stage.update",
      workspaceId,
      projectId: prospect.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { prospectId: values.id, stage: values.stage },
    });
    refreshLinks();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to update prospect" };
  }
}

export async function createEmailTemplateAction(formData: unknown) {
  try {
    const user = await requireUser();
    const parsed = emailTemplateSchema.parse(formData);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);
    await prisma.emailTemplate.create({
      data: parsed,
    });
    await recordAudit({
      action: "template.create",
      workspaceId,
      projectId: parsed.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { name: parsed.name },
    });
    refreshLinks();
    return { success: true };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to save template" };
  }
}

export async function exportMailMergeAction(formData: unknown) {
  try {
    const user = await requireUser();
    const parsed = mailMergeSchema.parse(formData);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);
    const prospects = await prisma.prospect.findMany({
      where: {
        projectId: parsed.projectId,
        stage: parsed.stage ?? undefined,
      },
      orderBy: { createdAt: "asc" },
    });
    const rows = [
      ["domain", "contact", "email", "stage", "authority", "notes"],
      ...prospects.map((prospect) => [
        prospect.domain,
        prospect.contact ?? "",
        prospect.email ?? "",
        prospect.stage,
        String(prospect.authority),
        (prospect.notes ?? "").replace(/"/g, '""'),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n");
    await recordAudit({
      action: "mailmerge.export",
      workspaceId,
      projectId: parsed.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { rows: prospects.length, stage: parsed.stage ?? "all" },
    });
    return { success: true, csv };
  } catch (error) {
    if (error instanceof Error) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Unable to export CSV" };
  }
}
