type OutlineSection = {
  title: string;
  h3: string[];
};

export type GeneratedBrief = {
  title: string;
  outline: {
    h1: string;
    h2: OutlineSection[];
  };
  questions: string[];
  entities: string[];
  internalLinks: Array<{ title: string; url: string }>;
  competitorOutlines: Array<{ name: string; headline: string; angle: string; cta: string }>;
};

function capitalize(value: string) {
  return value
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function unique<T>(values: T[]) {
  return Array.from(new Set(values));
}

export function buildBrief(keyword: string, options?: { intent?: string; audience?: string; internalLinks?: Array<{ title: string; url: string }>; }) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const topic = capitalize(normalizedKeyword);
  const h1 = `${topic}: Complete Brief`;
  const intent = options?.intent ?? "drive qualified traffic";
  const audience = options?.audience ?? "growth teams";

  const outline: OutlineSection[] = [
    {
      title: `Why ${topic} matters for ${audience}`,
      h3: [
        `Business value of ${normalizedKeyword}`,
        `Signals that ${normalizedKeyword} improves`,
        `KPIs to measure`,
      ],
    },
    {
      title: `Building a ${topic} framework`,
      h3: [`Key components`, `Workflows`, `Automation opportunities`],
    },
    {
      title: `How to implement ${topic}`,
      h3: [`Step-by-step process`, `Common blockers`, `Playbooks to accelerate results`],
    },
    {
      title: `Success metrics & optimization`,
      h3: [`Dashboards`, `Experiments`, `Iteration cadence`],
    },
  ];

  const questions = unique([
    `What is ${normalizedKeyword}?`,
    `How does ${normalizedKeyword} help ${audience}?`,
    `Which metrics prove ${normalizedKeyword} success?`,
    `What tools or workflows support ${normalizedKeyword}?`,
  ]);

  const keywordTokens = normalizedKeyword.split(/\s+/).map(capitalize);
  const entities = unique([
    ...keywordTokens,
    topic,
    "Search Console",
    "GA4",
    "Core Web Vitals",
    intent,
  ]);

  const internalLinks = options?.internalLinks ?? [];

  const competitorNames = ["Competitor A", "Competitor B", "Competitor C"];
  const competitorOutlines = competitorNames.map((name, index) => ({
    name,
    headline: `${name} on ${topic}`,
    angle: ["KPI-first", "Workflow-focused", "Automation-centric"][index] ?? "Full-funnel",
    cta: ["Book demo", "Download template", "Start free trial"][index] ?? "Talk to sales",
  }));

  return {
    title: h1,
    outline: { h1, h2: outline },
    questions,
    entities,
    internalLinks,
    competitorOutlines,
  } satisfies GeneratedBrief;
}
