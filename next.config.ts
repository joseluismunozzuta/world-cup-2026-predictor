import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.watchOptions = { ...config.watchOptions, ignored: /functions/ };
    return config;
  },
};

export default nextConfig;
