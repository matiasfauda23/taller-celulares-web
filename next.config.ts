import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Playwright drives the dev server through 127.0.0.1 while Next binds dev-only resources
  // (HMR, RSC payloads) to the "localhost" origin it was started with; without this, those
  // cross-origin dev requests are silently blocked and client-side hydration never completes.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
