import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product photos are uploaded through Server Actions. Vercel caps request bodies at ~4.5 MB.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
