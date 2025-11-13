import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentCalendar, type CalendarEntry } from "@/components/content/ContentCalendar";
import { CalendarForm } from "@/components/content/CalendarForm";
import { BriefGenerator } from "@/components/content/BriefGenerator";
import { BriefList, type BriefSummary } from "@/components/content/BriefList";

interface ContentPageProps {
  searchParams?: {
    workspaceId?: string;
    month?: string;
  };
}

function parseMonth(input?: string) {
  if (!input) return new Date();
  const [year, month] = input.split("-").map((value) => Number.parseInt(value, 10));
  if (!year || Number.isNaN(year) || !month || Number.isNaN(month)) {
    return new Date();
  }
  return new Date(year, month - 1, 1);
}

function formatMonthParam(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
}

function parseLinkArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { title?: string; url?: string } => typeof item === "object" && item !== null)
    .map((item) => ({
      title: typeof item.title === "string" ? item.title : "Internal link",
      url: typeof item.url === "string" ? item.url : "#",
    }));
}

function parseCompetitors(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is { name?: string; headline?: string; angle?: string; cta?: string } => typeof item === "object" && item !== null)
    .map((item) => ({
      name: typeof item.name === "string" ? item.name : "Competitor",
      headline: typeof item.headline === "string" ? item.headline : undefined,
      angle: typeof item.angle === "string" ? item.angle : undefined,
      cta: typeof item.cta === "string" ? item.cta : undefined,
    }));
}

export default async function ContentPage({ searchParams }: ContentPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to manage content planning.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];
  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before building a content calendar.</p>;
  }

  const monthDate = parseMonth(searchParams?.month);
  const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const startOfNextMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);

  const [calendarItems, briefs] = await Promise.all([
    prisma.contentCalendarItem.findMany({
      where: {
        projectId: activeProject.id,
        publishDate: { gte: startOfMonth, lt: startOfNextMonth },
      },
      include: { brief: { select: { title: true } } },
      orderBy: { publishDate: "asc" },
    }),
    prisma.contentBrief.findMany({
      where: { projectId: activeProject.id },
      include: { tasks: { select: { id: true, title: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const calendarEntries: CalendarEntry[] = calendarItems.map((item) => ({
    id: item.id,
    title: item.title,
    status: item.status,
    owner: item.owner,
    publishDate: item.publishDate.toISOString(),
    draftLink: item.draftLink,
    briefTitle: item.brief?.title ?? null,
  }));

  const briefSummaries: BriefSummary[] = briefs.map((brief) => ({
    id: brief.id,
    title: brief.title,
    keyword: brief.keyword,
    createdAt: brief.createdAt.toISOString(),
    questions: brief.questions ?? [],
    entities: brief.entities ?? [],
    internalLinks: parseLinkArray(brief.internalLinks),
    competitorOutlines: parseCompetitors(brief.competitorOutlines),
    tasks: brief.tasks,
  }));

  const briefOptions = briefs.map((brief) => ({ id: brief.id, title: brief.title }));

  const prevMonth = new Date(monthDate);
  prevMonth.setMonth(prevMonth.getMonth() - 1);
  const nextMonth = new Date(monthDate);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  const monthLabel = monthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Content calendar</h1>
          <p className="text-sm text-muted-foreground">Plan briefs, drafts, and publish dates.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link
            href={`?month=${formatMonthParam(prevMonth)}`}
            className="rounded-full border border-white/10 px-3 py-1 text-muted-foreground hover:text-white"
          >
            ←
          </Link>
          <span className="w-32 text-center font-semibold">{monthLabel}</span>
          <Link
            href={`?month=${formatMonthParam(nextMonth)}`}
            className="rounded-full border border-white/10 px-3 py-1 text-muted-foreground hover:text-white"
          >
            →
          </Link>
        </div>
      </div>
      <ContentCalendar entries={calendarEntries} month={monthDate} />
      <div className="gap-6 lg:grid lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Brief generator</h2>
          <BriefGenerator projectId={activeProject.id} />
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Schedule content</h2>
          <CalendarForm projectId={activeProject.id} briefs={briefOptions} />
        </div>
      </div>
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Saved briefs</h2>
        <BriefList briefs={briefSummaries} />
      </div>
    </div>
  );
}
