import "server-only";
import { prisma } from "@/lib/prisma";

type AuditPayload = {
  action: string;
  workspaceId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  actorEmail?: string | null;
  context?: Record<string, unknown>;
};

export async function recordAudit({
  action,
  workspaceId,
  projectId,
  userId,
  actorEmail,
  context,
}: AuditPayload) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        workspaceId,
        projectId,
        userId,
        actorEmail,
        context,
      },
    });
  } catch (error) {
    // Intentionally swallow errors so audit logging never breaks core flows
    console.error("[audit-log]", error);
  }
}
