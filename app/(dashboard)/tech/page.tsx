import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TechSnapshots, type SnapshotCard } from "@/components/tech/TechSnapshots";
import { AuditTable, type AuditRow } from "@/components/tech/AuditTable";
import { AuditDialog } from "@/components/tech/AuditDialog";
import { DEFAULT_AUDIT_TYPES } from "@/lib/tech/constants";

interface TechPageProps {
  searchParams?: {
    workspaceId?: string;
    type?: string;
    from?: string;
    to?: string;
  };
}

function jsonToRecord(value: Prisma.JsonValue | null): Record<string, number | string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number | string>>((acc, [key, val]) => {
    if (typeof val === "number" || typeof val === "string") {
      acc[key] = val;
    }
    return acc;
  }, {});
}

function extractSummary(value: Prisma.JsonValue | null) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { impact: null, recommendation: null, detectedAt: null };
  }
  const record = value as Record<string, unknown>;
  return {
    impact: typeof record.impact === "string" ? record.impact : null,
    recommendation: typeof record.recommendation === "string" ? record.recommendation : null,
    detectedAt: typeof record.detectedAt === "string" ? record.detectedAt : null,
  };
}

export default async function TechPage({ searchParams }: TechPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to review tech health.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];
  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before reviewing tech audits.</p>;
  }

  const [snapshotRecords, audits] = await Promise.all([
    prisma.techSnapshot.findMany({
      where: { projectId: activeProject.id },
      orderBy: { capturedAt: "desc" },
    }),
    prisma.audit.findMany({
      where: { projectId: activeProject.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  const seenTypes = new Set<string>();
  const latestSnapshots: SnapshotCard[] = [];
  snapshotRecords.forEach((snapshot) => {
    if (seenTypes.has(snapshot.type)) return;
    seenTypes.add(snapshot.type);
    latestSnapshots.push({
      id: snapshot.id,
      type: snapshot.type,
      metrics: jsonToRecord(snapshot.metrics),
      notes: snapshot.notes,
      capturedAt: snapshot.capturedAt.toISOString(),
    });
  });

  const auditRows: AuditRow[] = audits.map((audit) => {
    const summary = extractSummary(audit.summary);
    return {
      id: audit.id,
      title: audit.title,
      type: audit.type,
      status: audit.status,
      score: audit.score,
      impact: summary.impact,
      recommendation: summary.recommendation,
      detectedAt: summary.detectedAt ?? audit.finishedAt?.toISOString() ?? audit.createdAt.toISOString(),
      createdAt: audit.createdAt.toISOString(),
    };
  });

  const typeOptions = Array.from(new Set<string>([...DEFAULT_AUDIT_TYPES, ...auditRows.map((row) => row.type)]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tech health</h1>
          <p className="text-sm text-muted-foreground">
            Track Core Web Vitals, indexation, status codes, and manual findings.
          </p>
        </div>
        <AuditDialog projectId={activeProject.id} suggestedTypes={typeOptions} />
      </div>
      <TechSnapshots snapshots={latestSnapshots} />
      <AuditTable
        rows={auditRows}
        typeOptions={typeOptions}
        initialType={searchParams?.type}
        initialStartDate={searchParams?.from}
        initialEndDate={searchParams?.to}
      />
    </div>
  );
}
