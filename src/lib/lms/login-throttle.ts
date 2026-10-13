import { createHash, createHmac } from "node:crypto";
import type { Client } from "@libsql/client";
import { createFailThrottle } from "@/lib/lms/fail-throttle";

// Bộ chặn đoán mã LƯU BỀN (ADR-005 3e). Đếm theo cửa sổ cố định trong bảng `auth_throttle` của lms.db,
// dùng chung cho mọi instance serverless (bộ đếm trong bộ nhớ chỉ chặn được trong một instance).
//  - Khoá lưu = HMAC(IP) suy từ AUTH_SECRET → không lưu IP thô (R-JL-PRIVACY-01); dữ liệu sống ≤ 2 cửa sổ.
//  - NGUYÊN TỬ: mỗi lượt cộng trước bằng upsert … RETURNING rồi mới quyết định chặn → bắn song song
//    cũng không vượt được ngưỡng (M1 của SEC-1.2).
//  - Một khoá chỉ góp tối đa `perKeyMax` vào trần chung → một nơi không khoá được cả hệ thống.
//  - Bảng chưa có (chưa chạy migration) hoặc DB lỗi → tự rơi về bộ đếm trong bộ nhớ, không chặn nhầm ai.
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

const GLOBAL_KEY = "__global__";

export function hashThrottleKey(key: string, secret: string): string {
  return secret
    ? createHmac("sha256", secret).update(`jl-throttle:${key}`).digest("hex")
    : createHash("sha256").update(`jl-throttle:${key}`).digest("hex");
}

export function createLoginThrottle(opts: {
  client: Client | null;
  windowMs: number;
  perKeyMax: number;
  globalMax: number;
  secret: string;
  onFallback?: (e: unknown) => void;
}): LoginThrottle {
  const { client, windowMs, perKeyMax, globalMax, secret } = opts;
  const memory = createFailThrottle({ windowMs, perKeyMax, globalMax });
  let warned = false;
  const fallback = (e: unknown) => {
    if (!warned) {
      warned = true;
      opts.onFallback?.(e);
    }
  };

  const noop = async () => {};
  const memAttempt = (key: string, now: number): LoginAttempt => {
    if (memory.isBlocked(key, now)) return { blocked: true, refund: noop };
    memory.recordFail(key, now);
    return { blocked: false, refund: async () => memory.refund(key) };
  };

  return {
    async attempt(key, now) {
      if (!client) return memAttempt(key, now);
      const win = Math.floor(now / windowMs) * windowMs;
      const k = hashThrottleKey(key, secret);
      const upsert = (keyHash: string) =>
        client.execute({
          sql: `INSERT INTO auth_throttle (key_hash, window_start, count) VALUES (?, ?, 1)
                ON CONFLICT(key_hash, window_start) DO UPDATE SET count = count + 1 RETURNING count`,
          args: [keyHash, win],
        });
      const decrement = (keyHash: string) =>
        client.execute({
          sql: "UPDATE auth_throttle SET count = MAX(count - 1, 0) WHERE key_hash = ? AND window_start = ?",
          args: [keyHash, win],
        });
      try {
        const keyCount = Number((await upsert(k)).rows[0]?.count ?? 0);
        // Chỉ góp vào trần chung khi khoá còn trong ngưỡng riêng (một nơi không khoá được cả hệ thống).
        const countsGlobal = keyCount <= perKeyMax;
        const globalCount = countsGlobal
          ? Number((await upsert(GLOBAL_KEY)).rows[0]?.count ?? 0)
          : Number(
              (
                await client.execute({
                  sql: "SELECT count FROM auth_throttle WHERE key_hash = ? AND window_start = ?",
                  args: [GLOBAL_KEY, win],
                })
              ).rows[0]?.count ?? 0,
            );
        if (keyCount === 1) {
          // Lượt đầu của khoá trong cửa sổ → dọn các cửa sổ cũ (giữ ≤ 2 cửa sổ).
          await client.execute({ sql: "DELETE FROM auth_throttle WHERE window_start < ?", args: [win - windowMs] });
        }
        return {
          blocked: keyCount > perKeyMax || globalCount > globalMax,
          refund: async () => {
            try {
              await decrement(k);
              if (countsGlobal) await decrement(GLOBAL_KEY);
            } catch (e) {
              fallback(e);
            }
          },
        };
      } catch (e) {
        fallback(e);
        return memAttempt(key, now);
      }
    },
  };
}
