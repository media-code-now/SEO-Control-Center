import { STATUS_LABELS, ContentStatusValue } from "@/lib/content/constants";

export type CalendarEntry = {
  id: string;
  title: string;
  status: ContentStatusValue;
  owner?: string | null;
  publishDate: string;
  draftLink?: string | null;
  briefTitle?: string | null;
};

const statusStyles: Record<ContentStatusValue, string> = {
  IDEATION: "bg-slate-500/30 text-slate-100",
  BRIEFING: "bg-cyan-500/30 text-cyan-100",
  DRAFTING: "bg-amber-500/30 text-amber-100",
  EDITING: "bg-indigo-500/30 text-indigo-100",
  APPROVED: "bg-emerald-500/30 text-emerald-100",
  PUBLISHED: "bg-green-500/30 text-green-100",
};

type DayCell = {
  date: Date;
  inMonth: boolean;
};

function buildCalendar(month: Date): DayCell[] {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const startDay = firstDay.getDay();
  const startDate = new Date(firstDay);
  startDate.setDate(firstDay.getDate() - startDay);

  const cells: DayCell[] = [];
  for (let i = 0; i < 42; i += 1) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    cells.push({
      date,
      inMonth: date.getMonth() === month.getMonth(),
    });
  }
  return cells;
}

export function ContentCalendar({ entries, month }: { entries: CalendarEntry[]; month: Date }) {
  const days = buildCalendar(month);
  const entryMap = new Map<string, CalendarEntry[]>();
  entries.forEach((entry) => {
    const key = entry.publishDate.slice(0, 10);
    if (!entryMap.has(key)) {
      entryMap.set(key, []);
    }
    entryMap.get(key)?.push(entry);
  });

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-[0_20px_80px_rgba(15,15,15,0.45)] backdrop-blur-xl">
      <div className="grid grid-cols-7 text-center text-xs uppercase tracking-wide text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
          <div key={label} className="py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px rounded-2xl border border-white/10 bg-white/10 p-1 text-sm">
        {days.map((day) => {
          const key = day.date.toISOString().slice(0, 10);
          const cellEntries = entryMap.get(key) ?? [];
          return (
            <div
              key={key}
              className={`min-h-[140px] rounded-xl border border-white/10 bg-black/20 p-2 ${
                day.inMonth ? "" : "opacity-40"
              }`}
            >
              <p className="text-xs font-semibold text-muted-foreground">{day.date.getDate()}</p>
              <div className="mt-2 space-y-2 text-xs">
                {cellEntries.length === 0 ? null : cellEntries.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-white/10 bg-black/30 p-2">
                    <p className="font-semibold">{entry.title}</p>
                    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] ${statusStyles[entry.status]}`}>
                      {STATUS_LABELS[entry.status]}
                    </span>
                    <p className="mt-1 text-[11px] text-muted-foreground">{entry.owner || "Unassigned"}</p>
                    {entry.draftLink ? (
                      <a
                        href={entry.draftLink}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-[11px] text-emerald-300 hover:underline"
                      >
                        Draft
                      </a>
                    ) : null}
                    {entry.briefTitle ? (
                      <p className="text-[11px] text-cyan-200">Brief: {entry.briefTitle}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
