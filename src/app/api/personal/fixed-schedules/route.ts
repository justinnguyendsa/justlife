import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { fixedSchedule } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const schedules = await db
      .select()
      .from(fixedSchedule)
      .orderBy(desc(fixedSchedule.createdAt));

    return NextResponse.json({ schedules });
  } catch (err) {
    console.error("[GET /api/personal/fixed-schedules]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
