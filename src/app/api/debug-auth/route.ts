import type { NextRequest } from "next/server";
import { auth } from "@/auth";
import { ownerAuthEnabledEnv } from "@/auth.config";

// ⚠️ TẠM THỜI — chỉ để chẩn đoán đăng nhập owner trên cloud. Sẽ XÓA sau khi xong.
// Bảo vệ bằng token cố định trong URL (không phải secret hệ thống). KHÔNG in giá trị secret thật —
// chỉ in độ dài / boolean / domain để soi cấu hình. (Owner-auth cho /api/debug-auth qua public.)
export const dynamic = "force-dynamic";

const DEBUG_TOKEN = "jl-dbg-7e02f205";

export async function GET(req: NextRequest) {
  if (req.nextUrl.searchParams.get("token") !== DEBUG_TOKEN) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  const ownerRaw = process.env.OWNER_EMAIL;
  const ownerTrim = ownerRaw?.toLowerCase().trim();

  let sessionRole: string | null = null;
  let sessionIsStudent: boolean | null = null;
  let authError: string | null = null;
  try {
    const s = await auth();
    sessionRole = (s?.role as string | undefined) ?? null;
    sessionIsStudent = s ? Boolean((s as { studentId?: string }).studentId) : null;
  } catch (e) {
    authError = e instanceof Error ? e.message : "unknown";
  }

  return Response.json({
    // --- Cấu hình owner-auth ---
    ownerAuthEnabled: ownerAuthEnabledEnv(),
    googleIdSet: Boolean(process.env.AUTH_GOOGLE_ID),
    googleSecretSet: Boolean(process.env.AUTH_GOOGLE_SECRET),
    // --- OWNER_EMAIL (soi xem có dính comment/space không) ---
    ownerEmailRawLen: ownerRaw?.length ?? 0, // email thật ~13; nếu lớn = dính rác
    ownerEmailTrimLen: ownerTrim?.length ?? 0,
    ownerEmailHasHash: ownerRaw?.includes("#") ?? false, // true = vẫn dính comment "#..."
    ownerEmailDomain: ownerTrim?.split("@")[1] ?? null, // vd "ghn.vn" / "gmail.com"
    // --- Secret / URL ---
    authSecretSet: Boolean(process.env.AUTH_SECRET),
    authSecretLen: process.env.AUTH_SECRET?.length ?? 0, // nên = 64
    authUrl: process.env.AUTH_URL ?? "(unset → dùng host thật, OK)",
    nodeEnv: process.env.NODE_ENV,
    // --- Phiên hiện tại (mở link NÀY ngay sau khi đăng nhập bị đá ra) ---
    sessionRole, // null = chưa có phiên | "guest" = email không khớp | "owner" = OK
    sessionIsStudent,
    authError,
    // Lần thử đăng nhập Google gần nhất (in-memory; mở link này NGAY sau khi bị đá ra).
    // match:false + attemptEmailDomain cho biết bạn đã bấm nhầm tài khoản nào.
    lastSignin: (globalThis as Record<string, unknown>).__jlLastSignin ?? null,
    // Đánh dấu bản deploy — xác nhận bạn đang chạy đúng bản mới nhất.
    buildMarker: "diag-v4-rolefix",
    // Cookie phiên có tới được server không? (chỉ TÊN cookie, không có giá trị/secret)
    cookieAuthRelated: req.cookies
      .getAll()
      .map((c) => c.name)
      .filter((n) => /authjs|session-token/i.test(n)),
    cookieSessionTokenPresent: req.cookies.getAll().some((c) => /session-token/i.test(c.name)),
    cookieTotalCount: req.cookies.getAll().length,
  });
}
