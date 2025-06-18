import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Prevent server‑only modules (like fs) from being bundled into client code
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },

  // Replace the old experimental key with the new one:
  serverExternalPackages: [
  ],
};

export default nextConfig;

