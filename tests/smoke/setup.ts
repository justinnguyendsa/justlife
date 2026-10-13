import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { TestProject } from "vitest/node";

// ADR-005 3a §7.9 — smoke HTTP trên `next start` (bản build production thật).
// DB file tạm + biến môi trường GIẢ: không đọc, không đụng dữ liệu thật. Mọi khoá mà `.env` có đều
// được đặt tường minh ở đây (Next không ghi đè biến đã có) → `next start` không dùng giá trị thật.
//
// 🗣️ Bình dân: dựng một bản app "giả" chạy y như thật trên máy, rồi gõ cửa từng phòng xem khoá đúng không.

const ROOT = join(__dirname, "..", "..");
const TSX = join(ROOT, "node_modules", "tsx", "dist", "cli.mjs");
const NEXT = join(ROOT, "node_modules", "next", "dist", "bin", "next");
const PORT = 3100;
const PORT_MISCONFIGURED = 3101;
export const SMOKE_OWNER = "owner@example.test";

const servers: ChildProcess[] = [];
let dir = "";

async function waitFor(url: string, ms = 90_000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const r = await fetch(url, { redirect: "manual" });
      if (r.status < 500) return;
    } catch {
      /* chưa lên */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`[smoke] ${url} không lên sau ${ms} ms`);
}

function startServer(port: number, env: NodeJS.ProcessEnv) {
  const p = spawn(process.execPath, [NEXT, "start", "-p", String(port)], { cwd: ROOT, env, stdio: ["ignore", "ignore", "pipe"] });
  p.stderr?.on("data", (d: Buffer) => {
    const line = d.toString();
    if (/error/i.test(line) && !/CredentialsSignin|JWTSessionError/.test(line)) process.stderr.write(`[smoke:${port}] ${line}`);
  });
  servers.push(p);
}

export default async function setup(project: TestProject) {
  if (!existsSync(join(ROOT, ".next", "BUILD_ID"))) {
    throw new Error("[smoke] Chưa có bản build. Chạy `npm run test:smoke` (tự `next build` trước).");
  }
  dir = mkdtempSync(join(tmpdir(), "jl-smoke-"));
  const fileUrl = (name: string) => "file:" + join(dir, name).replace(/\\/g, "/");
  const secret = randomBytes(32).toString("hex");

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: fileUrl("personal.db"),
    DATABASE_AUTH_TOKEN: "",
    LMS_DATABASE_URL: fileUrl("lms.db"),
    LMS_DATABASE_AUTH_TOKEN: "",
    LMS_ENCRYPTION_KEY: randomBytes(32).toString("hex"),
    LMS_INDEX_KEY: randomBytes(32).toString("hex"),
    AUTH_SECRET: secret,
    AUTH_GOOGLE_ID: "smoke-google-id",
    AUTH_GOOGLE_SECRET: "smoke-google-secret",
    OWNER_EMAIL: SMOKE_OWNER,
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET: "",
    R2_LMS_BUCKET: "",
  };

  const run = (script: string) => execFileSync(process.execPath, [TSX, script], { cwd: ROOT, env, encoding: "utf8" });
  run("src/db/migrate.ts");
  run("src/db/lms/migrate.ts");
  const { code } = JSON.parse(run("tests/smoke/issue-code.ts").trim().split("\n").pop()!) as { code: string };

  startServer(PORT, env);
  startServer(PORT_MISCONFIGURED, { ...env, OWNER_EMAIL: "" }); // production thiếu cấu hình → fail-closed
  await Promise.all([waitFor(`http://localhost:${PORT}/login`), waitFor(`http://localhost:${PORT_MISCONFIGURED}/login`)]);

  project.provide("smokeBase", `http://localhost:${PORT}`);
  project.provide("smokeMisconfigured", `http://localhost:${PORT_MISCONFIGURED}`);
  project.provide("smokeCode", code);
  project.provide("smokeSecret", secret);
  project.provide("smokeLmsDb", env.LMS_DATABASE_URL!);

  return () => {
    for (const s of servers) s.kill();
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* Windows có thể còn giữ file DB — thư mục tạm, bỏ qua */
    }
  };
}

declare module "vitest" {
  export interface ProvidedContext {
    smokeBase: string;
    smokeMisconfigured: string;
    smokeCode: string;
    smokeSecret: string;
    smokeLmsDb: string;
  }
}
