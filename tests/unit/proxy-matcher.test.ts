import { describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

// next-auth không nạp được dưới vitest (ESM "next/server") — chỉ cần `config` của middleware thật.
vi.mock("next-auth", () => ({ default: () => ({ auth: () => undefined }) }));
const { config } = await import("@/middleware");

// ADR-005 3a §7.7 — matcher của middleware: đường dẫn nào đi qua cổng. Bước 3b (Next 16) đổi
// middleware → proxy và đổi tên hàm thành unstable_doesProxyMatch; bảng dưới phải giữ nguyên.
// 🗣️ Bình dân: kiểm "cổng chính" đứng chắn đúng những lối cần chắn.

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url });

describe("matcher của cổng", () => {
  it.each(["/", "/today", "/api/personal/tasks", "/portal", "/portal/login", "/api/auth/session", "/share/x", "/teaching/classes/abc", "/api/lms/submission"])(
    "đi qua cổng: %s",
    (url) => expect(matches(url)).toBe(true),
  );

  it.each(["/_next/static/a.js", "/_next/image", "/favicon.ico", "/icons/a.png", "/robots.txt", "/manifest.webmanifest"])(
    "tài nguyên tĩnh không qua cổng: %s",
    (url) => expect(matches(url)).toBe(false),
  );

  it("lỗ đã biết: đường dẫn trang kết thúc bằng đuôi file tĩnh không qua cổng → guard ở trang đỡ (route-guards.static)", () => {
    expect(matches("/teaching/classes/abc.png")).toBe(false);
  });
});
