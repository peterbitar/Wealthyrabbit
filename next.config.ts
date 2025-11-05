import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Disable ESLint during build due to config conflicts with ESLint 9
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
