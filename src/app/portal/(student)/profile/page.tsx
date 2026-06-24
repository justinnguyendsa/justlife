import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getSessionStudentId,
  getMyProfile,
  getMyStats28d,
} from "@/lib/lms/portal-queries";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi · Cổng học viên",
};

export default async function ProfilePage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [profile, stats] = await Promise.all([
    getMyProfile(studentId),
    getMyStats28d(studentId),
  ]);

  if (!profile) redirect("/portal");

  return <ProfileClient profile={profile} stats={stats} />;
}
