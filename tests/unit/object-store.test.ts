import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { promises as fs } from "fs";
import path from "path";

/**
 * P0-T04 — test cho kho object.
 *
 * Trọng tâm KHÔNG phải "ghi/đọc có chạy không" mà là **fail-fast**: nếu production thiếu
 * cấu hình R2 mà code âm thầm rơi về đĩa thì bài nộp của học viên sẽ mất sau mỗi lần deploy
 * — mất im lặng, không ai biết. Đó là thứ phải có test.
 */

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"];

function clearEnv() {
  for (const v of [...R2_VARS, "R2_LMS_BUCKET"]) delete process.env[v];
}

// storeKind() đọc process.env mỗi lần gọi, nhưng client R2 được cache trong module
// → reset registry để mỗi test có trạng thái sạch.
async function freshStore() {
  vi.resetModules();
  return import("@/lib/object-store");
}

describe("object-store — chọn backend", () => {
  beforeEach(clearEnv);
  afterEach(() => {
    clearEnv();
    vi.unstubAllEnvs();
  });

  it("không có biến R2 nào + không phải production → dùng đĩa local", async () => {
    vi.stubEnv("NODE_ENV", "test");
    const { storeKind } = await freshStore();
    expect(storeKind()).toBe("local");
  });

  it("đủ 4 biến R2 → dùng r2", async () => {
    for (const v of R2_VARS) process.env[v] = "x";
    const { storeKind } = await freshStore();
    expect(storeKind()).toBe("r2");
  });

  it("khai NỬA VỜI (thiếu 1 biến) → ném lỗi, KHÔNG âm thầm về đĩa", async () => {
    process.env.R2_ACCOUNT_ID = "x";
    process.env.R2_ACCESS_KEY_ID = "x";
    process.env.R2_SECRET_ACCESS_KEY = "x";
    // thiếu R2_BUCKET
    const { storeKind } = await freshStore();
    expect(() => storeKind()).toThrowError(/R2_BUCKET/);
  });

  it("production mà KHÔNG có biến R2 nào → ném lỗi (chống mất file trên Vercel)", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { storeKind } = await freshStore();
    expect(() => storeKind()).toThrowError(/object storage/i);
  });
});

describe("object-store — backend đĩa local", () => {
  const key = "lms/submissions/deadbeefdeadbeef";
  const dest = path.resolve(process.cwd(), "data", key);

  beforeEach(clearEnv);
  afterEach(async () => {
    clearEnv();
    await fs.rm(dest, { force: true });
  });

  it("ghi rồi đọc lại đúng nội dung", async () => {
    const { putObject, getObject } = await freshStore();
    await putObject(key, Buffer.from("xin chào"));
    expect((await getObject(key)).toString()).toBe("xin chào");
  });

  it("xoá object không tồn tại thì im lặng, không ném", async () => {
    const { deleteObject } = await freshStore();
    await expect(deleteObject("lms/submissions/khongcothat")).resolves.toBeUndefined();
  });

  it("chặn trèo ra ngoài thư mục data/", async () => {
    const { getObject } = await freshStore();
    await expect(getObject("../../../etc/passwd")).rejects.toThrowError(/invalid key/);
  });
});

describe("lms/storage — ref phải là hex", () => {
  beforeEach(clearEnv);
  afterEach(clearEnv);

  it("từ chối ref chứa ../", async () => {
    const { writeSubmission } = await import("@/lib/lms/storage");
    await expect(writeSubmission("../../evil", Buffer.from("x"))).rejects.toThrowError(
      /invalid ref/,
    );
  });

  it("từ chối ref quá ngắn", async () => {
    const { readSubmission } = await import("@/lib/lms/storage");
    await expect(readSubmission("abc")).rejects.toThrowError(/invalid ref/);
  });

  it("genFileRef sinh 32 ký tự hex (128-bit)", async () => {
    const { genFileRef } = await import("@/lib/lms/storage");
    expect(genFileRef()).toMatch(/^[0-9a-f]{32}$/);
  });
});
