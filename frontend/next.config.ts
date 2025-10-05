import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow external connections in Docker
  serverExternalPackages: [],
  // Ensure proper hostname binding for Docker
  experimental: {}
};

export default nextConfig;
