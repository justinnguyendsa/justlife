import { asc, desc, eq, isNull } from "drizzle-orm";
import { db } from "./client";
import { hbHabit, hbLog, restBlock } from "./schema";
import { dateKey } from "@/lib/format";

function prevKey(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export async function listHabits(now = Date.now()) {
  const today = dateKey(now);
  const habits = await db.select().from(hbHabit).where(isNull(hbHabit.archivedAt)).orderBy(asc(hbHabit.createdAt));
  const out = [];
  for (const h of habits) {
    const logs = await db.select().from(hbLog).where(eq(hbLog.habitId, h.id));
    const keys = new Set(logs.map((l) => l.dateKey));
    let streak = 0, cur = today;
    if (!keys.has(cur)) cur = prevKey(cur);
    while (keys.has(cur)) { streak++; cur = prevKey(cur); }
    const last7: { key: string; done: boolean }[] = [];
    let k = today;
    for (let i = 0; i < 7; i++) { last7.push({ key: k, done: keys.has(k) }); k = prevKey(k); }
    out.push({ ...h, streak, doneToday: keys.has(today), last7: last7.reverse() });
  }
  return out;
}

export async function getRest(now = Date.now()) {
  const today = dateKey(now);
  const todayBlocks = await db.select().from(restBlock).where(eq(restBlock.dateKey, today)).orderBy(desc(restBlock.createdAt));
  const weekKeys = new Set<string>();
  let k = today;
  for (let i = 0; i < 7; i++) { weekKeys.add(k); k = prevKey(k); }
  const all = await db.select().from(restBlock);
  const weekMin = all.filter((b) => weekKeys.has(b.dateKey)).reduce((s, b) => s + b.minutes, 0);
  const todayMin = todayBlocks.reduce((s, b) => s + b.minutes, 0);
  return { todayBlocks, todayMin, weekMin };
}
