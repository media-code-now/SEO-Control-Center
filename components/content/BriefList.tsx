import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type BriefSummary = {
  id: string;
  title: string;
  keyword: string;
  createdAt: string;
  questions: string[];
  entities: string[];
  internalLinks: Array<{ title: string; url: string }>;
  competitorOutlines: Array<{ name: string; headline?: string; angle?: string; cta?: string }>;
  tasks: Array<{ id: string; title: string }>;
};

export function BriefList({ briefs }: { briefs: BriefSummary[] }) {
  if (!briefs.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <p className="text-sm font-semibold">Saved briefs</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Generate your first brief to populate this panel.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {briefs.map((brief) => (
        <Card key={brief.id}>
          <CardHeader className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{brief.title}</p>
                <p className="text-xs text-muted-foreground">Keyword: {brief.keyword}</p>
              </div>
              {brief.tasks.length ? (
                <p className="text-xs text-emerald-300">
                  Attached to {brief.tasks.length} task{brief.tasks.length > 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">Not attached to any tasks</p>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {brief.questions.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Questions</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {brief.questions.slice(0, 3).map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.entities.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Entities</p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs">
                  {brief.entities.slice(0, 6).map((entity) => (
                    <span key={entity} className="rounded-full border border-white/10 px-2 py-0.5">
                      {entity}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {brief.internalLinks.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal links</p>
                <ul className="mt-1 list-disc space-y-1 pl-5">
                  {brief.internalLinks.slice(0, 3).map((link) => (
                    <li key={link.url}>
                      <a href={link.url} className="text-emerald-300 hover:underline" target="_blank" rel="noreferrer">
                        {link.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {brief.competitorOutlines.length ? (
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Competitors</p>
                <div className="mt-1 grid gap-2 md:grid-cols-3">
                  {brief.competitorOutlines.map((competitor) => (
                    <div key={competitor.name} className="rounded-lg border border-white/10 bg-black/20 p-2 text-xs">
                      <p className="font-semibold">{competitor.name}</p>
                      <p>{competitor.headline ?? competitor.angle}</p>
                      <p>CTA: {competitor.cta}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
