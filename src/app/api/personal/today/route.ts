import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { task, deadline, timeBlock } from "@/db/schema";
import { effectiveEscalation, isSnoozed } from "@/lib/escalation";
import { startOfDay } from "@/lib/scheduler";
import { and, asc, desc, eq, gte, lte, ne, or } from "drizzle-orm";

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

// Parse YYYY-MM-DD → epoch ms (local midnight)
function parseDateParam(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  return d.getTime();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const dateParam = searchParams.get("date");

    const now = Date.now();
    // "Hôm nay" theo Asia/Ho_Chi_Minh — use startOfDay (local server time)
    let dayStart: number;
    if (dateParam) {
      dayStart = parseDateParam(dateParam);
    } else {
      dayStart = startOfDay(now);
    }
    const dayEnd = dayStart + 86_400_000; // exclusive end of day

    // doing: tasks where status='doing'
    const doingTasks = await db
      .select()
      .from(task)
      .where(eq(task.status, "doing"))
      .orderBy(desc(task.updatedAt));

    // priority_top: top 3 tasks not done/doing, sort desc priorityScore (nulls last)
    const priorityTop = await db
      .select()
      .from(task)
      .where(
        and(
          ne(task.status, "done"),
          ne(task.status, "doing")
        )
      )
      .orderBy(
        // nulls last for priorityScore
        asc(task.priorityScore), // placeholder — we refine below via raw SQL approach
        desc(task.createdAt)
      )
      .limit(3);

    // Re-fetch priority_top with proper null-last ordering
    const priorityTopFinal = await db.all<{
      id: string; title: string; note: string | null; area: string;
      status: string; effort: number | null; impact: number | null;
      deadline_at: number | null; priority_score: number | null;
      created_at: number; updated_at: number; done_at: number | null;
    }>(
      `SELECT * FROM task WHERE status != 'done' AND status != 'doing'
       ORDER BY CASE WHEN priority_score IS NULL THEN 1 ELSE 0 END ASC,
                priority_score DESC, created_at DESC
       LIMIT 3`
    );

    const priorityTopMapped = priorityTopFinal.map((r) => ({
      id: r.id,
      title: r.title,
      note: r.note,
      area: r.area,
      status: r.status,
      effort: r.effort,
      impact: r.impact,
      deadlineAt: r.deadline_at,
      priorityScore: r.priority_score,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      doneAt: r.done_at,
    }));

    // deadlines_24h: dueAt <= now + 24h, not snoozed
    const horizon = now + 86_400_000;
    const deadlineRows = await db
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
      })
      .from(deadline)
      .innerJoin(task, eq(deadline.taskId, task.id))
      .where(
        and(
          lte(deadline.dueAt, horizon),
          ne(task.status, "done")
        )
      )
      .orderBy(asc(deadline.dueAt));

    const deadlines24h: DeadlineWithEffective[] = deadlineRows
      .filter((d) => !isSnoozed(d.snoozeUntil, now))
      .map((d) => ({
        id: d.id,
        taskId: d.taskId,
        dueAt: d.dueAt,
        milestone: d.milestone,
        escalationLevel: d.escalationLevel,
        snoozeUntil: d.snoozeUntil,
        createdAt: d.createdAt,
        effective_escalation: effectiveEscalation(d.dueAt, d.escalationLevel, now),
        task: {
          id: d.taskId,
          title: d.taskTitle,
          deadlineAt: d.taskDeadlineAt,
        },
      }));

    // time_blocks: blocks in today's range
    const timeBlocks = await db
      .select()
      .from(timeBlock)
      .where(
        and(
          gte(timeBlock.startAt, dayStart),
          lte(timeBlock.startAt, dayEnd - 1)
        )
      )
      .orderBy(asc(timeBlock.startAt));

    // Suppress unused variable warning from the non-raw priorityTop
    void priorityTop;

    return NextResponse.json({
      doing: doingTasks,
      priority_top: priorityTopMapped,
      deadlines_24h: deadlines24h,
      time_blocks: timeBlocks,
    });
  } catch (err) {
    console.error("[GET /api/personal/today]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
