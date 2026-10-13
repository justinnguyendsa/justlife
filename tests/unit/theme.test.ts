import { describe, expect, it } from "vitest";
import { THEME_SCRIPT, isThemePref, resolveTheme } from "@/lib/theme";

// SPEC-UI-P2.5 F06.
describe("giao diện sáng / tối / theo máy", () => {
  it("Theo máy đi theo hệ điều hành; Sáng/Tối giữ nguyên", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("light", true)).toBe("light");
  });
  it("chỉ nhận 3 giá trị hợp lệ", () => {
    expect(isThemePref("system")).toBe(true);
    expect(isThemePref("blue")).toBe(false);
    expect(isThemePref(null)).toBe(false);
  });
  it("script chặn nháy màu là JS hợp lệ", () => {
    expect(() => new Function(THEME_SCRIPT)).not.toThrow();
  });
});
