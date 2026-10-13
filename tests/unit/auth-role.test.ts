import { describe, expect, it } from "vitest";
import { resolveRole } from "@/lib/auth-role";

// SPEC-SEC-1.2 S09 — quyền chủ chỉ cho đúng email chủ.
describe("vai trò khi cấp phiên", () => {
  it("học viên luôn là student", () => {
    expect(resolveRole({ studentId: "s1", email: "owner@x.vn" }, "owner@x.vn", true)).toEqual({ role: "student", studentId: "s1" });
  });
  it("email trùng OWNER_EMAIL (không phân biệt hoa thường, khoảng trắng) là owner", () => {
    expect(resolveRole({ email: " Owner@X.vn " }, "owner@x.vn", true)).toEqual({ role: "owner" });
  });
  it("email khác, thiếu email, hoặc thiếu OWNER_EMAIL thì không có quyền", () => {
    expect(resolveRole({ email: "nguoila@gmail.com" }, "owner@x.vn", true)).toEqual({ role: null });
    expect(resolveRole({ email: null }, "owner@x.vn", true)).toEqual({ role: null });
    expect(resolveRole({ email: "owner@x.vn" }, "", true)).toEqual({ role: null });
    expect(resolveRole({ email: "" }, "", true)).toEqual({ role: null });
  });
  it("owner-auth tắt (máy local) giữ hành vi cũ", () => {
    expect(resolveRole({}, undefined, false)).toEqual({ role: "owner" });
  });
});
