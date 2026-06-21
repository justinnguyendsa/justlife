import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { lmsDb } from "@/db/lms/client";
import { accessCode, lmsUser } from "@/db/lms/schema";
import { genId } from "@/lib/id";

// 🔐 Access-code = provider PHỤ (Credentials) dùng NGAY ở P5a (ADR-002 Q3, blocker #6).
// - Sinh code mạnh bằng crypto.randomInt (KHÔNG Math.random, KHÔNG genId cho phần bí mật).
// - Lưu HASH (sha256), KHÔNG lưu code thô. Trả code thô đúng 1 lần lúc cấp.
// - verify: hash → tra (deterministic, dùng index) → trả studentId | null.
// - Rate-limit tối thiểu cho local: đếm lần sai gần đây, khóa tạm sau N lần.
// - Thông báo lỗi CHUNG (không tiết lộ "code tồn tại hay không") — chống enumeration.
//
// Schema thật: access_code.lmsUserId → lms_user.studentId (KHÔNG có cột studentId trực tiếp).
// Một code gắn 1 lms_user; studentId resolve qua lms_user.
//
// 🗣️ Bình dân: Minh cấp "mã truy cập" cho học viên (dạng AAAA-BBBB). Hệ thống chỉ giữ
//    "dấu vân tay" của mã (không giữ mã gốc). Nhập sai nhiều lần thì bị khóa tạm.

// Bảng chữ cái không gây nhầm (bỏ 0/O/1/I/L) — 31 ký tự, 2 nhóm 4 → ~39.6 bit entropy.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 31 ký tự
const GROUP_LEN = 4;
const GROUPS = 2;

const MAX_ATTEMPTS = 5; // sai quá ngưỡng → khóa tạm
const LOCK_MS = 15 * 60_000; // khóa 15 phút
const DEFAULT_TTL_MS = 30 * 86_400_000; // mã sống 30 ngày (P5a; chốt lại ở go-live)
const WINDOW_MS = 15 * 60_000; // cửa sổ đếm lần sai

// --- Rate-limit tối thiểu cho LOCAL (in-memory, per-process) ---
// Code sai KHÔNG khớp hash bất kỳ row nào → không có bản ghi để gắn đếm; vì vậy đếm theo bộ nhớ
// (đủ làm chậm brute-force ở môi trường local/single-instance). Go-live: thay bằng store bền/IP-based.
// 🗣️ Bình dân: nhập sai liên tục sẽ bị "tạm dừng thử" một lúc.
const _failHits: number[] = []; // mốc thời gian các lần sai gần đây
function pruneFails(now: number) {
  while (_failHits.length && _failHits[0] < now - WINDOW_MS) _failHits.shift();
}
function isGloballyThrottled(now: number): boolean {
  pruneFails(now);
  return _failHits.length >= MAX_ATTEMPTS;
}
function recordGlobalFail(now: number) {
  pruneFails(now);
  _failHits.push(now);
}

/** Chuẩn hóa code người dùng nhập: bỏ khoảng trắng, in hoa, đảm bảo có dấu '-' giữa 2 nhóm. */
export function normalizeCode(raw: string): string {
  const clean = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== GROUP_LEN * GROUPS) return clean; // sai độ dài → trả nguyên (verify sẽ fail an toàn)
  return `${clean.slice(0, GROUP_LEN)}-${clean.slice(GROUP_LEN)}`;
}

