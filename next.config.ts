import type { NextConfig } from "next";
import path from "path";
import createWithMakeswift from "@makeswift/runtime/next/plugin";

const withMakeswift = createWithMakeswift();

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn.shopify.com" },
      { protocol: "https", hostname: "*.myshopify.com" },
      { protocol: "https", hostname: "s.mkswft.com" },
      { protocol: "https", hostname: "*.makeswift.com" },
      { protocol: "https", hostname: "*.makeswift-files.com" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [320, 420, 640, 768, 1024, 1280],
    imageSizes: [64, 128, 220, 256, 384],
  },
  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://*.google-analytics.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://cdn.shopify.com https://*.myshopify.com https://s.mkswft.com https://*.makeswift.com https://*.makeswift-files.com https://*.google-analytics.com",
      "connect-src 'self' https://*.algolia.net https://*.algolianet.com https://*.google-analytics.com https://*.googletagmanager.com https://*.myshopify.com",
      "font-src 'self' data:",
      "frame-src 'self' https://app.makeswift.com https://*.makeswift.com",
      "frame-ancestors 'self' https://app.makeswift.com https://*.makeswift.com",
      "form-action 'self' https://*.myshopify.com",
      "base-uri 'self'",
      "object-src 'none'",
      "report-uri /api/security/csp-report",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
  webpack(config) {
    const stub = path.resolve("./lib/makeswift/document-stub.js");
    config.resolve.alias = {
      ...config.resolve.alias,
      "next/document": stub,
    };
    return config;
  },
};

export default withMakeswift(nextConfig);
