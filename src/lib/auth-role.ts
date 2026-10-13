// Quyết định vai trò khi cấp phiên (SPEC-SEC-1.2 S09). Hàm thuần, Edge-safe (dùng trong jwt callback).
// Trước đây: không có studentId ⇒ owner. Giờ: owner CHỈ khi email trùng OWNER_EMAIL (owner-auth bật);
// owner-auth tắt (máy local, không có Google) thì giữ hành vi cũ để dev vào được.
//
// 🗣️ Bình dân: chỉ đúng email của Minh mới được quyền chủ, kể cả khi bước kiểm trước có sơ suất.

export type ResolvedRole =
  | { role: "student"; studentId: string }
  | { role: "owner" }
  | { role: null };

export const normalizeEmail = (e: string | null | undefined) => (e ?? "").trim().toLowerCase();

export function resolveRole(
  user: { studentId?: string | null; email?: string | null },
  ownerEmail: string | null | undefined,
  ownerAuthOn: boolean,
): ResolvedRole {
  if (user.studentId) return { role: "student", studentId: user.studentId };
  // Owner-auth tắt: chỉ máy dev được coi là owner. Production thiếu cấu hình → không ai là owner (L1).
  if (!ownerAuthOn) return process.env.NODE_ENV === "production" ? { role: null } : { role: "owner" };
  const owner = normalizeEmail(ownerEmail);
  const email = normalizeEmail(user.email);
  return owner && email && email === owner ? { role: "owner" } : { role: null };
}
