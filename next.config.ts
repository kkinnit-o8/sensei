import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // pinyin-pro ships a large dictionary; load it from node_modules instead of bundling it.
  serverExternalPackages: ["pinyin-pro"],
  // Let a phone on the same Wi-Fi use the dev server (npm run dev:lan).
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "*.local"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
