/**
 * P0-T05 — Phát hiện LỆCH SCHEMA giữa code và database thật.
 *
 * Vì sao cần: `tc_thread`, `tc_post`, `class_enrol_code` đã được khai trong schema.ts và
 * được code gọi, nhưng KHÔNG tồn tại trong lms.db — migration dừng giữa chừng mà không ai
 * biết, vì migrate.ts bắt lỗi bằng cách so chuỗi thay vì kiểm tra thật. Mọi thao tác forum
 * và mã tự ghi danh crash runtime.
 *
 * Chạy:  npx tsx src/db/lms/check-drift.ts
 * Thoát mã 1 nếu lệch → dùng được làm gate trước khi deploy.
 *
 * 🗣️ Bình dân: đối chiếu "bản vẽ" (code) với "nhà đã xây" (database) xem có thiếu phòng nào không.
 */
import { lmsLibsql } from "./client";
import * as schema from "./schema";

type SqliteTable = { [k: string]: unknown };

/** Lấy tên bảng SQL từ mỗi export dạng sqliteTable trong schema.ts. */
function declaredTables(): string[] {
  const names = new Set<string>();
  for (const value of Object.values(schema as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    // Drizzle gắn tên bảng vào một symbol nội bộ; tìm theo mô tả symbol để không phụ thuộc bản build.
    const sym = Object.getOwnPropertySymbols(value as SqliteTable).find((s) =>
      String(s).includes("Name"),
    );
    if (!sym) continue;
    const name = (value as Record<symbol, unknown>)[sym];
    if (typeof name === "string") names.add(name);
  }
  return [...names].sort();
}

/**
 * In RÕ đang kiểm DB nào. Script KHÔNG tự nạp .env, nên `npm run db:lms:check` trần sẽ trỏ
 * vào file local — chạy xong thấy "Không lệch" mà tưởng Turso đã ổn là hiểu sai nguy hiểm.
 * Token trong URL được che để không in secret ra màn hình/log.
 */
function targetLabel(): string {
  const raw = process.env.LMS_DATABASE_URL || "file:lms.db";
  const isRemote = raw.startsWith("libsql:") || raw.startsWith("https:");
  const safe = raw.replace(/([?&](authToken|auth_token)=)[^&]+/gi, "$1***");
  return `${safe}   ${isRemote ? "<<< REMOTE (Turso) >>>" : "<<< FILE LOCAL tren may ban >>>"}`;
}

async function main() {
  console.log(`Dang kiem: ${targetLabel()}`);
  console.log("");
  const declared = declaredTables();
  const rs = await lmsLibsql.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );
  const actual = new Set(rs.rows.map((r) => String(r.name)));

  const missing = declared.filter((t) => !actual.has(t));
  const extra = [...actual].filter((t) => !declared.includes(t)).sort();

  console.log(`Bảng khai trong schema.ts : ${declared.length}`);
  console.log(`Bảng có thật trong DB     : ${actual.size}`);

  if (extra.length) {
    console.log(`\n⚠ Có trong DB nhưng không còn trong schema (${extra.length}):`);
    for (const t of extra) console.log(`   - ${t}`);
  }

  if (missing.length) {
    console.error(`\n❌ LỆCH SCHEMA — thiếu ${missing.length} bảng trong DB:`);
    for (const t of missing) console.error(`   - ${t}`);
    console.error(`\nChạy: npm run db:lms:migrate`);
    process.exit(1);
  }

  console.log("\n✓ Không lệch: mọi bảng khai trong schema đều có trong DB.");
}

main().catch((e) => {
  console.error("[check-drift] lỗi:", e);
  process.exit(1);
});
