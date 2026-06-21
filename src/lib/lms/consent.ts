import { and, desc, eq } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { consentLog, lmsUser } from "@/db/lms/schema";
import { encryptFieldOpt } from "@/lib/lms/crypto";
import { genId } from "@/lib/id";

// 🤝 Consent + minor (SPEC-P5a §7.1, blocker #2, AC-11). R-JL-STUDENT-PII-01.
// - Thu tối thiểu: chỉ cờ isMinor + (nếu minor) guardianContact🔒 + bản ghi consent.
// - guardianContact MÃ HÓA at-rest (encryptFieldOpt) — KHÔNG lưu plaintext. ⚠ privacy-review.
// - consent_log APPEND-ONLY (chỉ thêm bản ghi, không sửa/xóa) → giữ vết đồng ý.
// - hasValidConsent: HV thường → cần data_processing; minor → BẮT BUỘC thêm minor_guardian.
//
// 🗣️ Bình dân: lưu lại "học viên (hoặc phụ huynh) đã đồng ý cho dùng dữ liệu" dưới dạng nhật ký
//    chỉ-thêm; với học viên chưa đủ 18, bắt buộc phải có đồng ý của phụ huynh thì mới được vào.

export type ConsentType = "data_processing" | "minor_guardian";

// Phiên bản thông báo quyền riêng tư (versioned) — bump khi đổi nội dung notice.
export const CONSENT_NOTICE_VERSION = "v1-2026-06-21";

// Privacy notice tiếng Việt (R-JL-VN-COPY-01) — hiển thị khi xin đồng ý.
export const PRIVACY_NOTICE_VN =
  "justlife chỉ lưu thông tin tối thiểu phục vụ việc học (tên, email nếu có, điểm, bài nộp). " +
  "Dữ liệu được lưu cục bộ, mã hóa thông tin định danh, không chia sẻ ra ngoài. " +
  "Học viên chưa đủ 18 tuổi cần có sự đồng ý của phụ huynh/người giám hộ.";

export interface RecordConsentInput {
  /** studentId (tc_student.id) — server-derived. */
  studentId: string;
  isMinor: boolean;
  /** Liên hệ phụ huynh (bắt buộc nếu minor) — sẽ MÃ HÓA trước khi lưu. */
  guardianContact?: string | null;
  /** Loại đồng ý cần ghi. Mặc định: data_processing (+ minor_guardian nếu minor). */
  types?: ConsentType[];
  /** Kênh thu đồng ý: portal (HV bấm) | offline (Minh thu hộ ngoài hệ thống). */
  channel?: "portal" | "offline";
}

/**
 * Ghi đồng ý cho 1 học viên:
 *  - Cập nhật lms_user.isMinor + guardianContact🔒 (mã hóa) cho MỌI lms_user của studentId.
 *  - Insert consent_log (append-only) cho từng type (guardianContact🔒 mã hóa trong log).
 * Trả số bản ghi consent đã thêm.
 */
export async function recordConsent(input: RecordConsentInput): Promise<{ inserted: number }> {
  if (!input.studentId) throw new Error("[lms/consent] studentId bắt buộc.");
  const isMinor = !!input.isMinor;
  if (isMinor && (!input.guardianContact || input.guardianContact.trim() === "")) {
    throw new Error("[lms/consent] Học viên chưa thành niên: bắt buộc nhập liên hệ phụ huynh.");
  }

  const now = Date.now();
  const channel = input.channel ?? "portal";
  // Mã hóa guardianContact MỘT LẦN (dùng chung cho lms_user + consent_log). 🔒 privacy-review.
  const guardianEnc = encryptFieldOpt(isMinor ? (input.guardianContact ?? null) : null);

  // 1) Cập nhật cờ minor + guardianContact🔒 trên lms_user (tạo từ access-code; có thể chưa tồn tại
  //    nếu chưa cấp mã — khi đó chỉ ghi consent_log, lms_user sẽ nhận cờ khi cấp mã qua provisionStudentAccess).
  await lmsDb
    .update(lmsUser)
    .set({ isMinor: isMinor ? 1 : 0, guardianContact: guardianEnc })
    .where(eq(lmsUser.studentId, input.studentId));

  // 2) Quyết định các type cần ghi.
  const types: ConsentType[] =
    input.types && input.types.length > 0
      ? input.types
      : isMinor
        ? ["data_processing", "minor_guardian"]
        : ["data_processing"];

  let inserted = 0;
  for (const type of types) {
    await lmsDb.insert(consentLog).values({
      id: genId(),
      studentId: input.studentId,
      type,
      granted: 1,
      grantedAt: now,
      // guardianContact🔒 chỉ gắn vào dòng minor_guardian (nơi nó có nghĩa).
      guardianContact: type === "minor_guardian" ? guardianEnc : null,
      noticeVersion: CONSENT_NOTICE_VERSION,
      channel,
    });
    inserted++;
  }
  return { inserted };
}

/** Có bản ghi consent type này (granted=1) cho studentId không. */
async function hasGranted(studentId: string, type: ConsentType): Promise<boolean> {
  const row = (
    await lmsDb
      .select({ id: consentLog.id })
      .from(consentLog)
      .where(
        and(
          eq(consentLog.studentId, studentId),
          eq(consentLog.type, type),
          eq(consentLog.granted, 1),
        ),
      )
      .orderBy(desc(consentLog.grantedAt))
      .limit(1)
  )[0];
  return !!row;
}

/**
 * Đồng ý có hợp lệ để vào portal không.
 *  - HV thường: cần data_processing.
 *  - Minor: BẮT BUỘC minor_guardian (đồng ý của phụ huynh).
 * @param isMinor cờ minor (server-derived, từ session/lms_user).
 */
export async function hasValidConsent(studentId: string, isMinor: boolean): Promise<boolean> {
  if (!studentId) return false;
  if (isMinor) {
    // Minor: phải có đồng ý phụ huynh (đủ điều kiện pháp lý) trước khi vào.
    return hasGranted(studentId, "minor_guardian");
  }
  // HV thường: có đồng ý xử lý dữ liệu là đủ.
  return hasGranted(studentId, "data_processing");
}

/** Đọc cờ isMinor mới nhất từ lms_user (server-derived). Mặc định false nếu không có bản ghi. */
export async function getIsMinor(studentId: string): Promise<boolean> {
  const row = (
    await lmsDb
      .select({ isMinor: lmsUser.isMinor })
      .from(lmsUser)
      .where(eq(lmsUser.studentId, studentId))
      .limit(1)
  )[0];
  return row?.isMinor === 1;
}
