// ─── Canonical LineItem adapter ─────────────────────────────────────────────────
//
// `toLineItem` turns a hydrated `Product` into a canonical `LineItem`.

import type { LineItem } from "@/types/line-item";
import type { Product } from "@/types";

export interface ToLineItemOpts {
  quantity?: number;
  variantId?: number;
  /** Force unitPrice (e.g., negotiated price). Otherwise derived from the product. */
  unitPrice?: number;
  /** Per-Company SKU overlay. Auto-picked from `Product.customerSku` when present. */
  customerSku?: string;
}

/** Build a canonical LineItem from a hydrated `Product`. */
export function toLineItem(product: Product, opts: ToLineItemOpts = {}): LineItem {
  return {
    productId: 0,
    variantId: opts.variantId,
    sku: product.sku ?? "",
    customerSku: opts.customerSku ?? product.customerSku,
    name: product.name ?? "",
    quantity: Math.max(1, Math.floor(opts.quantity ?? 1)),
    unitPrice: opts.unitPrice ?? product.price ?? 0,
    listPrice: product.listPrice ?? undefined,
    imageUrl: pickProductImage(product),
  };
}

function pickProductImage(p: Product): string | undefined {
  if (p.images && p.images.length > 0) return p.images[0];
  if (p.galleryImages && p.galleryImages.length > 0) return p.galleryImages[0].url;
  return undefined;
}
