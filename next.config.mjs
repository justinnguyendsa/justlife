/** @type {import('next').NextConfig} */
const nextConfig = {
  // libSQL client is server-only; keep it out of the client bundle
  serverExternalPackages: ["@libsql/client"],
};

export default nextConfig;
