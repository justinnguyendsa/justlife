import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

// 🔒 Mã hóa at-rest field ĐỊNH DANH cho lms.db (ADR-002 Q6, SPEC-P5a §6, blocker #4).
// AES-256-GCM (bảo mật + toàn vẹn nhờ tag) + blind-index HMAC-SHA256 (login-lookup không giải mã).
// node:crypto built-in — KHÔNG lib ngoài. Key TỪ ENV — KHÔNG hardcode (R-JL-NO-HARDCODE-01).
//
// 🗣️ Bình dân: khóa thông tin nhận dạng (tên/email/note/guardian) bằng "chìa bí mật" trong cấu hình;
//    vẫn tra "email này là ai" bằng dấu vân tay một chiều mà không cần mở khóa.
//
// ⚠ S2: build sẵn util. CHƯA mã hóa lại teaching data cũ (plaintext local hợp lệ);
//    mã hóa-at-rest là hardening trước go-live (privacy-review).

const VERSION = "v1"; // versioned prefix → cho phép key-rotation về sau (giải mã v1, ghi lại v2)
const IV_LEN = 12; // GCM khuyến nghị 96-bit IV
const TAG_LEN = 16; // GCM auth tag 128-bit
const KEY_LEN = 32; // AES-256 → 32 byte

// --- Fail-fast key loader: thiếu/sai key → throw NGAY, không chạy chế độ "quên mã hóa" ---
function loadKey(envName: string): Buffer {
  const raw = process.env[envName];
  if (!raw || raw.trim() === "") {
    throw new Error(
      `[lms/crypto] Thiếu biến môi trường ${envName}. Bắt buộc phải có (hex 32 byte) — không chạy ở chế độ không mã hóa.`,
    );
  }
  const hex = raw.trim();
  if (!/^[0-9a-fA-F]+$/.test(hex)) {
    throw new Error(`[lms/crypto] ${envName} phải là chuỗi hex.`);
  }
  const key = Buffer.from(hex, "hex");
  if (key.length !== KEY_LEN) {
    throw new Error(
      `[lms/crypto] ${envName} phải là 32 byte (64 ký tự hex); nhận được ${key.length} byte.`,
    );
  }
  return key;
}

// Lazy-load + cache: chỉ đọc key khi thực sự dùng (tránh throw lúc import nếu module được nạp ở chỗ không cần).
let _encKey: Buffer | null = null;
let _indexKey: Buffer | null = null;
function encKey(): Buffer {
  if (!_encKey) _encKey = loadKey("LMS_ENCRYPTION_KEY");
  return _encKey;
}
function indexKey(): Buffer {
  if (!_indexKey) _indexKey = loadKey("LMS_INDEX_KEY");
  return _indexKey;
}

/**
 * Mã hóa 1 field định danh.
 * @returns "v1:" + base64(iv | tag | ciphertext)
 */
export function encryptField(plain: string): string {
  if (typeof plain !== "string") {
    throw new Error("[lms/crypto] encryptField nhận chuỗi.");
  }
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", encKey(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([iv, tag, ct]);
  return `${VERSION}:${packed.toString("base64")}`;
}

/**
 * Giải mã field định danh. Sai key / dữ liệu hỏng → throw (GCM xác thực toàn vẹn).
 */
export function decryptField(cipher: string): string {
  if (typeof cipher !== "string" || !cipher.startsWith(`${VERSION}:`)) {
    throw new Error("[lms/crypto] Ciphertext không đúng định dạng v1.");
  }
  const packed = Buffer.from(cipher.slice(VERSION.length + 1), "base64");
  if (packed.length < IV_LEN + TAG_LEN) {
    throw new Error("[lms/crypto] Ciphertext quá ngắn / hỏng.");
  }
  const iv = packed.subarray(0, IV_LEN);
  const tag = packed.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = packed.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", encKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}

// --- Helper cho field nullable (email/note/guardian có thể null) ---
export function encryptFieldOpt(plain: string | null | undefined): string | null {
  return plain == null || plain === "" ? null : encryptField(plain);
}
export function decryptFieldOpt(cipher: string | null | undefined): string | null {
  return cipher == null || cipher === "" ? null : decryptField(cipher);
}

/**
 * Chuẩn hóa giá trị trước khi tính blind-index (email: trim + lowercase).
 */
export function normalizeForIndex(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Blind-index deterministic: HMAC-SHA256(normalize(value), LMS_INDEX_KEY) → hex.
 * Cho phép `WHERE emailIndex = ?` mà không giải mã, không lộ giá trị thô.
 * Key TÁCH với encryption key (compromise 1 cái không lộ cái kia).
 */
export function blindIndex(value: string): string {
  return createHmac("sha256", indexKey())
    .update(normalizeForIndex(value), "utf8")
    .digest("hex");
}

/**
 * So sánh chuỗi hằng-thời-gian (chống timing attack khi đối chiếu hash/index).
 */
export function safeEqualHex(a: string, b: string): boolean {
  const ba = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
