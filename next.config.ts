import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — a stray package-lock.json further up the tree
  // otherwise makes Turbopack guess a parent directory.
  turbopack: { root: path.resolve(".") },
};

export default nextConfig;
