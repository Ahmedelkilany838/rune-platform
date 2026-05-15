import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  typedRoutes: true,
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
