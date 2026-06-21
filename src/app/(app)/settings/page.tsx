import { db } from "@/db/client";
import { fixedSchedule } from "@/db/schema";
import { getSettings } from "@/db/queries";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const fixed = await db.select().from(fixedSchedule);
  const settings = await getSettings();
  const wip = Number(settings.wip_limit ?? "3");
  return (
    <>
      <PageHeader title="Cài đặt" sub="Lịch cố định · giới hạn tập trung" />
      <SettingsClient fixed={fixed} wip={wip} />
      <Section color="var(--module-study)" title="Giao diện" />
      <div className="card">
        <div className="setrow">
          <div><div className="l">Chế độ sáng / tối</div><div className="d">mặc định: sáng</div></div>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
