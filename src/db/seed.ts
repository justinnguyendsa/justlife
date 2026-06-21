import { db } from "./client";
import { task, fixedSchedule, timeBlock, deadline, userSettings, event,
  stCourse, stItem, stNote, libFolder, libFile,
  hbHabit, hbLog, restBlock } from "./schema";
// Teaching (tc_*) seed → src/db/lms/seed.ts (DB riêng lms.db — ADR-002 Q1).
import { DEMO_CLASS_ID } from "./lms/constants";
import { calcPriorityScore } from "../lib/priority";
import { buildDeadlineRows } from "../lib/escalation";
import { startOfDay } from "../lib/scheduler";
import { genId } from "../lib/id";
import { dateKey } from "../lib/format";

const now = Date.now();
const H = 3_600_000, D = 86_400_000;
const today0 = startOfDay(now);

type Seed = { title: string; area: string; status: string; effort: number | null; impact: number | null; deadlineAt: number | null };

const tasks: Seed[] = [
  { title: "Làm báo cáo doanh thu Q2 cho team Sales", area: "work", status: "doing", effort: 3, impact: 5, deadlineAt: now + 2 * D },
  { title: "Chấm bài tập buổi 5 — lớp DA01", area: "teach", status: "todo", effort: 2, impact: 4, deadlineAt: now - 1 * D },
  { title: "Làm đồ án Machine Learning — chương 2", area: "study", status: "todo", effort: 4, impact: 4, deadlineAt: now + 5 * D },
  { title: "Dựng pipeline ingest dữ liệu CRM", area: "work", status: "todo", effort: 4, impact: 3, deadlineAt: now + 4 * D },
  { title: "Nhận xét kết quả học tập HV DA01", area: "teach", status: "todo", effort: 2, impact: 3, deadlineAt: now + 6 * H },
  { title: "Tập gym + ăn đủ 3 bữa (tăng cân)", area: "growth", status: "todo", effort: 1, impact: 4, deadlineAt: null },
];

async function main() {
  // reset (idempotent)
  await db.delete(deadline); await db.delete(timeBlock); await db.delete(task);
  await db.delete(fixedSchedule); await db.delete(userSettings); await db.delete(event);

  const ids: string[] = [];
  for (const t of tasks) {
    const id = genId();
    ids.push(id);
    await db.insert(task).values({
      id, title: t.title, area: t.area, status: t.status,
      effort: t.effort, impact: t.impact, deadlineAt: t.deadlineAt,
      priorityScore: calcPriorityScore({ effort: t.effort, impact: t.impact, deadlineAt: t.deadlineAt, now }),
      createdAt: now, updatedAt: now,
    });
    if (t.deadlineAt != null) {
      const rows = buildDeadlineRows(id, t.deadlineAt, now);
      for (const r of rows) await db.insert(deadline).values(r);
    }
  }

  await db.insert(fixedSchedule).values([
    { id: genId(), label: "Đi làm (Data Analyst)", area: "work", startMin: 8 * 60 + 30, endMin: 18 * 60, weekdayMask: 0b0011111, createdAt: now }, // T2–T6
    { id: genId(), label: "Dạy DA01 @ MindX", area: "teach", startMin: 19 * 60 + 15, endMin: 21 * 60 + 15, weekdayMask: 0b0001010, createdAt: now }, // T3,T5
    { id: genId(), label: "Học cao học", area: "study", startMin: 8 * 60, endMin: 11 * 60, weekdayMask: 0b1100000, createdAt: now }, // T7,CN
  ]);

  await db.insert(timeBlock).values({
    id: genId(), taskId: ids[0], title: "Làm báo cáo Q2", area: "work",
    startAt: today0 + 14 * H, endAt: today0 + 15 * H + 30 * 60_000, createdAt: now,
  });

  await db.insert(userSettings).values([
    { key: "wip_limit", value: "3" },
    { key: "onboarding_done", value: "1" },
  ]);

  // ===== Teaching (tc_*) seed → src/db/lms/seed.ts (lms.db riêng — ADR-002 Q1) =====

  // ===== Study OS (P3) =====
  await db.delete(stNote); await db.delete(stItem); await db.delete(stCourse);
  const ml = genId(); await db.insert(stCourse).values({ id: ml, name: "Machine Learning", code: "ML", term: "HK2 2026", createdAt: now });
  const bds = genId(); await db.insert(stCourse).values({ id: bds, name: "Big Data Systems", code: "BDS", term: "HK2 2026", createdAt: now });
  await db.insert(stItem).values([
    { id: genId(), courseId: ml, title: "Đồ án ML — chương 2", kind: "project", dueAt: now + 5 * D, status: "doing", createdAt: now },
    { id: genId(), courseId: ml, title: "Bài tập tuần 5", kind: "assignment", dueAt: now + 2 * D, status: "todo", createdAt: now },
    { id: genId(), courseId: ml, title: "Quiz chương 1", kind: "quiz", dueAt: now - 1 * D, status: "done", createdAt: now, doneAt: now },
    { id: genId(), courseId: bds, title: "Quiz Spark", kind: "quiz", dueAt: now + 6 * D, status: "todo", createdAt: now },
    { id: genId(), courseId: bds, title: "Thi giữa kỳ", kind: "exam", dueAt: now + 12 * D, status: "todo", createdAt: now },
  ]);
  await db.insert(stNote).values({ id: genId(), courseId: ml, title: "Slide ML tuần 5", url: "https://example.com/ml-w5", body: "Pivot + feature engineering — ôn trước đồ án.", createdAt: now });

  // ===== Library (tài liệu) =====
  await db.delete(libFile); await db.delete(libFolder);
  const fDay = genId(); await db.insert(libFolder).values({ id: fDay, name: "Tài liệu Dạy", createdAt: now });
  const fHoc = genId(); await db.insert(libFolder).values({ id: fHoc, name: "Tài liệu Học", createdAt: now });
  await db.insert(libFile).values([
    { id: genId(), folderId: fDay, name: "Slide Pivot & VLOOKUP", kind: "link", url: "https://example.com/pivot", linkClassId: DEMO_CLASS_ID, createdAt: now },
    { id: genId(), folderId: fHoc, name: "Notebook bài tập ML", kind: "link", url: "https://example.com/ml-nb", linkCourseId: ml, createdAt: now },
    { id: genId(), folderId: null, name: "Đề cương môn ML", kind: "link", url: "https://example.com/ml-syllabus", linkCourseId: ml, createdAt: now },
  ]);

  // ===== Habit + Rest (P4) =====
  await db.delete(hbLog); await db.delete(hbHabit); await db.delete(restBlock);
  const habits = [
    { name: "Tập gym + ăn đủ 3 bữa", days: 5 },
    { name: "Tiếng Anh 20 phút", days: 12 },
    { name: "Ngủ trước 0h", days: 2 },
  ];
  for (const h of habits) {
    const hid = genId();
    await db.insert(hbHabit).values({ id: hid, name: h.name, area: "growth", createdAt: now });
    for (let i = 0; i < h.days; i++) await db.insert(hbLog).values({ id: genId(), habitId: hid, dateKey: dateKey(now - i * D), createdAt: now });
  }
  await db.insert(restBlock).values({ id: genId(), dateKey: dateKey(now), minutes: 20, note: "Nghỉ trưa + đi bộ", createdAt: now });

  console.log(`✓ seed: việc/lịch + 2 môn cao học + thư viện + 3 thói quen (streak) + nghỉ (personal.db)`);
}

main().catch((e) => { console.error("seed fail:", e); process.exit(1); });
