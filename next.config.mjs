/** @type {import('next').NextConfig} */
const nextConfig = {
  // libSQL client is server-only; keep it out of the client bundle
  serverExternalPackages: ["@libsql/client"],
  // ESLint không cài trong dự án; type-safety đảm bảo qua tsc --noEmit (xanh).
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
