"use client";

import { useMemo, useState, ChangeEvent } from "react";
import { AUDIT_STATUS_VALUES } from "@/lib/tech/constants";

export type AuditRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  score: number | null;
  impact?: string | null;
  recommendation?: string | null;
  detectedAt?: string | null;
  createdAt: string;
};

interface AuditTableProps {
  rows: AuditRow[];
  typeOptions: string[];
  initialType?: string | null;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
}

export function AuditTable({
  rows,
  typeOptions,
  initialType,
  initialStartDate,
  initialEndDate,
}: AuditTableProps) {
  const [typeFilter, setTypeFilter] = useState(initialType ?? "all");
  const [startDate, setStartDate] = useState(initialStartDate ?? "");
  const [endDate, setEndDate] = useState(initialEndDate ?? "");

  const filtered = useMemo(() => {
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
    return rows.filter((row) => {
      const created = new Date(row.createdAt);
      if (typeFilter !== "all" && row.type !== typeFilter) return false;
      if (start && created < start) return false;
      if (end && created > end) return false;
      return true;
    });
  }, [rows, typeFilter, startDate, endDate]);

  const handleSelect = (event: ChangeEvent<HTMLSelectElement>) => {
    setTypeFilter(event.target.value);
  };

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl">
      <div className="flex flex-col gap-3 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold">Audit history</p>
          <p className="text-xs text-muted-foreground">
            Filter by type or date to review previous CWV, indexation, and infrastructure checks.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Type</label>
            <select
              className="mt-1 rounded-md border border-white/10 bg-transparent px-3 py-2"
              value={typeFilter}
              onChange={handleSelect}
            >
              <option value="all">All</option>
              {typeOptions.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">From</label>
            <input
              type="date"
              className="mt-1 rounded-md border border-white/10 bg-transparent px-3 py-2"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wide text-muted-foreground">To</label>
            <input
              type="date"
              className="mt-1 rounded-md border border-white/10 bg-transparent px-3 py-2"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="py-2">Title</th>
              <th className="py-2">Type</th>
              <th className="py-2">Status</th>
              <th className="py-2">Score</th>
              <th className="py-2">Impact</th>
              <th className="py-2">Recommendation</th>
              <th className="py-2">Detected</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No audits match the current filters.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id} className="border-t border-white/5">
                  <td className="py-3 font-semibold">{row.title}</td>
                  <td className="py-3">{row.type}</td>
                  <td className="py-3">
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs uppercase">
                      {row.status}
                    </span>
                  </td>
                  <td className="py-3">{row.score ?? "—"}</td>
                  <td className="py-3">{row.impact ?? "—"}</td>
                  <td className="py-3">{row.recommendation ?? "—"}</td>
                  <td className="py-3 text-xs text-muted-foreground">
                    {row.detectedAt ? new Date(row.detectedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="pt-4 text-xs text-muted-foreground">
        Status key: {AUDIT_STATUS_VALUES.join(", ")}. Hook this module up to Lighthouse CI or custom crawlers to auto-populate future
        audits.
      </p>
    </div>
  );
}
