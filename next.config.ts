import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  // Note: webpack config removed to avoid conflicts with next-pwa
  // next-pwa will handle webpack modifications automatically
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    // Enable image optimization
    dangerouslyAllowSVG: false,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
  // Enable compression (Next.js handles this automatically in production)
  compress: true,
  // Optimize bundle size
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu'],
  },
  // Production optimizations
  poweredByHeader: false,
  reactStrictMode: true,
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  // SWC minification is enabled by default in Next.js 16
  // Font optimization is handled automatically by Next.js
};

// Configure PWA with proper exclusions for Next.js 16 standalone mode
// Note: next-pwa 5.6.0 has known compatibility issues with Next.js 16
// This configuration works around those issues
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development" || process.env.DISABLE_PWA === "true",
  // Exclude problematic files from PWA build that conflict with standalone
  buildExcludes: [
    /middleware-manifest\.json$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /server\/middleware\.js$/,
    /server\/middleware\.js\.map$/,
    /\.next\/server\/.*/,
    /\.next\/server\/middleware\.js$/,
  ],
  // Use a custom service worker filename
  sw: 'sw.js',
  // Ensure proper scope
  scope: '/',
  // Add basic runtime caching strategy
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 4,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
