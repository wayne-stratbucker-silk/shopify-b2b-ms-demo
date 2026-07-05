"use client";

import { ReactRuntimeProvider, RootStyleRegistry, type SiteVersion } from "@makeswift/runtime/next";
import { runtime } from "@/lib/makeswift/runtime";

// Register all custom components in the client bundle so the Makeswift builder can discover them
import "@/components/makeswift/hero-banner";
import "@/components/makeswift/product-carousel";
import "@/components/makeswift/promo-banner";
import "@/components/makeswift/category-grid";
import "@/components/makeswift/value-strip";
import "@/components/makeswift/brand-strip";
import "@/components/makeswift/quick-order-strip";
import "@/components/makeswift/vertical-spacer";
import "@/components/makeswift/shop-by-job";
import "@/components/makeswift/header-nav";
import "@/components/makeswift/footer-nav";
import "@/components/makeswift/nav-ad";
import "@/components/makeswift/plp-interstitial";
import "@/components/makeswift/full-banner";
import "@/components/makeswift/countdown-banner";
import "@/components/makeswift/search-phrases";
import "@/components/makeswift/shoppable-diagram";
import "@/components/makeswift/side-by-side";
import "@/components/makeswift/content-widget";
import "@/components/makeswift/rich-document";
import "@/components/makeswift/testimonial-widget";
import "@/components/makeswift/file-search";
import "@/components/makeswift/training-sections";
import "@/components/makeswift/customer-service";
import "@/components/makeswift/faq-section";
import "@/components/makeswift/pdp-content-region";
import "@/components/makeswift/pdp-trust-badges";
import "@/components/makeswift/pdp-freight-note";
import "@/components/makeswift/auth-marketing-panel";
import "@/components/makeswift/not-found-page";
import "@/components/makeswift/page-content-region";

export function MakeswiftProvider({
  children,
  siteVersion,
}: {
  children: React.ReactNode;
  siteVersion: SiteVersion | null;
}) {
  return (
    <ReactRuntimeProvider runtime={runtime} siteVersion={siteVersion}>
      <RootStyleRegistry>{children}</RootStyleRegistry>
    </ReactRuntimeProvider>
  );
}
