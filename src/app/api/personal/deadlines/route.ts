import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { task, deadline } from "@/db/schema";
import { effectiveEscalation, isSnoozed } from "@/lib/escalation";
import { and, asc, eq, gte, lte, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

type DeadlineWithEffective = {
  id: string;
  taskId: string;
  dueAt: number;
  milestone: string;
  escalationLevel: number;
  snoozeUntil: number | null;
  createdAt: number;
  effective_escalation: 1 | 2 | 3;
  task: { id: string; title: string; deadlineAt: number | null };
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const windowDays = Math.max(1, parseInt(searchParams.get("window_days") ?? "7", 10));

    const now = Date.now();
    const windowMs = windowDays * 86_400_000;

    // Join deadline + task (task not done)
    const rows = await db
      .select({
        id: deadline.id,
        taskId: deadline.taskId,
        dueAt: deadline.dueAt,
        milestone: deadline.milestone,
        escalationLevel: deadline.escalationLevel,
        snoozeUntil: deadline.snoozeUntil,
        createdAt: deadline.createdAt,
        taskTitle: task.title,
        taskDeadlineAt: task.deadlineAt,
        taskStatus: task.status,
      })
      .from(deadline)
      .innerJoin(task, eq(deadline.taskId, task.id))
      .where(ne(task.status, "done"))
      .orderBy(asc(deadline.dueAt));

    // Filter snoozed
    const active = rows.filter((r) => !isSnoozed(r.snoozeUntil, now));

    const mapRow = (r: typeof active[0]): DeadlineWithEffective => ({
      id: r.id,
      taskId: r.taskId,
      dueAt: r.dueAt,
      milestone: r.milestone,
      escalationLevel: r.escalationLevel,
      snoozeUntil: r.snoozeUntil,
      createdAt: r.createdAt,
      effective_escalation: effectiveEscalation(r.dueAt, r.escalationLevel, now),
      task: {
        id: r.taskId,
        title: r.taskTitle,
        deadlineAt: r.taskDeadlineAt,
      },
    });

    // overdue: dueAt < now OR task.deadlineAt < now
    const overdue: DeadlineWithEffective[] = active
      .filter((r) => r.dueAt < now || (r.taskDeadlineAt != null && r.taskDeadlineAt < now))
      .map(mapRow);

    // upcoming: dueAt >= now && dueAt <= now + window_days * 86400000
    const upcoming: DeadlineWithEffective[] = active
      .filter((r) => r.dueAt >= now && r.dueAt <= now + windowMs)
      .map(mapRow);

    return NextResponse.json({ upcoming, overdue });
  } catch (err) {
    console.error("[GET /api/personal/deadlines]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
