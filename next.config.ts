import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* Add empty turbopack config to allow webpack plugins */
  turbopack: {},
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Enable compression (Next.js handles this automatically in production)
  compress: true,
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // SWC minification is enabled by default in Next.js 16
  // Font optimization is handled automatically
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default pwaConfig(nextConfig);
