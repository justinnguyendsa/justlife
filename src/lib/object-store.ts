import { promises as fs } from "fs";
import path from "path";

/**
 * P0-T04 — Kho object dùng chung cho cả hai mặt (Personal library + LMS).
 *
 * Vì sao cần: trước đây mọi file ghi thẳng ra đĩa bằng `fs` vào `data/`. Vercel có đĩa
 * CHỈ ĐỌC và không giữ file giữa các lần chạy ⇒ nộp bài và tải tài liệu KHÔNG hoạt động
 * trên production, file mất sau mỗi lần deploy.
 *
 * Hai backend, chọn theo biến môi trường:
 *  - `r2`    : Cloudflare R2 (S3-compatible) — dùng khi có đủ 4 biến R2_*
 *  - `local` : đĩa local trong `data/` — mặc định ở máy, giữ nguyên DX cũ
 *
 * 🛡️ An toàn quan trọng: ở production mà R2 cấu hình THIẾU hoặc SAI thì **ném lỗi ngay lúc
 * khởi động**, KHÔNG âm thầm rơi về đĩa. Rơi về đĩa trên Vercel = ghi vào ổ chỉ-đọc (lỗi 500)
 * hoặc ghi vào /tmp rồi mất sạch — mất bài nộp của học viên mà không ai biết.
 *
 * 🗣️ Bình dân: trước đây app cất file vào "ngăn kéo" của máy chủ, mà máy chủ trên mạng thì
 *    không có ngăn kéo — cất xong là mất. Giờ cất vào kho thuê ngoài (R2). Nếu quên khai địa
 *    chỉ kho thì app báo lỗi ngay, chứ không cất tạm rồi làm mất đồ của học viên.
 */

export type ObjectStoreKind = "local" | "r2";

const R2_VARS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const;

function r2VarsPresent(): string[] {
  return R2_VARS.filter((v) => Boolean(process.env[v]));
}

/** Backend đang dùng. Ném lỗi nếu production mà cấu hình R2 thiếu/nửa vời. */
export function storeKind(): ObjectStoreKind {
  const present = r2VarsPresent();
  const isProd = process.env.NODE_ENV === "production";

  if (present.length === R2_VARS.length) return "r2";

  // Khai nửa vời — gần như chắc chắn là gõ thiếu, không phải cố ý dùng đĩa.
  if (present.length > 0) {
    const missing = R2_VARS.filter((v) => !process.env[v]);
    throw new Error(
      `[object-store] Cấu hình R2 thiếu biến: ${missing.join(", ")}. ` +
        `Khai đủ 4 biến hoặc bỏ hết để dùng đĩa local.`,
    );
  }

  if (isProd) {
    throw new Error(
      "[object-store] Production BẮT BUỘC dùng object storage — thiếu toàn bộ biến R2_*. " +
        "Đĩa của Vercel là chỉ-đọc và không giữ file giữa các lần chạy: nếu rơi về đĩa thì " +
        "bài nộp của học viên sẽ mất. Khai R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET.",
    );
  }

  return "local";
}

// ---------------------------------------------------------------- local (đĩa)

const LOCAL_ROOT = path.resolve(process.cwd(), "data");

/** Guard path-traversal: key đã chuẩn hoá vẫn phải nằm TRONG data/. */
function resolveLocal(key: string): string {
  const p = path.resolve(LOCAL_ROOT, key);
  if (p !== LOCAL_ROOT && !p.startsWith(LOCAL_ROOT + path.sep)) {
    throw new Error("invalid key");
  }
  return p;
}

// ------------------------------------------------------------------- r2 (S3)

type S3Like = {
  send: (cmd: unknown) => Promise<{ Body?: { transformToByteArray: () => Promise<Uint8Array> } }>;
};

let _client: S3Like | null = null;
let _cmds: Record<string, new (input: Record<string, unknown>) => unknown> | null = null;

async function r2() {
  if (!_client || !_cmds) {
    const s3 = await import("@aws-sdk/client-s3");
    _client = new s3.S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    }) as unknown as S3Like;
    _cmds = {
      Put: s3.PutObjectCommand as never,
      Get: s3.GetObjectCommand as never,
      Del: s3.DeleteObjectCommand as never,
    };
  }
  return { client: _client, cmds: _cmds };
}

/**
 * Bucket cho từng mặt. R-JL-TWO-FACES-01 muốn hai mặt tách nhau, nên hỗ trợ bucket RIÊNG
 * cho LMS qua `R2_LMS_BUCKET`. Không khai thì dùng chung bucket, phân tách bằng tiền tố key.
 */
function bucketFor(key: string): string {
  if (key.startsWith("lms/") && process.env.R2_LMS_BUCKET) return process.env.R2_LMS_BUCKET;
  return process.env.R2_BUCKET!;
}

// --------------------------------------------------------------------- API

/** Ghi một object. `key` dạng "library/abc" hoặc "lms/submissions/<ref>". */
export async function putObject(key: string, body: Buffer): Promise<void> {
  if (storeKind() === "local") {
    const dest = resolveLocal(key);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, body);
    return;
  }
  const { client, cmds } = await r2();
  await client.send(new cmds.Put({ Bucket: bucketFor(key), Key: key, Body: body }));
}

/** Đọc một object. Ném lỗi nếu không tồn tại (giữ đúng hành vi cũ của fs.readFile). */
export async function getObject(key: string): Promise<Buffer> {
  if (storeKind() === "local") {
    return fs.readFile(resolveLocal(key));
  }
  const { client, cmds } = await r2();
  const res = await client.send(new cmds.Get({ Bucket: bucketFor(key), Key: key }));
  if (!res.Body) throw new Error("object not found");
  return Buffer.from(await res.Body.transformToByteArray());
}

/** Xoá một object. Không tồn tại → bỏ qua, không ném (giống hành vi cũ). */
export async function deleteObject(key: string): Promise<void> {
  if (storeKind() === "local") {
    try {
      await fs.unlink(resolveLocal(key));
    } catch {
      /* đã xoá / không tồn tại */
    }
    return;
  }
  const { client, cmds } = await r2();
  try {
    await client.send(new cmds.Del({ Bucket: bucketFor(key), Key: key }));
  } catch {
    /* đã xoá / không tồn tại */
  }
}
