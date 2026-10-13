import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { describe, expect, it } from "vitest";

// ADR-005 3d — "bánh cóc" cho lớp CSS cũ (compat trong globals.css): số lần dùng tên class cũ trong src
// chỉ được GIẢM. Màn nào chuyển sang Tailwind + token thì hạ baseline (tests/compat-baseline.json).
// 🗣️ Bình dân: đồ cũ chỉ được bỏ bớt, không được dùng thêm.

const ROOT = join(__dirname, "..", "..");
const BASELINE = JSON.parse(readFileSync(join(ROOT, "tests", "compat-baseline.json"), "utf8")) as { total: number };

// Tên class của lớp compat còn lại (loại các tên trùng tiện ích Tailwind như flex/block/fixed/center).
export const LEGACY = new Set([
  "btn", "card", "chip", "field", "setrow", "secdot", "sec", "empty", "stack", "scrim", "sheet", "seg", "stepper",
  "search", "toast", "legend", "shell", "brand", "task", "row2", "fab", "pscore", "scorebox", "skel", "st",
  "prov-code", "prov-confirm", "prov-hint", "class-summary", "class-summary-item", "class-summary-l", "class-summary-n",
  "assign-stats", "assign-stats-bar", "assign-stats-bar-wrap", "assign-stats-label", "stu-prog", "stu-prog-n",
  "stu-prog-score", "app-skel-card", "app-skel-head", "app-skel-line", "app-skel-sec", "app-skel-stack", "app-skel-title",
]);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith(".tsx") ? [p] : [];
  });
}

export function countLegacy(): { total: number; byFile: Record<string, number> } {
  const byFile: Record<string, number> = {};
  let total = 0;
  for (const file of walk(join(ROOT, "src"))) {
    const text = readFileSync(file, "utf8");
    let n = 0;
    for (const m of text.matchAll(/"([^"\\\n]*)"|'([^'\\\n]*)'|`([^`\\]*)`/g)) {
      for (const tok of (m[1] ?? m[2] ?? m[3] ?? "").split(/\s+/)) if (LEGACY.has(tok)) n++;
    }
    if (n) byFile[file.slice(ROOT.length + 1).split(sep).join("/")] = n;
    total += n;
  }
  return { total, byFile };
}

describe("lớp CSS cũ chỉ được dùng ít đi", () => {
  it("số lần dùng tên class cũ không vượt baseline", () => {
    const { total, byFile } = countLegacy();
    if (total > BASELINE.total) console.error("Dùng tên class cũ theo file:", byFile);
    expect(total).toBeLessThanOrEqual(BASELINE.total);
  });
});
