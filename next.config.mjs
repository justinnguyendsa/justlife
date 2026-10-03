/** @type {import('next').NextConfig} */
const nextConfig = {
  // libSQL client is server-only; keep it out of the client bundle
  serverExternalPackages: ["@libsql/client"],

  // P0-T09: ESLint ĐÃ được cài (comment cũ ghi "không cài trong dự án" là sai).
  // Chạy riêng bằng `npm run lint`. Tạm chưa chặn build vì còn 64 lỗi có sẵn
  // (23 biến thừa, 16 react-hooks, 13 react-refresh, 9 require-import, 3 khác).
  // P1 dọn xong thì đổi thành `ignoreDuringBuilds: false` để lint gác build.
  eslint: { ignoreDuringBuilds: true },

  // P0: header bảo mật tối thiểu (audit mục 19 — trước đây không có header nào).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Không rò shareId / mã chứng chỉ sang site ngoài qua Referer.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
