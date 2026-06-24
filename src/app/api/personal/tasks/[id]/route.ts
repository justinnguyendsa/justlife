import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { task, deadline } from "@/db/schema";
import { effectiveEscalation } from "@/lib/escalation";
import { eq } from "drizzle-orm";

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

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const taskRow = await db
      .select()
      .from(task)
      .where(eq(task.id, id))
      .limit(1);

    if (taskRow.length === 0) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const foundTask = taskRow[0];

    const deadlineRows = await db
      .select()
      .from(deadline)
      .where(eq(deadline.taskId, id));

    const now = Date.now();

    const deadlines: DeadlineWithEffective[] = deadlineRows.map((d) => {
      // Effective escalation: if task.deadlineAt < now → 3, else use stored level
      const eff = effectiveEscalation(d.dueAt, d.escalationLevel, now);
      return {
        id: d.id,
        taskId: d.taskId,
        dueAt: d.dueAt,
        milestone: d.milestone,
        escalationLevel: d.escalationLevel,
        snoozeUntil: d.snoozeUntil,
        createdAt: d.createdAt,
        effective_escalation: eff,
        task: {
          id: foundTask.id,
          title: foundTask.title,
          deadlineAt: foundTask.deadlineAt,
        },
      };
    });

    return NextResponse.json({ task: foundTask, deadlines });
  } catch (err) {
    console.error("[GET /api/personal/tasks/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
