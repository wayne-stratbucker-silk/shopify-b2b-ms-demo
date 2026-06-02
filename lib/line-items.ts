// ─── Canonical LineItem adapters ───────────────────────────────────────────────
//
// `toLineItem` accepts the most common source shapes we have on the storefront —
// a fully-typed `Product` or an Algolia-normalized hit — and produces a canonical
// `LineItem`.

import type { LineItem } from "@/types/line-item";
import type { Product } from "@/types";
import type { RawShopifyHit } from "@/lib/algolia/connector-hit";

export interface ToLineItemOpts {
  quantity?: number;
  variantId?: number;
  /** Force unitPrice (e.g., negotiated price). Otherwise derived from source. */
  unitPrice?: number;
  /** Per-Company SKU overlay. Auto-picked from `Product.customerSku` when present. */
  customerSku?: string;
}

/** Build a canonical LineItem from a hydrated `Product`. */
export function toLineItem(product: Product, opts?: ToLineItemOpts): LineItem;
/** Build a canonical LineItem from a normalized Algolia hit. */
export function toLineItem(hit: RawShopifyHit, opts?: ToLineItemOpts): LineItem;
export function toLineItem(
  source: Product | RawShopifyHit,
  opts: ToLineItemOpts = {},
): LineItem {
  const isProduct = "id" in source && typeof (source as Product).id === "string"
    && (source as Product).id.startsWith("gid://");

  const unitPrice = opts.unitPrice ?? (source as { price?: number }).price ?? 0;
  const listPrice = (source as { listPrice?: number; compareAtPrice?: number }).listPrice
    ?? (source as RawShopifyHit).compareAtPrice
    ?? undefined;

  const customerSku =
    opts.customerSku ?? (isProduct ? (source as Product).customerSku : undefined);

  return {
    productId: 0,
    variantId: opts.variantId,
    sku: (source as { sku?: string }).sku ?? "",
    customerSku,
    name: (source as { name?: string }).name ?? "",
    quantity: Math.max(1, Math.floor(opts.quantity ?? 1)),
    unitPrice,
    listPrice,
    imageUrl: isProduct ? pickProductImage(source as Product) : (source as RawShopifyHit).imageUrl,
  };
}

function pickProductImage(p: Product): string | undefined {
  if (p.images && p.images.length > 0) return p.images[0];
  if (p.galleryImages && p.galleryImages.length > 0) return p.galleryImages[0].url;
  return undefined;
}
