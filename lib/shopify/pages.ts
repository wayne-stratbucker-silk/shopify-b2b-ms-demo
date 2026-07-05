// Shopify-native content Pages (Online Store → Pages) — the CMS-authored
// "web page" equivalent of catalyst's BigCommerce Web Pages.
//
// The page body is authored in Shopify and rendered as sanitized HTML. Authors
// embed `[[makeswift-region:<id>]]` tokens anywhere in the body to drop live,
// editable Makeswift content regions in place (see
// components/makeswift/content-regions.tsx).
//
// Fetched via the Storefront API (like lib/blog.ts), NOT the Admin API: this
// headless store has no Admin token provisioned yet, and the Storefront API
// needs none. It also publish-filters automatically (only pages published to
// the storefront's sales channel come back) and exposes a clean `seo` object.

import { cache } from "react";
import { storefrontQuery } from "@/lib/shopify/storefront-client";

export interface ContentPage {
  id: string;
  handle: string;
  title: string;
  bodyHtml: string;
  bodySummary: string;
  seoTitle?: string;
  seoDescription?: string;
}

interface PageNode {
  id: string;
  handle: string;
  title: string;
  body: string | null;
  bodySummary: string | null;
  seo: { title: string | null; description: string | null } | null;
}

const PAGE_QUERY = `
  query ContentPage($handle: String!) {
    page(handle: $handle) {
      id
      handle
      title
      body
      bodySummary
      seo { title description }
    }
  }
`;

// React-cached so generateMetadata() and the page render dedupe to one
// Storefront round-trip per request.
export const getContentPage = cache(async (handle: string): Promise<ContentPage | null> => {
  if (!handle) return null;

  const data = await storefrontQuery<{ page: PageNode | null }>(
    PAGE_QUERY,
    { handle },
    undefined,
    [`page:${handle}`],
  ).catch(() => null);

  const node = data?.page;
  if (!node) return null;

  return {
    id: node.id,
    handle: node.handle,
    title: node.title,
    bodyHtml: node.body ?? "",
    bodySummary: node.bodySummary ?? "",
    seoTitle: node.seo?.title || undefined,
    seoDescription: node.seo?.description || undefined,
  };
});
