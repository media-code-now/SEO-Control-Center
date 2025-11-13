import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { WorkspaceForm } from "@/components/forms/workspace-form";
import { WorkspaceItemForm } from "@/components/forms/workspace-item-form";
import { ProjectForm } from "@/components/forms/project-form";
import { ProjectItemForm } from "@/components/forms/project-item-form";
import { GscConnectCard } from "@/components/settings/GscConnectCard";
import { Ga4ConnectCard } from "@/components/settings/Ga4ConnectCard";
import { AuditLogPanel } from "@/components/settings/AuditLogPanel";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      members: {
        some: { userId: session.user.id },
      },
    },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
        include: {
          integrations: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const workspaceSummaries = workspaces.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    plan: workspace.plan,
  }));

  const projectSummaries = workspaces.flatMap((workspace) =>
    workspace.projects.map((project) => ({
      id: project.id,
      name: project.name,
      domain: project.domain,
      gscSiteUrl: project.gscSiteUrl ?? "",
      ga4PropertyId: project.ga4PropertyId ?? "",
      targetMarket: project.targetMarket,
      workspaceName: workspace.name,
    })),
  );

  const gscProjects = workspaces.flatMap((workspace) =>
    workspace.projects.map((project) => {
      const integration = project.integrations.find((item) => item.type === "SEARCH_CONSOLE");
      return {
        id: project.id,
        name: project.name,
        workspaceName: workspace.name,
        siteUrl: integration?.siteUrl ?? project.gscSiteUrl ?? "",
        connected: integration?.status === "CONNECTED",
        status: integration?.status,
      };
    }),
  );

  const ga4Projects = workspaces.flatMap((workspace) =>
    workspace.projects.map((project) => {
      const integration = project.integrations.find((item) => item.type === "GA4");
      return {
        id: project.id,
        name: project.name,
        workspaceName: workspace.name,
        propertyId: integration?.propertyId ?? project.ga4PropertyId ?? "",
        connected: integration?.status === "CONNECTED",
      };
    }),
  );

  const ownerWorkspaceIds = (session.memberships ?? [])
    .filter((membership) => membership.role === "OWNER")
    .map((membership) => membership.workspaceId);

  const auditLogs = ownerWorkspaceIds.length
    ? await prisma.auditLog.findMany({
        where: { workspaceId: { in: ownerWorkspaceIds } },
        include: {
          workspace: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
    : [];

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Integrations</h1>
        <GscConnectCard projects={gscProjects} />
        <Ga4ConnectCard projects={ga4Projects} />
      </section>

      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="text-sm text-muted-foreground">
            Create collaborative spaces for teams. Owners can rename or remove a workspace.
          </p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <WorkspaceForm />
          <div className="space-y-3">
            {workspaceSummaries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No workspaces yet.
              </div>
            ) : (
              workspaceSummaries.map((workspace) => (
                <WorkspaceItemForm key={workspace.id} workspace={workspace} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold">Projects</h2>
          <p className="text-sm text-muted-foreground">Connect domains with GSC & GA4 identifiers.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <ProjectForm workspaceOptions={workspaceSummaries.map(({ id, name }) => ({ id, name }))} />
          <div className="space-y-3">
            {projectSummaries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No projects yet.
              </div>
            ) : (
              projectSummaries.map((project) => <ProjectItemForm key={project.id} project={project} />)
            )}
          </div>
        </div>
      </section>
      {ownerWorkspaceIds.length ? (
        <section className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">Audit log</h2>
            <p className="text-sm text-muted-foreground">
              Only workspace owners can review who triggered sensitive actions.
            </p>
          </div>
          <AuditLogPanel
            logs={auditLogs.map((log) => ({
              id: log.id,
              action: log.action,
              actorEmail: log.actorEmail,
              createdAt: log.createdAt.toISOString(),
              workspaceName: log.workspace?.name ?? null,
              projectName: log.project?.name ?? null,
              context: (log.context as Record<string, unknown> | null) ?? null,
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
