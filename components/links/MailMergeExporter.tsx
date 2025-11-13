"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { exportMailMergeAction } from "@/app/(dashboard)/links/actions";
import { PROSPECT_STAGE_LABELS, PROSPECT_STAGES } from "@/lib/outreach/constants";

export function MailMergeExporter({ projectId }: { projectId: string }) {
  const [stage, setStage] = useState<string>("all");
  const [csv, setCsv] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const runExport = () => {
    setError(null);
    startTransition(async () => {
      const response = await exportMailMergeAction({
        projectId,
        stage: stage === "all" ? undefined : stage,
      });
      if (!response?.success) {
        setError(response?.error ?? "Unable to export data");
        return;
      }
      setCsv(response.csv ?? "");
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <p className="text-sm font-semibold">Mail merge export</p>
          <p className="text-xs text-muted-foreground">Select a stage and export CSV for outreach tools.</p>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 text-sm">
          <select
            className="rounded-md border border-white/10 bg-transparent px-3 py-2"
            value={stage}
            onChange={(event) => setStage(event.target.value)}
          >
            <option value="all">All stages</option>
            {PROSPECT_STAGES.map((value) => (
              <option key={value} value={value}>
                {PROSPECT_STAGE_LABELS[value]}
              </option>
            ))}
          </select>
          <Button onClick={runExport} disabled={isPending}>
            {isPending ? "Exporting..." : "Export CSV"}
          </Button>
        </div>
      </div>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {csv ? (
        <textarea
          className="h-40 w-full rounded-md border border-white/10 bg-black/30 p-2 text-xs"
          value={csv}
          readOnly
        />
      ) : null}
    </div>
  );
}
