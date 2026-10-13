// Bộ chặn đoán mã theo khoá (SPEC-SEC-1.2 S02). Hàm thuần, nhận `now` để test được.
// Mỗi khoá (thường là IP) có ngưỡng riêng → một người nhập sai không khoá cả lớp; thêm một ngưỡng
// chung rất cao để chặn tấn công dồn dập từ nhiều nơi. Bộ nhớ có giới hạn số khoá và tự dọn.
//
// Lưu ý: nằm trong bộ nhớ từng instance (serverless có nhiều instance) — store bền để giai đoạn 3.

export type FailThrottle = {
  isBlocked(key: string, now: number): boolean;
  recordFail(key: string, now: number): void;
};

export function createFailThrottle({
  windowMs,
  perKeyMax,
  globalMax,
  maxKeys = 5_000,
}: {
  windowMs: number;
  perKeyMax: number;
  globalMax: number;
  maxKeys?: number;
}): FailThrottle {
  const perKey = new Map<string, number[]>();
  const global: number[] = [];

  const prune = (hits: number[], now: number) => {
    while (hits.length && hits[0] <= now - windowMs) hits.shift();
  };

  return {
    isBlocked(key, now) {
      prune(global, now);
      if (global.length >= globalMax) return true;
      const hits = perKey.get(key);
      if (!hits) return false;
      prune(hits, now);
      if (hits.length === 0) {
        perKey.delete(key);
        return false;
      }
      return hits.length >= perKeyMax;
    },
    recordFail(key, now) {
      prune(global, now);
      global.push(now);
      let hits = perKey.get(key);
      if (!hits) {
        // Giữ bộ nhớ có giới hạn: quá nhiều khoá thì bỏ khoá cũ nhất (Map giữ thứ tự chèn).
        if (perKey.size >= maxKeys) {
          const oldest = perKey.keys().next().value;
          if (oldest !== undefined) perKey.delete(oldest);
        }
        hits = [];
        perKey.set(key, hits);
      }
      prune(hits, now);
      hits.push(now);
    },
  };
}
