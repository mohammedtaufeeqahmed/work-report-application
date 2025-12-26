import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  // Enable standalone output for optimized Docker builds
  output: 'standalone',
  // Webpack config - next-pwa will modify this automatically
  webpack: (config, { isServer, dev }) => {
    // Production optimizations
    if (!dev && !isServer) {
      // Optimize bundle splitting
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk for node_modules
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk for shared code
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
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
  // Optimize fonts
  optimizeFonts: true,
  // SWC minification is enabled by default in Next.js 16
  // Font optimization is handled automatically
};

// Configure PWA with proper exclusions for Next.js 16 standalone mode
// Note: next-pwa 5.6.0 has known compatibility issues with Next.js 16
// This configuration works around those issues
const pwaConfig = withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Exclude problematic files from PWA build that conflict with standalone
  buildExcludes: [
    /middleware-manifest\.json$/,
    /build-manifest\.json$/,
    /react-loadable-manifest\.json$/,
    /server\/middleware\.js$/,
    /server\/middleware\.js\.map$/,
    /\.next\/server\/.*/,
  ],
  // Use a custom service worker filename
  sw: 'sw.js',
  // Ensure proper scope
  scope: '/',
  // Disable automatic registration during build to avoid conflicts
  // The service worker will be registered at runtime
  runtimeCaching: [],
});

export default pwaConfig(nextConfig);
