import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  getSessionStudentId,
  getMyProfile,
  getMyStats28d,
} from "@/lib/lms/portal-queries";
import { maskEmail } from "@/lib/format";
import { ProfileClient, type LinkNotice } from "./ProfileClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ của tôi · Cổng học viên",
};

const NOTICES: Record<string, LinkNotice> = {
  taken: { ok: false, text: "Gmail này đã được liên kết với tài khoản khác." },
  owner: { ok: false, text: "Không thể liên kết địa chỉ này." },
  invalid: { ok: false, text: "Google không trả về địa chỉ Gmail hợp lệ." },
  no_student: { ok: false, text: "Tài khoản học viên chưa sẵn sàng — nhắn giảng viên giúp nhé." },
  error: { ok: false, text: "Chưa liên kết được, thử lại nhé." },
};

export default async function ProfilePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [profile, stats] = await Promise.all([
    getMyProfile(studentId),
    getMyStats28d(studentId),
  ]);

  if (!profile) redirect("/portal");

  // Email chỉ đi xuống trình duyệt ở dạng đã che (SPEC-SEC-1.2 S11).
  const safeProfile = { ...profile, gmailEmail: profile.gmailEmail ? maskEmail(profile.gmailEmail) : null };
  const linkParam = typeof params.link === "string" ? params.link : undefined;
  const notice: LinkNotice | null =
    params.linked === "1" && profile.gmailLinked
      ? { ok: true, text: "Đã liên kết Gmail qua Google — lần sau có thể đăng nhập bằng Gmail." }
      : linkParam
        ? (NOTICES[linkParam] ?? NOTICES.error)
        : null;
  const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

  return <ProfileClient profile={safeProfile} stats={stats} googleEnabled={googleEnabled} notice={notice} />;
}
