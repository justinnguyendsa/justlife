import { getTodayData } from "@/db/queries";
import { PageHeader } from "@/components/PageHeader";
import { TaskCard } from "@/components/TaskCard";
import { FocusButton } from "@/components/FocusButton";
import { fmtDayName, fmtTime } from "@/lib/format";
import { AREA_VAR } from "@/lib/areas";
import { maskHasDate, fixedToRange, startOfDay } from "@/lib/scheduler";
import { Section } from "@/components/Section";
import { getUnifiedDeadlines } from "@/db/deadlines";
import { DeadlineRow } from "@/components/DeadlineRow";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const now = Date.now();
  const { doing, top, blocks, fixed } = await getTodayData(now);
  const { next24h } = await getUnifiedDeadlines(now);
  const day0 = startOfDay(now);
  const dayDate = new Date(day0);
  const timeline = [
    ...fixed.filter((f) => maskHasDate(f.weekdayMask, dayDate)).map((f) => ({ label: f.label, area: f.area, ...fixedToRange(f, day0) })),
    ...blocks.map((b) => ({ label: b.title, area: b.area, startAt: b.startAt, endAt: b.endAt })),
  ].sort((a, b) => a.startAt - b.startAt);
  const focusTask = doing[0] ?? top[0];

  return (
    <>
      <PageHeader title="Hôm nay" sub={fmtDayName(now)} />

      <Section color="var(--brand)" title="Đang làm" cnt={`${doing.length} việc`} />
      {doing.length ? doing.map((t) => <TaskCard key={t.id} task={t} now={now} />) : <div className="empty">Chưa có việc nào đang làm — vào Focus để bắt đầu.</div>}

      <Section color="var(--accent)" title="Ưu tiên hôm nay" cnt="top 3" />
      {top.length ? top.map((t) => <TaskCard key={t.id} task={t} now={now} trailingScore />) : <div className="empty">Thêm Effort + Impact cho việc để xếp ưu tiên.</div>}

      <Section color="var(--danger)" title="Deadline 24 giờ" />
      {next24h.length ? next24h.map((e) => <DeadlineRow key={e.source + e.id} e={e} now={now} />) : <div className="empty">Không có deadline gấp trong 24 giờ.</div>}

      <Section color="var(--module-study)" title="Lịch hôm nay" />
      {timeline.length ? (
        <div className="mini">
          {timeline.map((b, i) => (
            <div className="mrow" key={i}>
              <span>{fmtTime(b.startAt)}</span>
              <div className="bar" style={{ background: AREA_VAR[b.area] }}>{b.label}</div>
            </div>
          ))}
        </div>
      ) : <div className="empty">Hôm nay chưa có khối lịch nào.</div>}

      <FocusButton title={focusTask?.title} />
    </>
  );
}
