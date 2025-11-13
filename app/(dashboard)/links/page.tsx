import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProspectTable, type ProspectRow } from "@/components/links/ProspectTable";
import { ProspectForm } from "@/components/links/ProspectForm";
import { TemplateManager } from "@/components/links/TemplateManager";
import { MailMergeExporter } from "@/components/links/MailMergeExporter";
import { PROSPECT_STAGE_LABELS } from "@/lib/outreach/constants";

export default async function LinksPage({ searchParams }: { searchParams?: { workspaceId?: string } }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to manage outreach prospects.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];
  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before tracking outreach.</p>;
  }

  const [prospects, templates] = await Promise.all([
    prisma.prospect.findMany({
      where: { projectId: activeProject.id },
      include: { template: { select: { name: true } } },
      orderBy: [{ stage: "asc" }, { authority: "desc" }],
    }),
    prisma.emailTemplate.findMany({
      where: { projectId: activeProject.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const prospectRows: ProspectRow[] = prospects.map((prospect) => ({
    id: prospect.id,
    domain: prospect.domain,
    contact: prospect.contact,
    email: prospect.email,
    stage: prospect.stage,
    authority: prospect.authority,
    notes: prospect.notes,
    templateName: prospect.template?.name ?? null,
  }));

  const templateOptions = templates.map((template) => ({ id: template.id, name: template.name }));

  const stageSummary = prospects.reduce<Record<string, number>>((acc, prospect) => {
    acc[prospect.stage] = (acc[prospect.stage] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Prospect manager</h1>
        <p className="text-sm text-muted-foreground">Track outreach targets, templates, and wins.</p>
      </div>
      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Stage summary</p>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          {Object.entries(PROSPECT_STAGE_LABELS).map(([stage, label]) => (
            <div key={stage} className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-semibold">{stageSummary[stage] ?? 0}</p>
            </div>
          ))}
        </div>
      </div>
      <ProspectTable prospects={prospectRows} />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <ProspectForm projectId={activeProject.id} templates={templateOptions} />
        <TemplateManager projectId={activeProject.id} templates={templates} />
      </div>
      <MailMergeExporter projectId={activeProject.id} />
    </div>
  );
}
