import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

// ADR-005 3a §7.8 — kiểm tĩnh: trang / route / server action nào cũng có "người gác cửa" phía server.
// Middleware là lớp ngoài; lớp này đảm bảo khi đổi middleware → proxy (Next 16) hay matcher bỏ sót
// đường dẫn (vd. kết thúc bằng ".png") thì dữ liệu vẫn không lộ. Thêm trang mới mà quên guard → test đỏ.
//
// 🗣️ Bình dân: đi một vòng kiểm xem phòng nào cũng có khoá cửa riêng, không chỉ dựa vào cổng chính.

const ROOT = join(__dirname, "..", "..");
const SRC = join(ROOT, "src");

function walk(dir: string, match: (file: string) => boolean): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, match));
    else if (match(p)) out.push(p);
  }
  return out;
}

const rel = (p: string) => relative(ROOT, p).split(sep).join("/");
const read = (p: string) => readFileSync(p, "utf8");
const isFile = (name: string) => (p: string) => p.endsWith(sep + name);

function missing(files: string[], needles: string[], allow: Record<string, string> = {}) {
  return files.map(rel).filter((f) => !(f in allow) && !needles.some((n) => read(join(ROOT, f)).includes(n)));
}

describe("guard phía server cho mọi lối vào", () => {
  it("mọi trang khu cá nhân gọi requireOwner()", () => {
    const pages = [
      ...walk(join(SRC, "app", "(app)"), isFile("page.tsx")),
      ...walk(join(SRC, "app", "(focus)"), isFile("page.tsx")),
    ];
    expect(pages.length).toBeGreaterThan(10);
    expect(missing(pages, ["requireOwner("])).toEqual([]);
  });

  it("mọi trang học viên lấy studentId qua getSessionStudentId()", () => {
    const pages = walk(join(SRC, "app", "portal", "(student)"), isFile("page.tsx"));
    expect(pages.length).toBeGreaterThan(3);
    expect(missing(pages, ["getSessionStudentId("])).toEqual([]);
  });

  it("API của chủ (personal, teaching, library) gọi denyIfNotOwner()", () => {
    const routes = ["personal", "teaching", "library"].flatMap((d) => walk(join(SRC, "app", "api", d), isFile("route.ts")));
    expect(routes.length).toBeGreaterThan(5);
    expect(
      missing(routes, ["denyIfNotOwner("], {
        // Phục vụ file cho LINK CHIA SẺ công khai (ALWAYS_PUBLIC) — tự kiểm share id/hạn bên trong.
        "src/app/api/library/file/[id]/route.ts": "link chia sẻ công khai",
      }),
    ).toEqual([]);
  });

  it("API học viên (lms) gọi getSessionStudentId()", () => {
    const routes = walk(join(SRC, "app", "api", "lms"), isFile("route.ts"));
    expect(routes.length).toBeGreaterThan(3);
    expect(missing(routes, ["getSessionStudentId("])).toEqual([]);
  });

  it("mọi file server action có guard (trừ đăng nhập / đăng xuất)", () => {
    const actions = walk(join(SRC, "app"), (p) => /\.(ts|tsx)$/.test(p)).filter((p) => /^["']use server["'];?/m.test(read(p)));
    expect(actions.length).toBeGreaterThan(5);
    expect(
      missing(actions, ["requireOwner(", "getSessionStudentId(", "denyIfNotOwner("], {
        "src/app/login/actions.ts": "đăng nhập chủ — công khai theo định nghĩa",
        "src/app/login/signout-action.ts": "đăng xuất",
        "src/app/portal/login/actions.ts": "đăng nhập học viên — công khai theo định nghĩa",
      }),
    ).toEqual([]);
  });
});
