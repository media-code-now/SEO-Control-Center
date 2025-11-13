import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type AuditLogItem = {
  id: string;
  action: string;
  actorEmail?: string | null;
  createdAt: string;
  workspaceName?: string | null;
  projectName?: string | null;
  context?: Record<string, unknown> | null;
};

function formatContext(context?: Record<string, unknown> | null) {
  if (!context || Object.keys(context).length === 0) return "—";
  return Object.entries(context)
    .map(([key, value]) => `${key}: ${typeof value === "string" ? value : JSON.stringify(value)}`)
    .join(" · ");
}

export function AuditLogPanel({ logs }: { logs: AuditLogItem[] }) {
  return (
    <Card>
      <CardHeader>
        <p className="text-sm font-semibold">Audit activity</p>
        <p className="text-xs text-muted-foreground">Owner-visible record of sensitive changes and imports.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No audit activity recorded yet.</p>
        ) : (
          <div className="space-y-3 text-sm">
            {logs.map((log) => (
              <div key={log.id} className="rounded-lg border border-white/10 bg-black/20 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.workspaceName ? `${log.workspaceName}` : "Workspace"} ·{" "}
                      {log.projectName ?? "Project"} · {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">{log.actorEmail ?? "System"}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{formatContext(log.context)}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
