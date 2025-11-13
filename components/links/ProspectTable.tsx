"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { PROSPECT_STAGE_LABELS, PROSPECT_STAGES } from "@/lib/outreach/constants";
import { updateProspectStageAction } from "@/app/(dashboard)/links/actions";

export type ProspectRow = {
  id: string;
  domain: string;
  contact?: string | null;
  email?: string | null;
  stage: (typeof PROSPECT_STAGES)[number];
  authority: number;
  notes?: string | null;
  templateName?: string | null;
};

export function ProspectTable({ prospects }: { prospects: ProspectRow[] }) {
  const [isPending, startTransition] = useTransition();

  const changeStage = (id: string, stage: string) => {
    startTransition(async () => {
      await updateProspectStageAction({ id, stage: stage as (typeof PROSPECT_STAGES)[number] });
    });
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-3 pl-4">Domain</th>
              <th className="py-3">Contact</th>
              <th className="py-3">Email</th>
              <th className="py-3">Stage</th>
              <th className="py-3">Authority</th>
              <th className="py-3">Template</th>
              <th className="py-3 pr-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {prospects.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No prospects yet. Add your first outreach target below.
                </td>
              </tr>
            ) : (
              prospects.map((prospect) => (
                <tr key={prospect.id} className="border-t border-white/5">
                  <td className="py-3 pl-4 font-semibold">{prospect.domain}</td>
                  <td className="py-3">{prospect.contact ?? "—"}</td>
                  <td className="py-3">
                    {prospect.email ? (
                      <a className="text-emerald-300 hover:underline" href={`mailto:${prospect.email}`}>
                        {prospect.email}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3">
                    <select
                      className="rounded-md border border-white/10 bg-transparent px-2 py-1 text-xs uppercase"
                      value={prospect.stage}
                      disabled={isPending}
                      onChange={(event) => changeStage(prospect.id, event.target.value)}
                    >
                      {PROSPECT_STAGES.map((stage) => (
                        <option key={stage} value={stage}>
                          {PROSPECT_STAGE_LABELS[stage]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3">{prospect.authority}</td>
                  <td className="py-3 text-xs text-muted-foreground">{prospect.templateName ?? "—"}</td>
                  <td className="py-3 pr-4 text-right text-xs text-muted-foreground">{prospect.notes ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
