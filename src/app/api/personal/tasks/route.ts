import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { task } from "@/db/schema";
import { and, asc, desc, eq, isNotNull, ne, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? "";
    const sort = searchParams.get("sort") ?? "priority";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get("limit") ?? "20", 10)));
    const offset = (page - 1) * limit;

    // Build where conditions
    const conditions = [];
    if (status) {
      conditions.push(eq(task.status, status));
    } else {
      // Exclude 'done' when no filter specified
      conditions.push(ne(task.status, "done"));
    }

    // Build order
    const orderBy =
      sort === "created"
        ? [desc(task.createdAt)]
        : [
            // priority: non-null priorityScore desc first, then nulls last
            sql`CASE WHEN ${task.priorityScore} IS NULL THEN 1 ELSE 0 END ASC`,
            desc(task.priorityScore),
            desc(task.createdAt),
          ];

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [tasks, countRows] = await Promise.all([
      db
        .select()
        .from(task)
        .where(where)
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(task)
        .where(where),
    ]);

    const total = countRows[0]?.count ?? 0;

    return NextResponse.json({ tasks, total, page });
  } catch (err) {
    console.error("[GET /api/personal/tasks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