/** Hash deterministic của code (sha256 hex) — để lưu & lookup. */
function hashCode(normalized: string): string {
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

/** Sinh 1 code thô dạng XXXX-XXXX bằng CSPRNG (randomInt). */
function generateRawCode(): string {
  const parts: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let s = "";
    for (let i = 0; i < GROUP_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(s);
  }
  return parts.join("-");
}

/** Tìm (hoặc tạo) lms_user theo studentId, provider credentials. Trả lmsUserId. */
async function ensureCredentialsUser(studentId: string): Promise<string> {
  const existing = (
    await lmsDb
      .select({ id: lmsUser.id })
      .from(lmsUser)
      .where(eq(lmsUser.studentId, studentId))
      .limit(1)
  )[0];
  if (existing) return existing.id;

  const id = genId();
  await lmsDb.insert(lmsUser).values({
    id,
    studentId,
    authProvider: "credentials",
    isMinor: 0,
    status: "active",
    createdAt: Date.now(),
  });
  return id;
}

export interface IssueResult {
  code: string; // code THÔ — chỉ trả 1 lần này
  lmsUserId: string;
  accessCodeId: string;
  expiresAt: number;
}

/**
 * Cấp access-code cho 1 học viên (studentId). Sinh code mạnh, lưu HASH, trả code thô 1 lần.
 * Thu hồi các code cũ chưa dùng của cùng user (one active code at a time).
 */
export async function issueAccessCode(
  studentId: string,
  opts?: { ttlMs?: number },
): Promise<IssueResult> {
  if (!studentId) throw new Error("[access-code] studentId bắt buộc.");
  const lmsUserId = await ensureCredentialsUser(studentId);

  // Vô hiệu hóa code cũ chưa dùng (đánh dấu usedAt=now để không còn verify được).
  const now = Date.now();
  await lmsDb
    .update(accessCode)
    .set({ usedAt: now })
    .where(and(eq(accessCode.lmsUserId, lmsUserId), isNull(accessCode.usedAt)));

  const ttl = opts?.ttlMs ?? DEFAULT_TTL_MS;
  const expiresAt = now + ttl;
  const raw = generateRawCode();
  const id = genId();
  await lmsDb.insert(accessCode).values({
    id,
    lmsUserId,
    codeHash: hashCode(raw),
    createdAt: now,
    expiresAt,
    usedAt: null,
    attemptCount: 0,
    lockedUntil: null,
  });

  return { code: raw, lmsUserId, accessCodeId: id, expiresAt };
}

/**
 * ⚠ DEV ONLY — cấp 1 access-code CỐ ĐỊNH (raw cho trước) để test đăng nhập local.
 * KHÔNG dùng ở production. Lưu HASH như mọi code khác; thu hồi code cũ chưa dùng của user.
 */
export async function issueFixedAccessCodeForDev(
  studentId: string,
  rawCode: string,
  opts?: { ttlMs?: number },
): Promise<IssueResult> {
  if (!studentId) throw new Error("[access-code] studentId bắt buộc.");
  // DEV: chấp nhận code cho trước; lưu hash của dạng đã chuẩn hóa (verify dùng cùng normalizeCode → khớp).
  const normalized = normalizeCode(rawCode);
  if (normalized.replace(/-/g, "").length < 6) {
    throw new Error(`[access-code] DEV code quá ngắn. Nhận: ${rawCode}`);
  }
  const lmsUserId = await ensureCredentialsUser(studentId);
  const now = Date.now();
  await lmsDb
    .update(accessCode)
    .set({ usedAt: now })
    .where(and(eq(accessCode.lmsUserId, lmsUserId), isNull(accessCode.usedAt)));

  const expiresAt = now + (opts?.ttlMs ?? DEFAULT_TTL_MS);
  const id = genId();
  await lmsDb.insert(accessCode).values({
    id,
    lmsUserId,
    codeHash: hashCode(normalized),
    createdAt: now,
    expiresAt,
    usedAt: null,
    attemptCount: 0,
    lockedUntil: null,
  });
  return { code: normalized, lmsUserId, accessCodeId: id, expiresAt };
}

/** So hash hằng-thời-gian. */
function constEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

export interface VerifyResult {
  studentId: string;
  lmsUserId: string;
  isMinor: boolean;
}

/**
 * Verify access-code. Trả {studentId, lmsUserId, isMinor} nếu hợp lệ, ngược lại `null`.
 * Quy tắc bảo mật:
 *  - lookup deterministic theo codeHash (1 query, KHÔNG quét giải mã).
 *  - kiểm lockedUntil (còn khóa → từ chối), expiresAt (hết hạn → từ chối), usedAt KHÔNG chặn
 *    (code dùng nhiều phiên trong P5a; one-time là tùy chọn go-live), lms_user.status.
 *  - sai → attemptCount++; vượt MAX_ATTEMPTS → đặt lockedUntil = now + LOCK_MS.
 *  - KHÔNG phân biệt "không tồn tại" vs "sai" cho caller (chống enumeration): luôn trả null.
 */
export async function verifyAccessCode(rawInput: string): Promise<VerifyResult | null> {
  const now = Date.now();

  // Chặn brute-force toàn cục (local): quá nhiều lần sai gần đây → từ chối ngay.
  if (isGloballyThrottled(now)) return null;

  const normalized = normalizeCode(rawInput);
  if (normalized.length === 0) {
    recordGlobalFail(now);
    return null;
  }

  const hash = hashCode(normalized);

  const row = (
    await lmsDb.select().from(accessCode).where(eq(accessCode.codeHash, hash)).limit(1)
  )[0];

  // Không tìm thấy code khớp hash → null (không tiết lộ). Đếm fail toàn cục.
  if (!row) {
    recordGlobalFail(now);
    return null;
  }

  // Đối chiếu hằng-thời-gian (phòng so sánh không an toàn) — phải khớp tuyệt đối.
  if (!constEqual(row.codeHash, hash)) {
    recordGlobalFail(now);
    return null;
  }

  // Code này đang bị khóa do nhập sai nhiều (per-code) → từ chối.
  if (row.lockedUntil && row.lockedUntil > now) {
    recordGlobalFail(now);
    return null;
  }

  // Hết hạn → từ chối.
  if (row.expiresAt && row.expiresAt < now) {
    recordGlobalFail(now);
    return null;
  }

  // Resolve lms_user → studentId + trạng thái.
  const user = (
    await lmsDb
      .select({
        studentId: lmsUser.studentId,
        isMinor: lmsUser.isMinor,
        status: lmsUser.status,
      })
      .from(lmsUser)
      .where(eq(lmsUser.id, row.lmsUserId))
      .limit(1)
  )[0];

  if (!user || user.status !== "active") {
    recordGlobalFail(now);
    return null;
  }

  // Thành công: reset đếm sai per-code + khóa, cập nhật usedAt (vết "đã dùng gần nhất").
  pruneFails(now); // dọn cửa sổ; KHÔNG xóa hết (lần sai của người khác vẫn còn hiệu lực)
  await lmsDb
    .update(accessCode)
    .set({ attemptCount: 0, lockedUntil: null, usedAt: now })
    .where(eq(accessCode.id, row.id));

  return {
    studentId: user.studentId,
    lmsUserId: row.lmsUserId,
    isMinor: user.isMinor === 1,
  };
}

export const ACCESS_CODE_POLICY = { MAX_ATTEMPTS, LOCK_MS, DEFAULT_TTL_MS, WINDOW_MS } as const;
