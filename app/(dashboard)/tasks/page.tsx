import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskBoard, type TaskCardData } from "@/components/tasks/TaskBoard";

interface TasksPageProps {
  searchParams?: {
    workspaceId?: string;
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to manage tasks.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];
  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before building a task board.</p>;
  }

  const [tasks, briefs] = await Promise.all([
    prisma.task.findMany({
      where: { projectId: activeProject.id },
      orderBy: [{ status: "asc" }, { order: "asc" }],
      include: { contentBrief: { select: { id: true, title: true } } },
    }),
    prisma.contentBrief.findMany({
      where: { projectId: activeProject.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, keyword: true },
    }),
  ]);

  const cards: TaskCardData[] = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    type: task.type,
    scoreCurrent: task.scoreCurrent,
    scorePotential: task.scorePotential,
    dueDate: task.dueDate?.toISOString() ?? null,
    contentBriefId: task.contentBriefId ?? null,
    contentBriefTitle: task.contentBrief?.title ?? null,
  }));

  return <TaskBoard projectId={activeProject.id} tasks={cards} briefs={briefs} />;
}
