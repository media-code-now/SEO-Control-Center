import { TaskPriority, TaskStatus, TaskType } from "@prisma/client";
import { prisma } from "../prisma";

const BLOG_PAGE_TYPES = ["blog", "article", "guide", "content", "news"];
const SIGNATURE_PREFIX = "[link-scout:";

type MoneyTarget = {
  keywordId: string;
  targetPageId: string;
  targetUrl: string;
  targetTitle: string;
  anchors: string[];
};

type BlogPage = Awaited<ReturnType<typeof fetchBlogPages>>[number];

type MatchResult = {
  anchor: string;
  snippet: string;
  confidence: number;
  target: MoneyTarget;
};

export type LinkSuggestionResult = {
  taskId: string;
  anchor: string;
  targetUrl: string;
  blogUrl: string;
  confidence: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function fetchMoneyTargets(projectId: string): Promise<MoneyTarget[]> {
  const keywords = await prisma.keyword.findMany({
    where: { projectId, targetPageId: { not: null } },
    include: { targetPage: true },
  });

  return keywords
    .filter((keyword) => keyword.targetPage && keyword.targetPage.url)
    .map((keyword) => {
      const anchors = Array.from(
        new Set([keyword.phrase, ...(keyword.secondaryTerms ?? [])].map((anchor) => anchor.trim()).filter(Boolean)),
      );

      return {
        keywordId: keyword.id,
        targetPageId: keyword.targetPageId as string,
        targetUrl: keyword.targetPage!.url,
        targetTitle: keyword.targetPage?.title ?? keyword.targetPage?.url ?? "Money page",
        anchors,
      };
    });
}

async function fetchBlogPages(projectId: string) {
  const pages = await prisma.page.findMany({
    where: { projectId },
    include: { content: true },
  });

  return pages.filter((page) => BLOG_PAGE_TYPES.includes((page.pageType ?? "").toLowerCase()) && page.content?.contentText);
}

function buildSignature(blogId: string, targetPageId: string, anchor: string) {
  return `${SIGNATURE_PREFIX}${blogId}:${targetPageId}:${anchor.toLowerCase()}]`;
}

function collectExistingSignatures(projectId: string) {
  return prisma.task
    .findMany({
      where: { projectId, type: TaskType.LINK, description: { contains: SIGNATURE_PREFIX } },
      select: { description: true },
    })
    .then((tasks) => {
      const signatures = new Set<string>();
      const regex = /\[link-scout:[^\]]+\]/g;
      tasks.forEach((task) => {
        if (!task.description) return;
        const matches = task.description.match(regex);
        matches?.forEach((match) => signatures.add(match));
      });
      return signatures;
    });
}

function tokenize(value: string) {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 2);
}

function computeConfidence(anchor: string, snippet: string, targetTitle: string) {
  const anchorFactor = clamp(anchor.length / 30);
  const snippetTokens = tokenize(snippet);
  const topicTokens = new Set(tokenize(targetTitle));
  const topicalHits = snippetTokens.filter((token) => topicTokens.has(token)).length;
  const topicalFactor = topicTokens.size ? topicalHits / topicTokens.size : 0.3;
  const snippetFactor = clamp(snippetTokens.length / 60);

  return clamp(0.35 + anchorFactor * 0.35 + snippetFactor * 0.15 + topicalFactor * 0.15);
}

function extractSnippet(content: string, index: number, length: number) {
  const padding = 80;
  const start = Math.max(0, index - padding);
  const end = Math.min(content.length, index + length + padding);
  return content.slice(start, end).replace(/\s+/g, " ").trim();
}

function findMatchesForTarget(content: string, target: MoneyTarget): MatchResult[] {
  const results: MatchResult[] = [];

  target.anchors.forEach((anchor) => {
    if (!anchor) return;
    const regex = new RegExp(`\\b${escapeRegExp(anchor)}\\b`, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(content)) !== null) {
      const snippet = extractSnippet(content, match.index, anchor.length);
      const confidence = computeConfidence(anchor, snippet, target.targetTitle);
      results.push({ anchor, snippet, confidence, target });
    }
  });

  return results.sort((a, b) => b.confidence - a.confidence);
}

function pickPriority(confidence: number): TaskPriority {
  if (confidence >= 0.75) return TaskPriority.HIGH;
  if (confidence >= 0.55) return TaskPriority.MEDIUM;
  return TaskPriority.LOW;
}

type SuggestionCandidate = MatchResult & {
  blog: BlogPage;
  signature: string;
};

export async function generateLinkSuggestionsForProject(
  projectId: string,
  options?: { maxPerBlog?: number; maxPerProject?: number },
) {
  const maxPerBlog = options?.maxPerBlog ?? 3;
  const maxPerProject = options?.maxPerProject ?? 40;

  const [moneyTargets, blogPages, existingSignatures] = await Promise.all([
    fetchMoneyTargets(projectId),
    fetchBlogPages(projectId),
    collectExistingSignatures(projectId),
  ]);

  if (!moneyTargets.length || !blogPages.length) {
    return [];
  }

  const suggestions: SuggestionCandidate[] = [];
  for (const blog of blogPages) {
    let addedForBlog = 0;
    const content = blog.content?.contentText ?? "";
    if (!content) continue;
    for (const target of moneyTargets) {
      if (blog.id === target.targetPageId) continue;
      if (addedForBlog >= maxPerBlog || suggestions.length >= maxPerProject) break;
      const matches = findMatchesForTarget(content, target);
      if (!matches.length) continue;
      const best = matches[0];
      const signature = buildSignature(blog.id, target.targetPageId, best.anchor);
      if (existingSignatures.has(signature)) continue;
      suggestions.push({ ...best, blog, signature });
      existingSignatures.add(signature);
      addedForBlog += 1;
      if (suggestions.length >= maxPerProject) break;
    }
    if (suggestions.length >= maxPerProject) break;
  }

  if (!suggestions.length) {
    return [];
  }

  const createdTasks = [];
  for (const suggestion of suggestions) {
    const { blog, anchor, snippet, confidence, target, signature } = suggestion;
    const title = `Link ${blog.title ?? blog.url} to ${target.targetTitle}`;
    const descriptionLines = [
      `Anchor suggestion: "${anchor}"`,
      `Source: ${blog.title ?? blog.url}`,
      `Target: ${target.targetTitle} (${target.targetUrl})`,
      `Confidence: ${(confidence * 100).toFixed(0)}%`,
      `Context: ${snippet}`,
      signature,
    ];

    const task = await prisma.task.create({
      data: {
        projectId,
        title,
        description: descriptionLines.join("\n"),
        status: TaskStatus.OPEN,
        priority: pickPriority(confidence),
        type: TaskType.LINK,
        scoreCurrent: 0,
        scorePotential: Math.round(confidence * 100),
      },
    });
    createdTasks.push({
      taskId: task.id,
      anchor,
      targetUrl: target.targetUrl,
      blogUrl: blog.url,
      confidence,
    });
  }

  return createdTasks as LinkSuggestionResult[];
}
