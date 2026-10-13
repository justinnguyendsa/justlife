// Nhận diện lỗi DB dùng chung cho các truy vấn LMS (không import gì nặng → test được trực tiếp).

/** Lỗi vi phạm ràng buộc UNIQUE của SQLite/libSQL (drizzle bọc lỗi gốc trong `cause`). */
export function isUniqueViolation(e: unknown): boolean {
  for (let cur: unknown = e, depth = 0; cur && depth < 4; cur = (cur as { cause?: unknown }).cause, depth++) {
    const { code, message } = cur as { code?: unknown; message?: unknown };
    if (code === "SQLITE_CONSTRAINT_UNIQUE" || code === "SQLITE_CONSTRAINT_PRIMARYKEY") return true;
    if (typeof message === "string" && message.includes("UNIQUE constraint failed")) return true;
  }
  return false;
}
