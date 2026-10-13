import type { DeadlineEntry } from "@/db/deadlines";
import { DueItem } from "@/components/DueItem";

// Tab Hạn của Việc (SPEC-UI-P2.2 F05): gộp hạn của việc + bài học, 3 nhóm.
export function DueList({
  overdue,
  upcoming,
  later,
  now,
}: {
  overdue: DeadlineEntry[];
  upcoming: DeadlineEntry[];
  later: DeadlineEntry[];
  now: number;
}) {
  const groups = [
    { id: "due-over", title: `Quá hạn (${overdue.length})`, rows: overdue, empty: "Không có gì quá hạn. Tốt lắm!" },
    { id: "due-week", title: `7 ngày tới (${upcoming.length})`, rows: upcoming, empty: "Không có hạn nào trong 7 ngày tới." },
    { id: "due-later", title: `Sau đó (${later.length})`, rows: later, empty: null },
  ];
  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      {groups.map((g) =>
        g.rows.length === 0 && !g.empty ? null : (
          <section key={g.id} aria-labelledby={g.id} className="flex flex-col gap-2">
            <h2 id={g.id} className="text-[15px] font-semibold">{g.title}</h2>
            {g.rows.length ? (
              <ul className="bg-card overflow-hidden rounded-lg border">
                {g.rows.map((e) => <DueItem key={e.source + e.id} e={e} now={now} />)}
              </ul>
            ) : (
              <p className="text-muted-foreground text-[13px]">{g.empty}</p>
            )}
          </section>
        ),
      )}
    </div>
  );
}
