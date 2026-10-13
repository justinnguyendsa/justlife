import { asc } from "drizzle-orm";
import { db } from "@/db/client";
import { fixedSchedule } from "@/db/schema";
import { getSettings } from "@/db/queries";
import { getOwnerSession, isOwnerAuthEnabled } from "@/lib/auth-guard";
import { maskEmail } from "@/lib/format";
import { parseWipLimit } from "@/lib/wip";
import { PageHeader } from "@/components/PageHeader";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

// Màn Cài đặt (SPEC-UI-P2.5 F01). Email chỉ đi xuống client ở dạng đã che.
export default async function SettingsPage() {
  const [fixed, settings, session] = await Promise.all([
    db.select().from(fixedSchedule).orderBy(asc(fixedSchedule.startMin)),
    getSettings(),
    getOwnerSession(),
  ]);
  const email = session?.user?.email ? maskEmail(session.user.email) : null;
  return (
    <>
      <PageHeader title="Cài đặt" sub="Giờ bận · giới hạn · giao diện · tài khoản" />
      <SettingsClient fixed={fixed} wip={parseWipLimit(settings.wip_limit)} account={{ enabled: isOwnerAuthEnabled(), email }} />
    </>
  );
}
