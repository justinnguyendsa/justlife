// Bộ chặn đoán mã theo khoá (SPEC-SEC-1.2 S02). Hàm thuần, nhận `now` để test được.
// Mỗi khoá (thường là IP) có ngưỡng riêng → một người nhập sai không khoá cả lớp; thêm một ngưỡng
// chung rất cao để chặn tấn công dồn dập từ nhiều nơi. Bộ nhớ có giới hạn số khoá và tự dọn.
//
// Lưu ý: nằm trong bộ nhớ từng instance (serverless có nhiều instance) — store bền để giai đoạn 3.

export type FailThrottle = {
  isBlocked(key: string, now: number): boolean;
  /** Tính một lượt thử (gọi TRƯỚC khi truy vấn — chống bắn song song né bộ đếm). */
  recordFail(key: string, now: number): void;
  /** Trả lại lượt vừa tính khi lượt đó hoá ra đúng. */
  refund(key: string): void;
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
  const countedGlobal = new Map<string, number[]>(); // mốc của khoá này đã góp vào trần chung

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
      // Một khoá (một IP) chỉ góp tối đa perKeyMax lượt vào trần chung → một nơi không khoá được cả hệ thống.
      if (hits.length < perKeyMax) {
        global.push(now);
        const c = countedGlobal.get(key) ?? [];
        prune(c, now);
        c.push(now);
        countedGlobal.set(key, c);
        if (countedGlobal.size > maxKeys) {
          const oldest = countedGlobal.keys().next().value;
          if (oldest !== undefined) countedGlobal.delete(oldest);
        }
      }
      hits.push(now);
    },
    refund(key) {
      const hits = perKey.get(key);
      const t = hits?.pop();
      if (t === undefined) return;
      const c = countedGlobal.get(key);
      if (c && c[c.length - 1] === t) {
        c.pop();
        const i = global.lastIndexOf(t);
        if (i >= 0) global.splice(i, 1);
      }
    },
  };
}
