import Link from "next/link";

export type PageOpportunity = {
  id: string;
  url: string;
  title: string;
  impressions: number;
  clicks: number;
  position: number;
};

interface TopPageOpportunitiesProps {
  pages: PageOpportunity[];
}

export function TopPageOpportunities({ pages }: TopPageOpportunitiesProps) {
  if (pages.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card/40 p-4 text-sm text-muted-foreground">
        No mid-SERP opportunities yet. Keep importing GSC data.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pages.map((page) => (
        <div key={page.id} className="rounded-xl border border-white/10 bg-card/70 p-4">
          <div className="flex flex-col gap-1">
            <Link href={page.url} className="text-sm font-semibold text-cyan-200" target="_blank">
              {page.title}
            </Link>
            <p className="text-xs text-muted-foreground">{page.url}</p>
          </div>
          <div className="mt-3 grid gap-3 text-sm md:grid-cols-3">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Impressions</p>
              <p className="font-semibold">{page.impressions.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Clicks</p>
              <p className="font-semibold">{page.clicks.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Avg. position</p>
              <p className="font-semibold">#{page.position.toFixed(1)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
