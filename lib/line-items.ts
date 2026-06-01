// ─── Canonical LineItem adapters ───────────────────────────────────────────────
//
// `toLineItem` accepts the most common source shapes we have on the storefront —
// a fully-typed `Product`, an Algolia-normalized hit, or an opaque record — and
// produces a canonical `LineItem`. Use it whenever an action needs to hand a
// product+quantity off to a downstream surface (cart, quote, list).
//
// Phase A: introduced additively. Phase B routes call sites here.

import type { LineItem } from "@/types/line-item";
import type { Product } from "@/types";
import type { NormalizedHit } from "@/lib/algolia/connector-hit";

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
export function toLineItem(hit: NormalizedHit, opts?: ToLineItemOpts): LineItem;
export function toLineItem(
  source: Product | NormalizedHit,
  opts: ToLineItemOpts = {},
): LineItem {
  const isProduct = "id" in source && typeof (source as Product).id === "string";
  const productId = isProduct
    ? parseInt((source as Product).id, 10)
    : Number((source as NormalizedHit).productId ?? 0);

  const unitPrice = opts.unitPrice ?? source.price ?? 0;
  const listPrice = source.listPrice ?? undefined;

  // customerSku lives on Product; NormalizedHit doesn't carry it (overlay
  // happens client-side after the hit returns). Caller may pass explicitly.
  const customerSku =
    opts.customerSku ?? (isProduct ? (source as Product).customerSku : undefined);

  return {
    productId: Number.isFinite(productId) ? productId : 0,
    variantId: opts.variantId,
    sku: source.sku ?? "",
    customerSku,
    name: source.name ?? "",
    quantity: Math.max(1, Math.floor(opts.quantity ?? 1)),
    unitPrice,
    listPrice,
    imageUrl: pickImage(source, isProduct),
  };
}

function pickImage(source: Product | NormalizedHit, isProduct: boolean): string | undefined {
  if (isProduct) {
    const p = source as Product;
    if (p.images && p.images.length > 0) return p.images[0];
    if (p.galleryImages && p.galleryImages.length > 0) return p.galleryImages[0].url;
    return undefined;
  }
  const h = source as NormalizedHit;
  return h.image ?? undefined;
}
