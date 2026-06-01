import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { getSiteVersion } from "@makeswift/runtime/next/server";
import { MakeswiftProvider } from "@/components/makeswift-provider";
import { AnalyticsScripts, GtmNoScript } from "@/components/analytics/analytics-scripts";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "swap",
  preload: false,
});
const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "swap",
  preload: false,
});

const SITE_NAME = "ACME B2B";
const SITE_DESCRIPTION =
  "The contractor's wholesale partner for commercial electrical & lighting. 14,200+ SKUs, tiered pricing, Net 30 terms, same-day ship.";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { template: `%s | ${SITE_NAME}`, default: "ACME B2B — Commercial Electrical & Lighting Supply" },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: "ACME B2B — Commercial Electrical & Lighting Supply",
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const siteVersion = await getSiteVersion();

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      style={{ "--font-geist-sans": geistSans.style.fontFamily, "--font-geist-mono": geistMono.style.fontFamily } as React.CSSProperties}
    >
      <head>
        <link rel="preconnect" href="https://cdn.shopify.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://cdn.shopify.com" />
        <AnalyticsScripts />
      </head>
      <body>
        <GtmNoScript />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <MakeswiftProvider siteVersion={siteVersion}>
          {children}
        </MakeswiftProvider>
      </body>
    </html>
  );
}
