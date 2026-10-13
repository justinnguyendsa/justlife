import { createHmac } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";
import type { Client } from "@libsql/client";
import { createFailThrottle } from "@/lib/lms/fail-throttle";

// Bộ chặn đoán mã LƯU BỀN (ADR-005 3e). Đếm theo cửa sổ cố định trong bảng `auth_throttle` của lms.db,
// dùng chung cho mọi instance serverless (bộ đếm trong bộ nhớ chỉ chặn được trong một instance).
//  - Khoá lưu = HMAC(khoá con từ AUTH_SECRET, IP) → không lưu IP thô (R-JL-PRIVACY-01). Không có secret
//    thì KHÔNG ghi DB (sha256 trần của IPv4 dò ngược được trong vài phút) → chỉ đếm trong bộ nhớ.
//  - IPv6 gộp theo /64 (một máy thường có cả dải /64 → đổi địa chỉ không né được bộ đếm).
//  - NGUYÊN TỬ: mỗi lượt cộng trước bằng upsert … RETURNING rồi mới quyết định chặn → bắn song song
//    cũng không vượt được ngưỡng (M1 của SEC-1.2). Khoá đã vượt ngưỡng thì không cộng nữa (đỡ tốn ghi).
//  - Trần chung KHÔNG khoá cả hệ thống: khi bị dồn dập, chỉ chặn nơi đã thử > `floodKeyMax` lượt —
//    học viên gõ đúng ngay lần đầu vẫn vào được (audit 3e M1). Một khoá chỉ góp ≤ `perKeyMax` vào trần.
//  - Bảng chưa có (chưa chạy migration) hoặc DB lỗi → tự rơi về bộ đếm trong bộ nhớ, không chặn nhầm ai.
//  - Hàng cũ (> 2 cửa sổ) bị dọn ở lượt thử kế tiếp; bảng chỉ chứa khoá đã băm + số đếm.
//
// 🗣️ Bình dân: sổ ghi "máy này nhập sai mấy lần" để mọi máy chủ cùng nhìn chung một cuốn.

export type LoginAttempt = {
  blocked: boolean;
  /** Trả lại lượt này khi nó hoá ra đúng mã — cùng cửa sổ, cùng nơi lưu với lúc tính. */
  refund(): Promise<void>;
};

export type LoginThrottle = {
  /** Tính một lượt thử cho `key` (TRƯỚC khi tra mã); `blocked: true` nếu lượt này vượt ngưỡng. */
  attempt(key: string, now: number): Promise<LoginAttempt>;
};

const GLOBAL_KEY = "__global__"; // khoá thật luôn là 64 ký tự hex → không thể trùng

/** Gộp địa chỉ về "nơi truy cập": IPv4 giữ nguyên, IPv4-mapped về IPv4, IPv6 về dải /64. */
export function throttleBucket(ip: string): string {
  const v = ip.trim().toLowerCase();
  if (!isIPv6(v)) return v;
  if (v.startsWith("::ffff:") && isIPv4(v.slice(7))) return v.slice(7);
  const hexMapped = v.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/); // ::ffff:c000:201 = 192.0.2.1
  if (hexMapped) {
    const [a, b] = [parseInt(hexMapped[1], 16), parseInt(hexMapped[2], 16)];
    return `${a >> 8}.${a & 255}.${b >> 8}.${b & 255}`;
  }
  const [head, tail] = v.includes("::") ? v.split("::") : [v, undefined];
  const h = head ? head.split(":") : [];
  const t = tail ? tail.split(":") : [];
  const groups = (parts: string[]) => parts.reduce((n, p) => n + (p.includes(".") ? 2 : 1), 0);
  const full = tail === undefined ? h : [...h, ...Array<string>(8 - groups(h) - groups(t)).fill("0"), ...t];
  return `${full.slice(0, 4).map((g) => parseInt(g, 16).toString(16)).join(":")}::/64`;
}

