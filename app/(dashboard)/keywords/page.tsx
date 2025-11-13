import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { KeywordTableView, type KeywordRow, type PageOption } from "@/components/keywords/KeywordTableView";

interface KeywordsPageProps {
  searchParams?: {
    workspaceId?: string;
  };
}

export default async function KeywordsPage({ searchParams }: KeywordsPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const memberships = session.memberships ?? [];
  const requestedWorkspaceId = searchParams?.workspaceId;
  const matching = memberships.find((membership) => membership.workspaceId === requestedWorkspaceId);
  const activeWorkspaceId = matching?.workspaceId ?? session.activeWorkspaceId ?? memberships[0]?.workspaceId ?? null;

  if (!activeWorkspaceId) {
    return <p className="text-sm text-muted-foreground">Join a workspace to manage keywords.</p>;
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: activeWorkspaceId },
    include: { projects: { orderBy: { createdAt: "asc" } } },
  });

  const activeProject = workspace?.projects[0];

  if (!activeProject) {
    return <p className="text-sm text-muted-foreground">Add a project before managing keywords.</p>;
  }

  const [keywordRecords, pageRecords] = await Promise.all([
    prisma.keyword.findMany({
      where: { projectId: activeProject.id },
      include: { mappings: { include: { page: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.page.findMany({
      where: { projectId: activeProject.id },
      select: { id: true, url: true },
      orderBy: { url: "asc" },
    }),
  ]);

  const keywords: KeywordRow[] = keywordRecords.map((keyword) => ({
    id: keyword.id,
    phrase: keyword.phrase,
    intent: keyword.intent ?? "",
    cluster: keyword.cluster ?? "",
    searchVolume: keyword.searchVolume,
    difficulty: keyword.difficulty,
    mappings: keyword.mappings.map((mapping) => ({
      id: mapping.id,
      pageId: mapping.pageId,
      role: mapping.role,
      page: {
        id: mapping.page.id,
        url: mapping.page.url,
      },
    })),
  }));

  const pages: PageOption[] = pageRecords.map((page) => ({ id: page.id, url: page.url }));

  return <KeywordTableView projectId={activeProject.id} keywords={keywords} pages={pages} />;
}
