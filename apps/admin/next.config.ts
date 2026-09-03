import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for the production Docker image: bundles a minimal, self-contained
  // server into .next/standalone instead of needing the full node_modules tree.
  output: "standalone",
};

export default nextConfig;
