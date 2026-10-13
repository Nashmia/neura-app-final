import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // Keep the native MongoDB driver out of the bundle; load it at runtime on the server.
  serverExternalPackages: ["mongodb"],
  // `next dev` refuses to serve its scripts to any origin other than localhost
  // unless it is listed here. Without this, opening the dev server through the
  // machine's network IP (e.g. from a phone or another laptop) gives pages that
  // render but never become interactive. Dev-only; has no effect in production.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*", "*.local"],
};

export default nextConfig;
