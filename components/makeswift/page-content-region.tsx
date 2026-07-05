"use client";

import type { ReactNode } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Slot } from "@makeswift/runtime/controls";

// Host component for inline `[[makeswift-region:<id>]]` regions embedded in
// Shopify-authored Page and blog content (see content-regions.tsx). Mirrors
// pdp-content-region.tsx: a pure passthrough Slot host that renders no DOM of
// its own, so dropped components own their width, spacing and background and
// the region collapses to nothing when empty.
//
// Each token binds its own snapshot ID (`acme-b2b-region-<id>`), so regions are
// designed independently — reuse an id to share a region across pages, or use a
// unique id for a page-specific one. Open the page/post URL in the Makeswift
// builder to edit its regions in context.
function PageContentRegion({ children }: { children?: ReactNode }) {
  return <>{children}</>;
}

runtime.registerComponent(PageContentRegion, {
  type: "acme/page-content-region",
  label: "Layout & Slots / Page Content Region",
  props: {
    children: Slot(),
  },
});

export default PageContentRegion;