/** Khoá lưu = HMAC(khoá con "jl-throttle" suy từ secret, nơi truy cập). Bắt buộc có secret. */
export function hashThrottleKey(key: string, secret: string): string {
  if (!secret) throw new Error("[login-throttle] thiếu secret.");
  const sub = createHmac("sha256", secret).update("jl-throttle").digest();
  return createHmac("sha256", sub).update(throttleBucket(key)).digest("hex");
}

export function createLoginThrottle(opts: {
  client: Client | null;
  windowMs: number;
  perKeyMax: number;
  globalMax: number;
  /** Khi trần chung bị vượt: nơi đã thử > số này trong cửa sổ mới bị chặn. */
  floodKeyMax: number;
  secret: string;
  onFallback?: (e: unknown) => void;
}): LoginThrottle {
  const { windowMs, perKeyMax, globalMax, floodKeyMax, secret } = opts;
  // Không có secret → không ghi DB (khoá băm trần dò ngược ra IP được).
  const client = secret ? opts.client : null;
  const memory = createFailThrottle({ windowMs, perKeyMax, globalMax });
  let warned = false;
  const fallback = (e: unknown) => {
    if (!warned) {
      warned = true;
      opts.onFallback?.(e);
    }
  };
  if (opts.client && !secret) fallback(new Error("thiếu AUTH_SECRET — không ghi bảng auth_throttle"));

  const noop = async () => {};
  const memAttempt = (bucket: string, now: number): LoginAttempt => {
    if (memory.isBlocked(bucket, now)) return { blocked: true, refund: noop };
    memory.recordFail(bucket, now);
    return { blocked: false, refund: async () => memory.refund(bucket) };
  };

  return {
    async attempt(key, now) {
      const bucket = throttleBucket(key);
      if (!client) return memAttempt(bucket, now);
      const win = Math.floor(now / windowMs) * windowMs;
      const k = hashThrottleKey(bucket, secret);
      // Chỉ cộng khi còn trong ngưỡng (count tối đa = max + 1) → nơi đã bị chặn không tốn thêm lượt ghi.
      const bump = (keyHash: string, max: number) =>
        client.execute({
          sql: `INSERT INTO auth_throttle (key_hash, window_start, count) VALUES (?, ?, 1)
                ON CONFLICT(key_hash, window_start) DO UPDATE SET count = count + 1 WHERE count <= ? RETURNING count`,
          args: [keyHash, win, max],
        });
      const decrement = (keyHash: string) =>
        client.execute({
          sql: "UPDATE auth_throttle SET count = MAX(count - 1, 0) WHERE key_hash = ? AND window_start = ?",
          args: [keyHash, win],
        });

      let keyCount: number;
      try {
        const row = (await bump(k, perKeyMax)).rows[0];
        if (!row) return { blocked: true, refund: noop }; // đã vượt ngưỡng từ trước trong cửa sổ này
        keyCount = Number(row.count);
      } catch (e) {
        fallback(e);
        return memAttempt(bucket, now);
      }
      if (keyCount > perKeyMax) return { blocked: true, refund: noop };

      // Trần chung: lỗi ở bước này không bỏ quyết định theo khoá đã có (audit 3e L2).
      let countedGlobal = false;
      let flood = false;
      try {
        const g = (await bump(GLOBAL_KEY, globalMax)).rows[0];
        countedGlobal = Boolean(g);
        flood = !g || Number(g.count) > globalMax;
      } catch (e) {
        fallback(e);
      }

      if (keyCount === 1) {
        // Lượt đầu của khoá trong cửa sổ → dọn các cửa sổ cũ (giữ ≤ 2 cửa sổ). Lỗi dọn không ảnh hưởng quyết định.
        try {
          await client.execute({ sql: "DELETE FROM auth_throttle WHERE window_start < ?", args: [win - windowMs] });
        } catch (e) {
          fallback(e);
        }
      }

      return {
        blocked: flood && keyCount > floodKeyMax,
        refund: async () => {
          try {
            await decrement(k);
            if (countedGlobal) await decrement(GLOBAL_KEY);
          } catch (e) {
            fallback(e);
          }
        },
      };
    },
  };
}
