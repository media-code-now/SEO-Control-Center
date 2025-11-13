import {
  AuditStatus,
  IntegrationStatus,
  IntegrationType,
  NotificationType,
  PrismaClient,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
  TechSnapshotType,
  WorkspaceRole,
} from "@prisma/client";

const prisma = new PrismaClient();

const daysAgo = (days: number) => new Date(Date.now() - days * 86_400_000);
const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

const blogArticleText =
  "Scaling organic revenue requires weaving your money pages into every supporting article. This blog explores how keyword tracking software, an SEO dashboard, and smart internal links accelerate growth. By referencing our SEO platform features directly inside editorial guides, we nudge readers toward demos and trials. The content dives into reporting workflows, automation tips, and the exact strategy our SEO dashboard customers use to uncover new opportunities. Finally, we highlight how the Example.com platform unifies keyword tracking, dashboards, and workflow automation for digital teams.";

const blogArticleHtml = `<p>${blogArticleText}</p>`;

async function main() {
  const [founder, analyst] = await Promise.all([
    prisma.user.upsert({
      where: { email: "founder@example.com" },
      update: { name: "Founder" },
      create: {
        email: "founder@example.com",
        name: "Founder",
      },
    }),
    prisma.user.upsert({
      where: { email: "analyst@example.com" },
      update: { name: "Growth Analyst" },
      create: {
        email: "analyst@example.com",
        name: "Growth Analyst",
      },
    }),
  ]);

  const workspace = await prisma.workspace.upsert({
    where: { slug: "alpha-growth" },
    update: { name: "Alpha Growth" },
    create: {
      name: "Alpha Growth",
      slug: "alpha-growth",
      plan: "pro",
      ownerId: founder.id,
    },
  });

  await Promise.all([
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: founder.id } },
      update: { role: WorkspaceRole.OWNER },
      create: {
        workspaceId: workspace.id,
        userId: founder.id,
        role: WorkspaceRole.OWNER,
      },
    }),
    prisma.workspaceMember.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: analyst.id } },
      update: { role: WorkspaceRole.ANALYST },
      create: {
        workspaceId: workspace.id,
        userId: analyst.id,
        role: WorkspaceRole.ANALYST,
        invitedById: founder.id,
      },
    }),
  ]);

  const project = await prisma.project.upsert({
    where: { workspaceId_domain: { workspaceId: workspace.id, domain: "example.com" } },
    update: {
      name: "Example.com",
      gscSiteUrl: "https://example.com/",
      ga4PropertyId: "properties/123456789",
    },
    create: {
      workspaceId: workspace.id,
      name: "Example.com",
      domain: "example.com",
      targetMarket: "US",
      status: ProjectStatus.ACTIVE,
      gscSiteUrl: "https://example.com/",
      ga4PropertyId: "properties/123456789",
    },
  });

  const integration = await prisma.integration.upsert({
    where: { projectId_type: { projectId: project.id, type: IntegrationType.SEARCH_CONSOLE } },
    update: { status: IntegrationStatus.CONNECTED, connectedAt: new Date() },
    create: {
      projectId: project.id,
      type: IntegrationType.SEARCH_CONSOLE,
      status: IntegrationStatus.CONNECTED,
      externalId: "sc-123",
      connectedAt: new Date(),
    },
  });

  await prisma.integration.upsert({
    where: { projectId_type: { projectId: project.id, type: IntegrationType.GA4 } },
    update: { status: IntegrationStatus.CONNECTED, connectedAt: new Date() },
    create: {
      projectId: project.id,
      type: IntegrationType.GA4,
      status: IntegrationStatus.CONNECTED,
      externalId: "ga4-456",
      connectedAt: new Date(),
    },
  });

  const homePage = await prisma.page.upsert({
    where: { projectId_url: { projectId: project.id, url: "https://example.com/" } },
    update: { title: "Example | Home", pageType: "landing", owner: "Web Team", lastCrawl: daysAgo(1) },
    create: {
      projectId: project.id,
      url: "https://example.com/",
      title: "Example | Home",
      pageType: "landing",
      owner: "Web Team",
      lastCrawl: daysAgo(1),
    },
  });

  const blogPage = await prisma.page.upsert({
    where: { projectId_url: { projectId: project.id, url: "https://example.com/blog/seo" } },
    update: { title: "SEO Blog Post", pageType: "blog", owner: "Content", lastCrawl: daysAgo(2) },
    create: {
      projectId: project.id,
      url: "https://example.com/blog/seo",
      title: "SEO Blog Post",
      pageType: "blog",
      owner: "Content",
      lastCrawl: daysAgo(2),
    },
  });

  await prisma.pageContent.upsert({
    where: { pageId: blogPage.id },
    update: {
      projectId: project.id,
      contentHtml: blogArticleHtml,
      contentText: blogArticleText,
      wordCount: countWords(blogArticleText),
      extractedAt: daysAgo(0),
    },
    create: {
      projectId: project.id,
      pageId: blogPage.id,
      contentHtml: blogArticleHtml,
      contentText: blogArticleText,
      wordCount: countWords(blogArticleText),
      extractedAt: daysAgo(0),
    },
  });

  await Promise.all([
    prisma.techSnapshot.upsert({
      where: { id: "snapshot-cwv" },
      update: {
        metrics: {
          lcp: 2.8,
          cls: 0.07,
          inp: 210,
          good: 68,
          needsImprovement: 20,
          poor: 12,
        },
        capturedAt: daysAgo(0),
        notes: "Homepage hero video increased INP slightly.",
      },
      create: {
        id: "snapshot-cwv",
        projectId: project.id,
        type: TechSnapshotType.CWV,
        metrics: {
          lcp: 2.8,
          cls: 0.07,
          inp: 210,
          good: 68,
          needsImprovement: 20,
          poor: 12,
        },
        notes: "Homepage hero video increased INP slightly.",
        capturedAt: daysAgo(0),
      },
    }),
    prisma.techSnapshot.upsert({
      where: { id: "snapshot-index" },
      update: {
        metrics: {
          valid: 228,
          excluded: 14,
          warning: 6,
        },
        capturedAt: daysAgo(1),
      },
      create: {
        id: "snapshot-index",
        projectId: project.id,
        type: TechSnapshotType.INDEXATION,
        metrics: {
          valid: 228,
          excluded: 14,
          warning: 6,
        },
        capturedAt: daysAgo(1),
      },
    }),
    prisma.techSnapshot.upsert({
      where: { id: "snapshot-status" },
      update: {
        metrics: {
          "2xx": 236,
          "3xx": 9,
          "4xx": 3,
          "5xx": 0,
        },
        capturedAt: daysAgo(0),
      },
      create: {
        id: "snapshot-status",
        projectId: project.id,
        type: TechSnapshotType.STATUS,
        metrics: {
          "2xx": 236,
          "3xx": 9,
          "4xx": 3,
          "5xx": 0,
        },
        capturedAt: daysAgo(0),
      },
    }),
  ]);

  const contentBrief = await prisma.contentBrief.upsert({
    where: { id: "brief-seo-dashboard" },
    update: {
      keyword: "seo dashboard",
      title: "SEO Dashboard Playbook",
      outline: {
        h1: "SEO Dashboard Playbook",
        h2: [
          { title: "Why SEO Dashboards Matter", h3: ["Executive alignment", "Granular diagnostics"] },
          { title: "Core Metrics to Track", h3: ["Traffic quality", "Technical vitals", "Content velocity"] },
          { title: "Workflow + Automation", h3: ["Alerting", "Ops rituals"] },
        ],
      },
      questions: ["What is an SEO dashboard?", "Which metrics belong in an SEO dashboard?", "How often to review?"],
      entities: ["Core Web Vitals", "Search Console", "GA4"],
      internalLinks: [
        { title: "Example.com Platform Overview", url: homePage.url },
        { title: "Keyword Tracking Software", url: blogPage.url },
      ],
      competitorOutlines: [
        { name: "Competitor Alpha", focus: ["KPIs", "Dashboards"], CTA: "Book demo" },
        { name: "Competitor Beta", focus: ["Automation"], CTA: "Start trial" },
        { name: "Competitor Gamma", focus: ["Reporting templates"], CTA: "Download template" },
      ],
    },
    create: {
      id: "brief-seo-dashboard",
      projectId: project.id,
      keyword: "seo dashboard",
      title: "SEO Dashboard Playbook",
      outline: {
        h1: "SEO Dashboard Playbook",
        h2: [
          { title: "Why SEO Dashboards Matter", h3: ["Executive alignment", "Granular diagnostics"] },
          { title: "Core Metrics to Track", h3: ["Traffic quality", "Technical vitals", "Content velocity"] },
          { title: "Workflow + Automation", h3: ["Alerting", "Ops rituals"] },
        ],
      },
      questions: ["What is an SEO dashboard?", "Which metrics belong in an SEO dashboard?", "How often to review?"],
      entities: ["Core Web Vitals", "Search Console", "GA4"],
      internalLinks: [
        { title: "Example.com Platform Overview", url: homePage.url },
        { title: "Keyword Tracking Software", url: blogPage.url },
      ],
      competitorOutlines: [
        { name: "Competitor Alpha", focus: ["KPIs", "Dashboards"], CTA: "Book demo" },
        { name: "Competitor Beta", focus: ["Automation"], CTA: "Start trial" },
        { name: "Competitor Gamma", focus: ["Reporting templates"], CTA: "Download template" },
      ],
    },
  });

  await Promise.all([
    prisma.contentCalendarItem.upsert({
      where: { id: "calendar-webinar" },
      update: {
        publishDate: daysAgo(-7),
        status: "PUBLISHED",
      },
      create: {
        id: "calendar-webinar",
        projectId: project.id,
        briefId: contentBrief.id,
        title: "SEO Dashboard Webinar Recap",
        status: "PUBLISHED",
        owner: "Content",
        publishDate: daysAgo(-7),
        draftLink: "https://docs.example.com/webinar-recap",
      },
    }),
    prisma.contentCalendarItem.upsert({
      where: { id: "calendar-guide" },
      update: {
        publishDate: daysAgo(10),
        status: "DRAFTING",
      },
      create: {
        id: "calendar-guide",
        projectId: project.id,
        title: "Keyword Reporting Guide",
        status: "DRAFTING",
        owner: "Growth",
        publishDate: daysAgo(10),
        draftLink: "https://docs.example.com/keyword-guide",
      },
    }),
  ]);

  const outreachTemplate = await prisma.emailTemplate.upsert({
    where: { id: "tmpl-intro" },
    update: {
      name: "Product intro",
      subject: "Partnering with Example.com",
      body: "Hi {{contact}},\n\nWe loved your recent work on {{domain}} and think a keyword tracking walkthrough would resonate. Are you open to co-creating a guide next week?\n\nBest,\nExample.com",
    },
    create: {
      id: "tmpl-intro",
      projectId: project.id,
      name: "Product intro",
      subject: "Partnering with Example.com",
      body: "Hi {{contact}},\n\nWe loved your recent work on {{domain}} and think a keyword tracking walkthrough would resonate. Are you open to co-creating a guide next week?\n\nBest,\nExample.com",
    },
  });

  await Promise.all([
    prisma.prospect.upsert({
      where: { id: "prospect-alpha" },
      update: { stage: "PITCHED" },
      create: {
        id: "prospect-alpha",
        projectId: project.id,
        domain: "saasgrowthdaily.com",
        contact: "Maya Patel",
        email: "maya@saasgrowthdaily.com",
        stage: "PITCHED",
        authority: 72,
        notes: "Interested in data story for Q4 newsletter.",
        templateId: outreachTemplate.id,
      },
    }),
    prisma.prospect.upsert({
      where: { id: "prospect-beta" },
      update: { stage: "PROSPECT" },
      create: {
        id: "prospect-beta",
        projectId: project.id,
        domain: "organicpulse.io",
        contact: "Leo Martinez",
        email: "leo@organicpulse.io",
        stage: "PROSPECT",
        authority: 65,
        notes: "Podcast host, wants dashboard benchmarks.",
        templateId: outreachTemplate.id,
      },
    }),
    prisma.prospect.upsert({
      where: { id: "prospect-won" },
      update: { stage: "WON" },
      create: {
        id: "prospect-won",
        projectId: project.id,
        domain: "growthverse.com",
        contact: "Asha Li",
        email: "asha@growthverse.com",
        stage: "WON",
        authority: 78,
        notes: "Signed for co-marketing webinar.",
      },
    }),
  ]);

  const primaryKeyword = await prisma.keyword.upsert({
    where: { projectId_phrase: { projectId: project.id, phrase: "seo dashboard" } },
    update: {
      targetPageId: homePage.id,
      userId: founder.id,
      intent: "commercial",
      cluster: "dashboards",
      secondaryTerms: ["seo analytics platform", "seo reporting dashboard"],
    },
    create: {
      projectId: project.id,
      userId: founder.id,
      phrase: "seo dashboard",
      searchVolume: 5400,
      difficulty: 48,
      targetPageId: homePage.id,
      intent: "commercial",
      cluster: "dashboards",
      secondaryTerms: ["seo analytics platform", "seo reporting dashboard"],
    },
  });

  const topicalKeyword = await prisma.keyword.upsert({
    where: { projectId_phrase: { projectId: project.id, phrase: "keyword tracking software" } },
    update: {
      targetPageId: blogPage.id,
      userId: founder.id,
      intent: "informational",
      cluster: "tracking",
      secondaryTerms: ["keyword monitoring", "track keyword rankings"],
    },
    create: {
      projectId: project.id,
      userId: founder.id,
      phrase: "keyword tracking software",
      searchVolume: 2100,
      difficulty: 52,
      targetPageId: blogPage.id,
      intent: "informational",
      cluster: "tracking",
      secondaryTerms: ["keyword monitoring", "track keyword rankings"],
    },
  });

  await Promise.all([
    prisma.keywordSnapshot.upsert({
      where: { id: "snap-primary-today" },
      update: { position: 8, traffic: 120, recordedAt: daysAgo(0) },
      create: {
        id: "snap-primary-today",
        keywordId: primaryKeyword.id,
        position: 8,
        traffic: 120,
        recordedAt: daysAgo(0),
      },
    }),
    prisma.keywordSnapshot.upsert({
      where: { id: "snap-primary-yesterday" },
      update: { position: 9, traffic: 110, recordedAt: daysAgo(1) },
      create: {
        id: "snap-primary-yesterday",
        keywordId: primaryKeyword.id,
        position: 9,
        traffic: 110,
        recordedAt: daysAgo(1),
      },
    }),
    prisma.keywordSnapshot.upsert({
      where: { id: "snap-topical-today" },
      update: { position: 12, traffic: 80, recordedAt: daysAgo(0) },
      create: {
        id: "snap-topical-today",
        keywordId: topicalKeyword.id,
        position: 12,
        traffic: 80,
        recordedAt: daysAgo(0),
      },
    }),
  ]);

  await Promise.all([
    prisma.keywordPageMap.upsert({
      where: { keywordId_pageId: { keywordId: primaryKeyword.id, pageId: homePage.id } },
      update: { status: "active", role: "PRIMARY" },
      create: {
        keywordId: primaryKeyword.id,
        pageId: homePage.id,
        source: "manual",
        role: "PRIMARY",
      },
    }),
    prisma.keywordPageMap.upsert({
      where: { keywordId_pageId: { keywordId: topicalKeyword.id, pageId: blogPage.id } },
      update: { status: "active", role: "PRIMARY" },
      create: {
        keywordId: topicalKeyword.id,
        pageId: blogPage.id,
        source: "manual",
        role: "PRIMARY",
      },
    }),
  ]);

  await Promise.all([
    prisma.serpPosition.upsert({
      where: { id: "serp-home-today" },
      update: { position: 8, traffic: 120, capturedAt: daysAgo(0) },
      create: {
        id: "serp-home-today",
        keywordId: primaryKeyword.id,
        pageId: homePage.id,
        position: 8,
        traffic: 120,
        capturedAt: daysAgo(0),
      },
    }),
    prisma.serpPosition.upsert({
      where: { id: "serp-home-yesterday" },
      update: { position: 9, traffic: 110, capturedAt: daysAgo(1) },
      create: {
        id: "serp-home-yesterday",
        keywordId: primaryKeyword.id,
        pageId: homePage.id,
        position: 9,
        traffic: 110,
        capturedAt: daysAgo(1),
      },
    }),
  ]);

  const normalizeUrl = (url: string) => url.replace(/\/$/, "");
  const gscSeedConfig = [
    { query: "seo dashboard", clicks: 220, impressions: 4200, position: 8.4, pageUrl: normalizeUrl(homePage.url) },
    { query: "keyword tracking software", clicks: 140, impressions: 2100, position: 11.2, pageUrl: normalizeUrl(blogPage.url) },
  ];

  for (const config of gscSeedConfig) {
    for (let i = 0; i < 28; i += 1) {
      const date = daysAgo(i);
      const clicks = Math.max(50, config.clicks - i * 3 + Math.round(Math.random() * 10));
      const impressions = Math.max(500, config.impressions - i * 25 + Math.round(Math.random() * 50));
      const ctr = impressions > 0 ? clicks / impressions : 0;
      const position = config.position + Math.sin(i / 5) * 0.5;

      await prisma.gscQuery.upsert({
        where: {
          projectId_query_pageUrl_date: {
            projectId: project.id,
            query: config.query,
            pageUrl: config.pageUrl,
            date,
          },
        },
        update: {
          clicks,
          impressions,
          ctr,
          position,
        },
        create: {
          projectId: project.id,
          query: config.query,
          pageUrl: config.pageUrl,
          clicks,
          impressions,
          ctr,
          position,
          date,
        },
      });
    }
  }

  await Promise.all([
    prisma.ga4Page.upsert({
      where: { id: "ga4-home" },
      update: { views: 3200, sessions: 2400, conversions: 120 },
      create: {
        id: "ga4-home",
        projectId: project.id,
        pageId: homePage.id,
        url: homePage.url,
        views: 3200,
        sessions: 2400,
        conversions: 120,
        date: daysAgo(1),
      },
    }),
    prisma.ga4Page.upsert({
      where: { id: "ga4-blog" },
      update: { views: 1800, sessions: 1300, conversions: 45 },
      create: {
        id: "ga4-blog",
        projectId: project.id,
        pageId: blogPage.id,
        url: blogPage.url,
        views: 1800,
        sessions: 1300,
        conversions: 45,
        date: daysAgo(1),
      },
    }),
  ]);

  await Promise.all([
    prisma.backlink.upsert({
      where: { id: "backlink-technews" },
      update: { status: "active" },
      create: {
        id: "backlink-technews",
        projectId: project.id,
        sourceUrl: "https://technews.com/tools/example",
        targetUrl: homePage.url,
        anchorText: "SEO dashboard",
        status: "active",
        discoveredAt: daysAgo(5),
      },
    }),
    prisma.backlink.upsert({
      where: { id: "backlink-partner" },
      update: { status: "active" },
      create: {
        id: "backlink-partner",
        projectId: project.id,
        sourceUrl: "https://partnersite.com/resources",
        targetUrl: blogPage.url,
        anchorText: "keyword tracking software",
        status: "active",
        discoveredAt: daysAgo(3),
      },
    }),
  ]);

  await Promise.all([
    prisma.task.upsert({
      where: { id: "task-core-web-vitals" },
      update: { status: TaskStatus.IN_PROGRESS },
      create: {
        id: "task-core-web-vitals",
        projectId: project.id,
        title: "Improve core web vitals",
        description: "Optimize LCP and CLS on homepage",
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: daysAgo(-5),
        assignedToId: analyst.id,
        createdById: founder.id,
        type: "TECH",
        scoreCurrent: 45,
        scorePotential: 85,
        order: 1,
      },
    }),
    prisma.task.upsert({
      where: { id: "task-schema" },
      update: { status: TaskStatus.REVIEW },
      create: {
        id: "task-schema",
        projectId: project.id,
        title: "Add FAQ schema to blog",
        status: TaskStatus.REVIEW,
        priority: TaskPriority.MEDIUM,
        dueDate: daysAgo(-2),
        assignedToId: analyst.id,
        createdById: founder.id,
        type: "ONPAGE",
        scoreCurrent: 30,
        scorePotential: 70,
        order: 1,
      },
    }),
    prisma.task.upsert({
      where: { id: "task-brief" },
      update: { status: TaskStatus.OPEN, contentBriefId: contentBrief.id },
      create: {
        id: "task-brief",
        projectId: project.id,
        title: "Publish competitor comparison",
        description: "Turn brief into long-form article",
        status: TaskStatus.OPEN,
        priority: TaskPriority.CRITICAL,
        type: "CONTENT",
        scoreCurrent: 20,
        scorePotential: 95,
        order: 0,
        createdById: founder.id,
        contentBriefId: contentBrief.id,
      },
    }),
  ]);

  await prisma.audit.upsert({
    where: { id: "audit-weekly" },
    update: {
      title: "Weekly CWV review",
      status: AuditStatus.PASSED,
      score: 82,
      summary: { impact: "All CWV passing", recommendation: "Monitor INP after hero test" },
      finishedAt: daysAgo(0),
    },
    create: {
      id: "audit-weekly",
      projectId: project.id,
      title: "Weekly CWV review",
      type: "cwv-weekly",
      status: AuditStatus.PASSED,
      score: 82,
      metadata: { warnings: 2, errors: 0 },
      summary: { impact: "All CWV passing", recommendation: "Monitor INP after hero test" },
      startedAt: daysAgo(1),
      finishedAt: daysAgo(0),
    },
  });

  await prisma.audit.upsert({
    where: { id: "audit-manual" },
    update: {
      title: "404 cleanup",
      status: AuditStatus.FAILED,
      score: 64,
      summary: { impact: "4 pages returning 404", action: "Redirect retired blog paths" },
      findings: { notes: "Need to update nav + sitemap" },
    },
    create: {
      id: "audit-manual",
      projectId: project.id,
      title: "404 cleanup",
      type: "status-code",
      status: AuditStatus.FAILED,
      score: 64,
      summary: { impact: "4 pages returning 404", action: "Redirect retired blog paths" },
      findings: { notes: "Need to update nav + sitemap" },
      createdAt: daysAgo(2),
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif-serp" },
    update: { readAt: null },
    create: {
      id: "notif-serp",
      userId: founder.id,
      workspaceId: workspace.id,
      type: NotificationType.INFO,
      message: "Keyword 'seo dashboard' moved up to position 8.",
    },
  });

  await prisma.notification.upsert({
    where: { id: "notif-ga4" },
    update: { readAt: null },
    create: {
      id: "notif-ga4",
      userId: analyst.id,
      workspaceId: workspace.id,
      type: NotificationType.ALERT,
      message: "GA4 sessions down 12% week over week.",
      metadata: { delta: -12 },
    },
  });

  console.log("Seed data created:", {
    workspace: workspace.slug,
    project: project.domain,
    integrations: [integration.type],
  });
}

main()
  .catch((error) => {
    console.error("Seed error", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
