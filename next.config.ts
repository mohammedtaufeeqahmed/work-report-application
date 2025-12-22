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
  },
  // Enable compression (Next.js handles this automatically in production)
  compress: true,
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

export default pwaConfig(nextConfig);
