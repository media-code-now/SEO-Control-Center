import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { aggregateTraffic } from "@/lib/charts";
import { KeywordTable } from "@/components/keywords/KeywordTable";
import { TrafficChart } from "@/components/analytics/TrafficChart";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getGscOverview, getTopPageOpportunities, getGa4Overview } from "@/app/(dashboard)/actions";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { GscTrendChart } from "@/components/dashboard/GscTrendChart";
import { TopPageOpportunities } from "@/components/dashboard/TopPageOpportunities";

type DashboardPageProps = {
  searchParams?: {
    workspaceId?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();

  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matchingWorkspace = memberships.find((workspace) => workspace.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matchingWorkspace?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-slate-600">
        <p>You are not a member of any workspace yet.</p>
        <p className="text-sm">Ask an owner to invite you or seed the database.</p>
      </div>
    );
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: {
      projects: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const projects = workspace?.projects ?? [];
  const [activeProject] = projects;

  if (!activeProject) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-slate-600">
        <p>Select or create a project to unlock dashboard insights.</p>
      </div>
    );
  }

  const [gscOverview, ga4Overview, pageOpportunities, keywords] = await Promise.all([
    getGscOverview(activeProject.id),
    getGa4Overview(activeProject.id),
    getTopPageOpportunities(activeProject.id),
    prisma.keyword.findMany({
      where: { projectId: activeProject.id },
      include: { snapshots: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const trafficRaw = aggregateTraffic(keywords);
  const traffic =
    trafficRaw.length > 0
      ? trafficRaw
      : [{ date: new Date().toISOString().slice(0, 10), traffic: 0 }];
  const keywordRows = keywords.map((keyword) => ({
    id: keyword.id,
    phrase: keyword.phrase,
    avgPosition:
      keyword.snapshots.length > 0
        ? keyword.snapshots.reduce((acc, snapshot) => acc + snapshot.position, 0) / keyword.snapshots.length
        : 50,
    volume: keyword.searchVolume,
    trafficShare:
      keyword.snapshots.length > 0
        ? keyword.snapshots[keyword.snapshots.length - 1].traffic / Math.max(keyword.searchVolume, 1)
        : 0,
  }));

  async function createKeyword(formData: FormData) {
    "use server";

    const phrase = formData.get("phrase");
    const projectId = formData.get("projectId");

    if (typeof phrase !== "string" || phrase.trim().length === 0) {
      return;
    }

    if (typeof projectId !== "string" || projectId.length === 0) {
      return;
    }

    const session = await auth();
    if (!session?.user) {
      redirect("/signin");
    }
    const normalizedPhrase = phrase.trim();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });

    if (!project) {
      return;
    }

    await prisma.keyword.upsert({
      where: { projectId_phrase: { projectId: project.id, phrase: normalizedPhrase } },
      update: {},
      create: {
        phrase: normalizedPhrase,
        userId: session.user.id,
        projectId: project.id,
        searchVolume: 0,
        snapshots: {
          create: {
            position: 50,
            traffic: 0,
          },
        },
      },
    });

    const workspaceQuery = `/?workspaceId=${project.workspaceId}`;
    revalidatePath(workspaceQuery);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-lg border bg-white p-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-500">Workspace</p>
          <h2 className="text-xl font-semibold">{workspace?.name ?? "Unknown workspace"}</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          {memberships.map((membership) => {
            const isActive = membership.workspaceId === activeWorkspaceId;
            return (
              <Link
                key={membership.workspaceId}
                href={`/?workspaceId=${membership.workspaceId}`}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm",
                  isActive ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-600 hover:border-brand/40",
                )}
              >
                <span className="font-medium">{membership.workspaceName}</span>
                <span className="ml-2 text-xs uppercase tracking-wide text-slate-500">{membership.role}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-5">
        <MetricCard label="GSC clicks" value={formatNumber(gscOverview.totals.clicks)} helper="Last 28 days" />
        <MetricCard label="Impressions" value={formatNumber(gscOverview.totals.impressions)} helper="Last 28 days" />
        <MetricCard label="Avg. position" value={`#${gscOverview.totals.avgPosition.toFixed(1)}`} helper="Rolling average" />
        <MetricCard label="Conversions" value={formatNumber(ga4Overview.conversions)} helper="Last 28 days" />
        <MetricCard
          label="Conversion rate"
          value={`${(ga4Overview.conversionRate * 100).toFixed(1)}%`}
          helper={`${formatNumber(ga4Overview.sessions)} sessions`}
        />
      </section>

      <GscTrendChart data={gscOverview.series} />

      <section className="rounded-lg border bg-card/80 p-4">
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">High impact pages</p>
          <h3 className="text-lg font-semibold">Top opportunities</h3>
        </div>
        <TopPageOpportunities pages={pageOpportunities} />
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-500">Projects</p>
            <h3 className="text-2xl font-semibold">{projects.length || "No"} projects</h3>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="border-slate-200">
              <CardContent className="space-y-1 py-4">
                <p className="text-sm text-slate-500">{project.domain}</p>
                <h4 className="text-lg font-semibold">{project.name}</h4>
                <p className="text-xs uppercase tracking-wide text-slate-400">{project.status}</p>
              </CardContent>
            </Card>
          ))}
          {projects.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-slate-500">
              No projects yet. Add one via Prisma seed or future UI.
            </div>
          )}
        </div>
      </section>

      <div className="space-y-6">
        <TrafficChart data={traffic} />
        <KeywordTable data={keywordRows} onCreate={createKeyword} projectId={activeProject.id} />
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}
