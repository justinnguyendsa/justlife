import { issueAccessCode } from "@/lib/lms/access-code";

// Cấp 1 mã truy cập THẬT (định dạng XXXX-XXXX) cho học viên thử trong DB tạm của smoke.
// Chỉ chạy dưới tests/smoke/setup.ts với LMS_DATABASE_URL trỏ vào file tạm.
async function main() {
  if (!process.env.LMS_DATABASE_URL?.includes("jl-smoke-")) {
    throw new Error("[smoke] Từ chối chạy: LMS_DATABASE_URL không phải DB tạm của smoke.");
  }
  const issued = await issueAccessCode("smoke-student-1");
  console.log(JSON.stringify({ code: issued.code }));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
