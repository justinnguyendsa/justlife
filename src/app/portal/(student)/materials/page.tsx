import { redirect } from "next/navigation";
import {
  getSessionStudentId,
  getMyMaterials,
  getMyClasses,
  getMyCompletedMaterialIds,
} from "@/lib/lms/portal-queries";
import { getEmbed, type Embed } from "@/lib/lms/embed";
import { logAccess } from "@/lib/lms/audit";
import MaterialsClient from "./MaterialsClient";

export const dynamic = "force-dynamic";

// "Tài liệu lớp": tài liệu các lớp tôi thuộc về (đã scoped + visibility='class' ở wrapper).
// P-LMS-1: link YouTube/Vimeo/Drive → nhúng video xem ngay; file → tải an toàn qua /api/lms/material/[ref].
// P-LMS-1 Quick-Win: thêm toggle hoàn thành tài liệu + progress bar (client component).

export default async function PortalMaterialsPage() {
  const studentId = await getSessionStudentId();
  if (!studentId) redirect("/portal/login");

  const [materials, classes, completedIds] = await Promise.all([
    getMyMaterials(studentId),
    getMyClasses(studentId),
    getMyCompletedMaterialIds(studentId),
  ]);

  // Audit xem tài liệu (append-only, KHÔNG PII thô — chỉ studentId). Best-effort.
  await logAccess({ actor: studentId, action: "view_material", targetType: "material" });

  const classNameById: Record<string, string> = {};
  for (const c of classes) {
    classNameById[c.id] = c.name;
  }

  // Pre-compute embeds server-side (getEmbed là pure function, không cần client).
  const embeds: Record<string, Embed | null> = {};
  for (const m of materials) {
    embeds[m.id] = getEmbed(m.url);
  }

  // Serialize materials cho client — đảm bảo kiểu tương thích RSC boundary.
  const serializedMaterials = materials.map((m) => ({
    id: m.id,
    classId: m.classId,
    title: m.title,
    fileRef: m.fileRef,
    url: m.url,
    mime: m.mime,
    size: m.size,
    createdAt: m.createdAt,
  }));

  return (
    <MaterialsClient
      materials={serializedMaterials}
      completedIds={completedIds}
      embeds={embeds}
      classNameById={classNameById}
    />
  );
}
