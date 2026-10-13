import { asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "./client";
import { hbHabit, hbLog, restBlock } from "./schema";
import { dateKey } from "@/lib/format";

function prevKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

// 1 truy vấn lấy log của mọi thói quen rồi nhóm lại, thay vì 1 truy vấn mỗi thói quen (SPEC-Perf-P1 T06).
export async function listHabits(now = Date.now()) {
  const today = dateKey(now);
  const habits = await db.select().from(hbHabit).where(isNull(hbHabit.archivedAt)).orderBy(asc(hbHabit.createdAt));
  if (habits.length === 0) return [];
  const logs = await db.select({ habitId: hbLog.habitId, dateKey: hbLog.dateKey }).from(hbLog)
    .where(inArray(hbLog.habitId, habits.map((h) => h.id)));
  const keysByHabit = new Map<string, Set<string>>();
  for (const l of logs) {
    if (!keysByHabit.has(l.habitId)) keysByHabit.set(l.habitId, new Set());
    keysByHabit.get(l.habitId)!.add(l.dateKey);
  }
  return habits.map((h) => {
    const keys = keysByHabit.get(h.id) ?? new Set<string>();
    let streak = 0, cur = today;
    if (!keys.has(cur)) cur = prevKey(cur);
    while (keys.has(cur)) { streak++; cur = prevKey(cur); }
    const last7: { key: string; done: boolean }[] = [];
    let k = today;
    for (let i = 0; i < 7; i++) { last7.push({ key: k, done: keys.has(k) }); k = prevKey(k); }
    return { ...h, streak, doneToday: keys.has(today), last7: last7.reverse() };
  });
}

export async function getRest(now = Date.now()) {
  const today = dateKey(now);
  const weekKeys: string[] = [];
  let k = today;
  for (let i = 0; i < 7; i++) { weekKeys.push(k); k = prevKey(k); }
  // Song song + chỉ lấy 7 ngày gần nhất thay vì toàn bộ lịch sử nghỉ.
  const [todayBlocks, week] = await Promise.all([
    db.select().from(restBlock).where(eq(restBlock.dateKey, today)).orderBy(desc(restBlock.createdAt)),
    db.select({ minutes: restBlock.minutes }).from(restBlock).where(inArray(restBlock.dateKey, weekKeys)),
  ]);
  const weekMin = week.reduce((s, b) => s + b.minutes, 0);
  const todayMin = todayBlocks.reduce((s, b) => s + b.minutes, 0);
  return { todayBlocks, todayMin, weekMin };
}
