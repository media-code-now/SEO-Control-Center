import { TECH_SNAPSHOT_LABELS } from "@/lib/tech/constants";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type SnapshotCard = {
  id: string;
  type: string;
  metrics: Record<string, number | string>;
  notes?: string | null;
  capturedAt: string;
};

const formatNumber = (value: number | string) => {
  if (typeof value === "number") {
    if (Number.isInteger(value)) {
      return value.toString();
    }
    return value.toFixed(2);
  }
  return value;
};

export function TechSnapshots({ snapshots }: { snapshots: SnapshotCard[] }) {
  if (!snapshots.length) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <p className="text-sm font-semibold">Tech snapshots</p>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No snapshots captured yet. Connect Lighthouse CI or import data to populate CWV, indexation, and status code
            metrics.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {snapshots.map((snapshot) => {
        const label = TECH_SNAPSHOT_LABELS[snapshot.type] ?? snapshot.type;
        const captured = new Date(snapshot.capturedAt).toLocaleString();
        const metrics = Object.entries(snapshot.metrics);
        return (
          <Card key={snapshot.id}>
            <CardHeader className="flex flex-col gap-1">
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-muted-foreground">Captured {captured}</p>
              </div>
              {snapshot.notes ? <p className="text-xs text-muted-foreground">{snapshot.notes}</p> : null}
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {metrics.map(([key, value]) => (
                  <div key={key} className="rounded-lg border border-white/5 bg-white/5 px-3 py-2">
                    <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{key}</dt>
                    <dd className="text-base font-semibold">{formatNumber(value)}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
