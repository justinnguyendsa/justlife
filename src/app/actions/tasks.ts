"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { task, deadline } from "@/db/schema";
import { calcPriorityScore } from "@/lib/priority";
import { buildDeadlineRows } from "@/lib/escalation";
import { genId } from "@/lib/id";

function refresh() { for (const p of ["/today", "/tasks", "/calendar", "/deadlines"]) revalidatePath(p); }

export async function createTask(input: {
  title: string; area: string; deadlineAt: number | null; effort: number | null; impact: number | null;
}) {
  const now = Date.now();
  const id = genId();
  await db.insert(task).values({
    id, title: input.title, area: input.area, status: "inbox",
    effort: input.effort, impact: input.impact, deadlineAt: input.deadlineAt,
    priorityScore: calcPriorityScore({ effort: input.effort, impact: input.impact, deadlineAt: input.deadlineAt, now }),
    createdAt: now, updatedAt: now,
  });
  if (input.deadlineAt != null) {
    for (const r of buildDeadlineRows(id, input.deadlineAt, now)) await db.insert(deadline).values(r);
  }
  refresh();
  return { ok: true, id };
}

export async function updateTaskPriority(id: string, input: { effort: number; impact: number; deadlineAt?: number | null }) {
  const now = Date.now();
  const cur = (await db.select().from(task).where(eq(task.id, id)).limit(1))[0];
  if (!cur) return { ok: false };
  const deadlineAt = input.deadlineAt === undefined ? cur.deadlineAt : input.deadlineAt;
  await db.update(task).set({
    effort: input.effort, impact: input.impact, deadlineAt,
    priorityScore: calcPriorityScore({ effort: input.effort, impact: input.impact, deadlineAt, now }),
    updatedAt: now,
  }).where(eq(task.id, id));
  if (input.deadlineAt !== undefined) {
    await db.delete(deadline).where(eq(deadline.taskId, id));
    if (deadlineAt != null) for (const r of buildDeadlineRows(id, deadlineAt, now)) await db.insert(deadline).values(r);
  }
  refresh();
  return { ok: true };
}

export async function setTaskStatus(id: string, status: string) {
  const now = Date.now();
  await db.update(task).set({ status, doneAt: status === "done" ? now : null, updatedAt: now }).where(eq(task.id, id));
  refresh();
  return { ok: true };
}
