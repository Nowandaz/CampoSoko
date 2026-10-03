import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Lets you open the dev server from a phone on the same Wi-Fi (http://192.168.x.x:3000).
  // Without this Next.js blocks its client JS for that origin, so buttons and toggles do nothing.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  serverExternalPackages: ["@react-pdf/renderer"],
};

export default nextConfig;
