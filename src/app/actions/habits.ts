"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { hbHabit, hbLog, restBlock } from "@/db/schema";
import { genId } from "@/lib/id";
import { dateKey } from "@/lib/format";

function refresh() { revalidatePath("/habits"); revalidatePath("/develop"); }

export async function createHabit(input: { name: string }) {
  if (!input.name.trim()) return { ok: false };
  await db.insert(hbHabit).values({ id: genId(), name: input.name.trim(), area: "growth", createdAt: Date.now() });
  refresh();
  return { ok: true };
}

export async function deleteHabit(id: string) {
  await db.delete(hbLog).where(eq(hbLog.habitId, id));
  await db.delete(hbHabit).where(eq(hbHabit.id, id));
  refresh();
  return { ok: true };
}

// Lưu trữ habit (ẩn khỏi danh sách hoạt động, giữ lịch sử log).
export async function archiveHabit(id: string) {
  await db.update(hbHabit).set({ archivedAt: Date.now() }).where(eq(hbHabit.id, id));
  refresh();
  return { ok: true };
}

// Log/unlog habit cho một ngày cụ thể (dateKey YYYY-MM-DD Asia/HCM).
export async function logHabit(habitId: string, dk: string) {
  const existing = (await db.select().from(hbLog).where(and(eq(hbLog.habitId, habitId), eq(hbLog.dateKey, dk))).limit(1))[0];
  if (!existing) {
    await db.insert(hbLog).values({ id: genId(), habitId, dateKey: dk, createdAt: Date.now() });
  }
  refresh();
  return { ok: true };
}
export async function unlogHabit(habitId: string, dk: string) {
  const existing = (await db.select().from(hbLog).where(and(eq(hbLog.habitId, habitId), eq(hbLog.dateKey, dk))).limit(1))[0];
  if (existing) await db.delete(hbLog).where(eq(hbLog.id, existing.id));
  refresh();
  return { ok: true };
}

// Bật/tắt hoàn thành hôm nay (toggle log ngày hôm nay).
export async function toggleHabitToday(habitId: string) {
  const today = dateKey();
  const existing = (await db.select().from(hbLog).where(and(eq(hbLog.habitId, habitId), eq(hbLog.dateKey, today))).limit(1))[0];
  if (existing) {
    await db.delete(hbLog).where(eq(hbLog.id, existing.id));
  } else {
    await db.insert(hbLog).values({ id: genId(), habitId, dateKey: today, createdAt: Date.now() });
  }
  refresh();
  return { ok: true, done: !existing };
}

export async function addRest(input: { minutes: number; note?: string }) {
  await db.insert(restBlock).values({ id: genId(), dateKey: dateKey(), minutes: input.minutes, note: input.note ?? null, createdAt: Date.now() });
  revalidatePath("/rest"); revalidatePath("/develop");
  return { ok: true };
}
export { addRest as addRestBlock };

export async function deleteRest(id: string) {
  await db.delete(restBlock).where(eq(restBlock.id, id));
  revalidatePath("/rest"); revalidatePath("/develop");
  return { ok: true };
}
export { deleteRest as deleteRestBlock };
