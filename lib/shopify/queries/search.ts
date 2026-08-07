// Native Shopify predictive search — powers the header autocomplete and the
// quick-order mobile typeahead. Replaces the Algolia autocomplete index.
//
// `predictiveSearch` is the Storefront API's built-in as-you-type endpoint: it
// matches product titles, vendors, tags and SKUs and returns ranked products.
// Results are intentionally lightweight (one variant, featured image only) —
// enough to render a dropdown row and resolve a click to the PDP.

import { storefrontQuery, type BuyerContext } from "@/lib/shopify/storefront-client";

export interface SearchProduct {
  handle: string;
  title: string;
  sku: string;
  vendor: string;
  price: number;
  image: string | null;
  stockQty: number;
  inStock: boolean;
  /** Resolved storefront URL for the product. */
  path: string;
}

interface PredictiveNode {
  handle: string;
  title: string;
  vendor?: string;
  featuredImage?: { url: string; altText?: string } | null;
  priceRange: { minVariantPrice: { amount: string } };
  variants: { edges: Array<{ node: { sku?: string; availableForSale: boolean; quantityAvailable?: number } }> };
}

export async function predictiveSearchProducts(
  query: string,
  limit = 8,
  buyer?: BuyerContext,
): Promise<SearchProduct[]> {
  const q = query.trim();
  if (!q) return [];

  const data = await storefrontQuery<{ predictiveSearch: { products: PredictiveNode[] } }>(
    `query PredictiveSearch($query: String!, $limit: Int) {
      predictiveSearch(query: $query, limit: $limit, limitScope: EACH, types: [PRODUCT]) {
        products {
          handle
          title
          vendor
          featuredImage { url altText }
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 1) {
            edges { node { sku availableForSale quantityAvailable } }
          }
        }
      }
    }`,
    { query: q, limit },
    buyer,
  );

  return (data.predictiveSearch?.products ?? []).map((p) => {
    const v = p.variants.edges[0]?.node;
    const stockQty = v?.quantityAvailable ?? 0;
    return {
      handle: p.handle,
      title: p.title,
      sku: v?.sku ?? p.handle,
      vendor: p.vendor ?? "",
      price: parseFloat(p.priceRange.minVariantPrice.amount) || 0,
      image: p.featuredImage?.url ?? null,
      stockQty,
      inStock: v?.availableForSale ?? stockQty > 0,
      path: `/products/${p.handle}`,
    };
  });
}
