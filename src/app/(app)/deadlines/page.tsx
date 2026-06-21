import { getUnifiedDeadlines } from "@/db/deadlines";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { DeadlineRow } from "@/components/DeadlineRow";

export const dynamic = "force-dynamic";

export default async function DeadlinesPage() {
  const now = Date.now();
  const { overdue, upcoming, later } = await getUnifiedDeadlines(now);
  return (
    <>
      <PageHeader title="Deadline" sub="Việc + học gộp một chỗ — đừng để bị đánh úp" />

      <Section color="var(--danger)" title={`Quá hạn (${overdue.length})`} />
      {overdue.length ? overdue.map((e) => <DeadlineRow key={e.source + e.id} e={e} now={now} />) : <div className="empty">Không có gì quá hạn. Tốt lắm!</div>}

      <Section color="var(--accent)" title="7 ngày tới" />
      {upcoming.length ? upcoming.map((e) => <DeadlineRow key={e.source + e.id} e={e} now={now} />) : <div className="empty">Không có deadline trong 7 ngày tới.</div>}

      {later.length > 0 && (
        <>
          <Section color="var(--text-faint)" title="Sau đó" />
          {later.map((e) => <DeadlineRow key={e.source + e.id} e={e} now={now} />)}
        </>
      )}
    </>
  );
}
