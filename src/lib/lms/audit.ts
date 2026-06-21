import { createHash } from "node:crypto";
import { lmsDb } from "@/db/lms/client";
import { accessAudit } from "@/db/lms/schema";
import { genId } from "@/lib/id";

// 📒 Audit log truy cập PII/điểm/bài — APPEND-ONLY (SPEC-P5a §7.2, blocker "required", AC-12).
// BẤT BIẾN:
//  - CHỈ ghi id + action + thời điểm. KHÔNG ghi tên/email/điểm/nội dung/đường dẫn (KHÔNG PII thô).
//  - actorRef là studentId (id ngẫu nhiên, không phải tên) hoặc "minh"/"system" — KHÔNG phải PII.
//  - ipHash (nếu có) là HASH, không lưu IP thô.
//  - Chỉ INSERT (không update/delete) → giữ vết bất biến.
//  - Lỗi ghi audit KHÔNG được làm hỏng hành động chính (best-effort, nuốt lỗi CÓ CHỦ Ý + log server).
//
// 🗣️ Bình dân: cuốn "nhật ký truy cập" chỉ ghi "ai (mã số) đã làm gì, lúc nào" — không chép
//    tên/điểm/nội dung, và không bao giờ sửa/xóa dòng đã ghi.

export type ActorType = "student" | "instructor" | "system";

export type AuditAction =
  | "login"
  | "view_grades"
  | "view_material"
  | "submit"
  | "download"
  | "grade_edit"
  | "delete_student"
  | "export";

export type AuditTargetType =
  | "grade"
  | "material"
  | "submission"
  | "student"
  | "class";

export interface LogAccessInput {
  /** Ai thực hiện: studentId (HV) hoặc "instructor". Mặc định suy actorType từ đây. */
  actor: string;
  action: AuditAction;
  /** Loại đối tượng bị tác động (nullable). */
  targetType?: AuditTargetType | null;
  /** Id đối tượng bị tác động (id ngẫu nhiên, KHÔNG PII; nullable). */
  targetId?: string | null;
  /** Kết quả: ok (mặc định) | denied. */
  result?: "ok" | "denied";
  /** Phân loại chủ thể; mặc định: actor === "instructor" → instructor, ngược lại student. */
  actorType?: ActorType;
  /** IP thô (tùy chọn) → sẽ HASH trước khi lưu, KHÔNG lưu thô. */
  ip?: string | null;
}

/** Hash IP (sha256 hex) — KHÔNG lưu IP thô. */
function hashIp(ip: string): string {
  return createHash("sha256").update(ip, "utf8").digest("hex");
}

/**
 * Ghi 1 dòng audit (append-only). Bám đúng cột access_audit.
 * KHÔNG PII thô: chỉ id + action + ts + result.
 * Best-effort: không ném lỗi ra ngoài (audit hỏng không được chặn hành động chính).
 */
export async function logAccess(input: LogAccessInput): Promise<void> {
  try {
    const actorType: ActorType =
      input.actorType ?? (input.actor === "instructor" ? "instructor" : "student");
    await lmsDb.insert(accessAudit).values({
      id: genId(),
      ts: Date.now(),
      actorType,
      actorRef: input.actor, // studentId (id, không PII) | "instructor" | "system"
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null, // id ngẫu nhiên — không PII thô
      result: input.result ?? "ok",
      ipHash: input.ip ? hashIp(input.ip) : null,
    });
  } catch (e) {
    // KHÔNG để audit hỏng làm vỡ luồng chính. Ghi ra server log (không PII) để theo dõi.
    console.error("[lms/audit] ghi audit thất bại:", (e as Error)?.message);
  }
}
