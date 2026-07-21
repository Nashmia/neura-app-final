import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Keep the native MongoDB driver out of the bundle; load it at runtime on the server.
  serverExternalPackages: ["mongodb"],
};

export default nextConfig;
