"use server";
import { revalidatePath } from "next/cache";
import { eq, and, ne, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { task, deadline, userSettings } from "@/db/schema";
import { calcPriorityScore } from "@/lib/priority";
import { buildDeadlineRows } from "@/lib/escalation";
import { genId } from "@/lib/id";

function refresh() {
  for (const p of ["/today", "/tasks", "/calendar", "/deadlines"]) revalidatePath(p);
}

/** Xóa deadline cũ và tạo lại nếu có deadlineAt */
async function rebuildDeadlines(taskId: string, deadlineAt: number | null) {
  await db.delete(deadline).where(eq(deadline.taskId, taskId));
  if (deadlineAt != null) {
    const now = Date.now();
    for (const r of buildDeadlineRows(taskId, deadlineAt, now)) {
      await db.insert(deadline).values(r);
    }
  }
}

/** Đọc WIP limit từ settings (mặc định 3) */
async function getWipLimit(): Promise<number> {
  const row = await db
    .select()
    .from(userSettings)
    .where(eq(userSettings.key, "wip_limit"))
    .limit(1);
  const raw = row[0]?.value;
  const parsed = raw != null ? parseInt(raw, 10) : NaN;
  return isNaN(parsed) ? 3 : parsed;
}

/** Đếm số task đang 'doing', tùy chọn bỏ qua 1 task */
async function countDoingTasks(excludeId?: string): Promise<number> {
  const rows = excludeId
    ? await db
        .select({ id: task.id })
        .from(task)
        .where(and(eq(task.status, "doing"), ne(task.id, excludeId)))
    : await db.select({ id: task.id }).from(task).where(eq(task.status, "doing"));
  return rows.length;
}

// ─── CREATE ───────────────────────────────────────────────────────────────────

export async function createTask(input: {
  title: string;
  area: string;
  deadlineAt: number | null;
  effort: number | null;
  impact: number | null;
}) {
  const now = Date.now();
  const id = genId();
  await db.insert(task).values({
    id,
    title: input.title,
    area: input.area,
    status: "inbox",
    effort: input.effort,
    impact: input.impact,
    deadlineAt: input.deadlineAt,
    priorityScore: calcPriorityScore({
      effort: input.effort,
      impact: input.impact,
      deadlineAt: input.deadlineAt,
      now,
    }),
    createdAt: now,
    updatedAt: now,
  });
  if (input.deadlineAt != null) {
    for (const r of buildDeadlineRows(id, input.deadlineAt, now)) {
      await db.insert(deadline).values(r);
    }
  }
  refresh();
  return { ok: true, id };
}

// ─── UPDATE (full) ─────────────────────────────────────────────────────────────

export async function updateTask(
  id: string,
  data: {
    title?: string;
    note?: string;
    status?: string;
    effort?: number | null;
    impact?: number | null;
    deadlineAt?: number | null;
  }
) {
  const now = Date.now();

  // Validate title nếu được truyền vào
  if (data.title !== undefined) {
    if (data.title.trim() === "") {
      return { ok: false, error: "Vui lòng nhập tiêu đề" };
    }
    if (data.title.length > 500) {
      data.title = data.title.slice(0, 500);
    }
  }

  // Đọc task hiện tại để merge
  const cur = (await db.select().from(task).where(eq(task.id, id)).limit(1))[0];
  if (!cur) return { ok: false, error: "Không tìm thấy việc" };

  // WIP check khi chuyển sang 'doing'
  if (data.status === "doing") {
    const limit = await getWipLimit();
    const current = await countDoingTasks(id);
    if (current >= limit) {
      return { ok: false, wip_exceeded: true, current, limit };
    }
  }

  // Tính lại priority nếu các trường liên quan thay đổi
  const effort = data.effort !== undefined ? data.effort : cur.effort;
  const impact = data.impact !== undefined ? data.impact : cur.impact;
  const deadlineAt = data.deadlineAt !== undefined ? data.deadlineAt : cur.deadlineAt;

  const priorityScore = calcPriorityScore({ effort, impact, deadlineAt, now });

  // Tạo object update
  const updateValues: Record<string, unknown> = {
    updatedAt: now,
    priorityScore,
  };
  if (data.title !== undefined) updateValues.title = data.title;
  if (data.note !== undefined) updateValues.note = data.note;
  if (data.status !== undefined) updateValues.status = data.status;
  if (data.effort !== undefined) updateValues.effort = data.effort;
  if (data.impact !== undefined) updateValues.impact = data.impact;
  if (data.deadlineAt !== undefined) updateValues.deadlineAt = data.deadlineAt;
  if (data.status === "done") {
    updateValues.doneAt = now;
  }

  await db.update(task).set(updateValues).where(eq(task.id, id));

  // Rebuild deadlines nếu deadlineAt thay đổi
  if (data.deadlineAt !== undefined) {
    await rebuildDeadlines(id, data.deadlineAt);
  }

  refresh();
  return { ok: true };
}

// ─── UPDATE PRIORITY ───────────────────────────────────────────────────────────

export async function updateTaskPriority(
  id: string,
  input: { effort: number; impact: number; deadlineAt?: number | null }
) {
  const now = Date.now();
  const cur = (await db.select().from(task).where(eq(task.id, id)).limit(1))[0];
  if (!cur) return { ok: false };
  const deadlineAt = input.deadlineAt === undefined ? cur.deadlineAt : input.deadlineAt;
  await db
    .update(task)
    .set({
      effort: input.effort,
      impact: input.impact,
      deadlineAt,
      priorityScore: calcPriorityScore({ effort: input.effort, impact: input.impact, deadlineAt, now }),
      updatedAt: now,
    })
    .where(eq(task.id, id));
  if (input.deadlineAt !== undefined) {
    await db.delete(deadline).where(eq(deadline.taskId, id));
    if (deadlineAt != null) {
      for (const r of buildDeadlineRows(id, deadlineAt, now)) {
        await db.insert(deadline).values(r);
      }
    }
  }
  refresh();
  return { ok: true };
}

// ─── SET STATUS (với WIP check) ────────────────────────────────────────────────

export async function setTaskStatus(id: string, status: string) {
  const now = Date.now();

  if (status === "doing") {
    const limit = await getWipLimit();
    const current = await countDoingTasks(id);
    if (current >= limit) {
      return { ok: false, wip_exceeded: true, current, limit };
    }
  }

  await db
    .update(task)
    .set({ status, doneAt: status === "done" ? now : null, updatedAt: now })
    .where(eq(task.id, id));
  refresh();
  return { ok: true };
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function deleteTask(id: string) {
  const cur = (await db.select({ id: task.id }).from(task).where(eq(task.id, id)).limit(1))[0];
  if (!cur) return { ok: false, error: "Không tìm thấy việc" };

  await db.delete(deadline).where(eq(deadline.taskId, id));
  await db.delete(task).where(eq(task.id, id));

  refresh();
  return { ok: true };
}

// ─── ARCHIVE ──────────────────────────────────────────────────────────────────

export async function archiveTask(id: string) {
  const now = Date.now();
  await db
    .update(task)
    .set({ status: "done", doneAt: now, updatedAt: now })
    .where(eq(task.id, id));
  refresh();
  return { ok: true };
}
