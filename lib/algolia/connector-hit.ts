// Normalizes Shopify Algolia connector hits into our canonical Product type.
// The Shopify connector indexes one record per variant (objectID = variant ID).

import type { Product } from "@/types";

export interface ShopifyConnectorHit {
  objectID: string;              // variant ID (numeric string)
  id: number;                    // product ID (numeric)
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  price: number;
  compare_at_price: number | null;
  variants_min_price: number;
  variants_max_price: number;
  price_range: string;           // "min:max"
  product_image: string | null;
  image: string | null;
  sku: string | null;
  inventory_quantity: number;
  inventory_available: boolean;
  tags: string[];
  _tags: string[];
  named_tags: Record<string, string[]>;
  body_html_safe: string;
  variant_title: string;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  meta?: Record<string, unknown>;
}

function extractCategory(tags: string[]): string {
  return (tags ?? []).find(t => t !== "b2b-demo" && !t.includes(":")) ?? "uncategorized";
}

export function mapConnectorHit(hit: ShopifyConnectorHit): Product {
  const imageUrl = hit.product_image ?? hit.image ?? undefined;
  const price = hit.price ?? 0;
  const listPrice = (hit.compare_at_price ?? 0) > price ? (hit.compare_at_price ?? price) : price;

  return {
    id: `gid://shopify/Product/${hit.id}`,
    variantId: `gid://shopify/ProductVariant/${hit.objectID}`,
    handle: hit.handle,
    sku: hit.sku ?? hit.handle,
    name: hit.title,
    brand: hit.vendor ?? "",
    category: extractCategory(hit.tags ?? []),
    description: hit.body_html_safe || undefined,
    price,
    listPrice,
    wasSalePrice: listPrice > price ? listPrice : undefined,
    uom: hit.named_tags?.["uom"]?.[0] ?? "EA",
    stockQty: hit.inventory_quantity ?? 0,
    leadTime: hit.inventory_available ? "In stock" : "Contact for availability",
    leadTimeDays: hit.inventory_available ? 1 : undefined,
    badges: [],
    tiers: [],
    images: imageUrl ? [imageUrl] : [],
    galleryImages: imageUrl ? [{ url: imageUrl, alt: hit.title, sortOrder: 0 }] : [],
    trackInventory: true,
  };
}

// Type alias for components that still reference the old BigCommerce hit name
export type ConnectorHit = ShopifyConnectorHit;

// Backward-compat aliases used by search-box and quick-order-strip
export { mapConnectorHit as normalizeHit };
export type RawConnectorHit = ShopifyConnectorHit;
