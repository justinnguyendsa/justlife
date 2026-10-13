import { describe, expect, it } from "vitest";
import { LINK_INTENT_TTL_MS, signIntent, verifyIntent } from "@/lib/lms/link-intent";

// SPEC-SEC-1.2 S05 — phiếu liên kết Gmail có chữ ký, có hạn.
const SECRET = "test-secret-khong-dung-that";
const T0 = 1_000_000;

describe("phiếu liên kết Gmail", () => {
  it("phiếu đúng trả về studentId", () => {
    const t = signIntent("stu123", T0, SECRET);
    expect(verifyIntent(t, T0 + 1000, SECRET)).toBe("stu123");
  });

  it("hết hạn thì từ chối", () => {
    const t = signIntent("stu123", T0, SECRET);
    expect(verifyIntent(t, T0 + LINK_INTENT_TTL_MS, SECRET)).toBeNull();
  });

  it("sửa studentId hoặc hạn thì sai chữ ký", () => {
    const t = signIntent("stu123", T0, SECRET);
    const [v, , exp, sig] = t.split(".");
    expect(verifyIntent(`${v}.stu999.${exp}.${sig}`, T0, SECRET)).toBeNull();
    expect(verifyIntent(`${v}.stu123.${Number(exp) + 99999}.${sig}`, T0, SECRET)).toBeNull();
  });

  it("khác secret, hỏng định dạng, rỗng đều từ chối", () => {
    const t = signIntent("stu123", T0, SECRET);
    expect(verifyIntent(t, T0, "secret-khac")).toBeNull();
    expect(verifyIntent("v1.stu123", T0, SECRET)).toBeNull();
    expect(verifyIntent("v2.stu123.9999999999.abc", T0, SECRET)).toBeNull();
    expect(verifyIntent("", T0, SECRET)).toBeNull();
    expect(verifyIntent(null, T0, SECRET)).toBeNull();
    expect(verifyIntent(t, T0, "")).toBeNull();
  });

  it("không ký studentId rỗng hoặc có dấu chấm", () => {
    expect(() => signIntent("", T0, SECRET)).toThrow();
    expect(() => signIntent("a.b", T0, SECRET)).toThrow();
  });
});
