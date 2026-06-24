import { db } from "@/db/client";
import { fixedSchedule } from "@/db/schema";
import { desc } from "drizzle-orm";
import { FixedSchedulesClient } from "./FixedSchedulesClient";

export const dynamic = "force-dynamic";

export default async function FixedSchedulesPage() {
  const schedules = await db.select().from(fixedSchedule).orderBy(desc(fixedSchedule.createdAt));
  return <FixedSchedulesClient schedules={schedules} />;
}
