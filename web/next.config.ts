import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true
  },
  trailingSlash: true,
  experimental: {
    webpackBuildWorker: false,
    cpus: 1,
    workerThreads: false
  }
};

export default nextConfig;
