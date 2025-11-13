"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  taskFormSchema,
  taskStatusSchema,
  taskUpdateSchema,
  type TaskFormValues,
  type TaskStatusValues,
  type TaskUpdateValues,
} from "@/lib/validations/forms";
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

function refreshTasks() {
  revalidatePath("/tasks");
  revalidatePath("/");
}

function handleError(error: unknown) {
  if (error instanceof Error) {
    return { success: false, error: error.message };
  }
  return { success: false, error: "Unknown error" };
}

export async function createTaskAction(values: TaskFormValues) {
  try {
    const user = await requireUser();
    const parsed = taskFormSchema.parse(values);
    const workspaceId = await assertProjectAccess(user.id, parsed.projectId);

    const maxOrder = await prisma.task.aggregate({
      where: { projectId: parsed.projectId, status: parsed.status },
      _max: { order: true },
    });

    const task = await prisma.task.create({
      data: {
        projectId: parsed.projectId,
        title: parsed.title,
        description: parsed.description,
        status: parsed.status,
        priority: parsed.priority,
        type: parsed.type,
        scoreCurrent: parsed.scoreCurrent,
        scorePotential: parsed.scorePotential,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        contentBriefId: parsed.contentBriefId ?? null,
        createdById: user.id,
        order: (maxOrder._max.order ?? -1) + 1,
      },
    });
    await recordAudit({
      action: "task.create",
      workspaceId,
      projectId: parsed.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { taskId: task.id, status: parsed.status, type: parsed.type },
    });

    refreshTasks();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateTaskAction(values: TaskUpdateValues) {
  try {
    const user = await requireUser();
    const parsed = taskUpdateSchema.parse(values);
    const task = await prisma.task.findUnique({
      where: { id: parsed.id },
      select: { projectId: true },
    });
    if (!task) {
      throw new Error("Task not found");
    }
    const workspaceId = await assertProjectAccess(user.id, task.projectId);

    await prisma.task.update({
      where: { id: parsed.id },
      data: {
        title: parsed.title,
        description: parsed.description,
        priority: parsed.priority,
        type: parsed.type,
        scoreCurrent: parsed.scoreCurrent,
        scorePotential: parsed.scorePotential,
        status: parsed.status,
        dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
        contentBriefId: parsed.contentBriefId ?? null,
      },
    });
    await recordAudit({
      action: "task.update",
      workspaceId,
      projectId: task.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { taskId: parsed.id, status: parsed.status },
    });

    refreshTasks();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const user = await requireUser();
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { projectId: true },
    });
    if (!task) {
      throw new Error("Task not found");
    }
    const workspaceId = await assertProjectAccess(user.id, task.projectId);
    await prisma.task.delete({ where: { id: taskId } });
    await recordAudit({
      action: "task.delete",
      workspaceId,
      projectId: task.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { taskId },
    });
    refreshTasks();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

export async function updateTaskStatusAction(values: TaskStatusValues & { projectId: string }) {
  try {
    const user = await requireUser();
    const workspaceId = await assertProjectAccess(user.id, values.projectId);

    await prisma.task.update({
      where: { id: values.id },
      data: {
        status: values.status,
        order: values.order,
      },
    });
    await recordAudit({
      action: "task.status.update",
      workspaceId,
      projectId: values.projectId,
      userId: user.id,
      actorEmail: user.email ?? undefined,
      context: { taskId: values.id, status: values.status },
    });

    refreshTasks();
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}
