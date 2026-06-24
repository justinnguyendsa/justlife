"use server";
import { revalidatePath } from "next/cache";
import { and, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedSchedule, timeBlock } from "@/db/schema";
import { detectConflicts, startOfDay, type Conflict } from "@/lib/scheduler";
import { genId } from "@/lib/id";

const DAY = 86_400_000;

async function conflictsFor(startAt: number, endAt: number, ignoreId?: string): Promise<Conflict[]> {
  const day0 = startOfDay(startAt);
  const fixeds = await db.select().from(fixedSchedule);
  const blocks = await db.select().from(timeBlock).where(and(gte(timeBlock.startAt, day0), lte(timeBlock.startAt, day0 + DAY)));
  return detectConflicts(startAt, endAt, fixeds, blocks, ignoreId);
}

// Tạo time-block (xếp việc vào lịch). Cho phép tạo dù trùng (soft warn) — trả conflicts để UI cảnh báo.
export async function createTimeBlock(input: { taskId?: string | null; title: string; startAt: number; endAt: number; area: string }) {
  const now = Date.now();
  const id = genId();
  const conflicts = await conflictsFor(input.startAt, input.endAt);
  await db.insert(timeBlock).values({ id, taskId: input.taskId ?? null, title: input.title, startAt: input.startAt, endAt: input.endAt, area: input.area, createdAt: now });
  revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true, id, conflicts };
}

export async function updateTimeBlock(id: string, startAt: number, endAt: number) {
  const conflicts = await conflictsFor(startAt, endAt, id);
  await db.update(timeBlock).set({ startAt, endAt }).where(eq(timeBlock.id, id));
  revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true, conflicts };
}

export async function deleteTimeBlock(id: string) {
  await db.delete(timeBlock).where(eq(timeBlock.id, id));
  revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true };
}

export async function addFixedSchedule(input: { label: string; area: string; startMin: number; endMin: number; weekdayMask: number }) {
  if (input.endMin <= input.startMin) return { ok: false, error: "Giờ kết thúc phải sau giờ bắt đầu" };
  await db.insert(fixedSchedule).values({ id: genId(), ...input, createdAt: Date.now() });
  revalidatePath("/settings"); revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true };
}

export async function deleteFixedSchedule(id: string) {
  await db.delete(fixedSchedule).where(eq(fixedSchedule.id, id));
  revalidatePath("/settings"); revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true };
}

export async function updateFixedSchedule(
  id: string,
  input: { label?: string; area?: string; startMin?: number; endMin?: number; weekdayMask?: number }
) {
  if (input.startMin !== undefined && input.endMin !== undefined) {
    if (input.endMin <= input.startMin) return { ok: false, error: "Giờ kết thúc phải sau giờ bắt đầu" };
  }
  const existing = await db.select().from(fixedSchedule).where(eq(fixedSchedule.id, id)).limit(1);
  if (!existing[0]) return { ok: false, error: "Không tìm thấy khối lịch" };
  await db.update(fixedSchedule).set(input).where(eq(fixedSchedule.id, id));
  revalidatePath("/settings"); revalidatePath("/calendar"); revalidatePath("/today");
  return { ok: true };
}
