import type { Product } from "@/types";
import { money } from "./data-layer";
import type { Ga4Item } from "./types";

export interface ToGa4ItemOpts {
  quantity?: number;
  /** Zero-based position in a list — drives select_item attribution. */
  index?: number;
  /** Source list (e.g. "Search Results", category name, "PDP"). */
  listName?: string;
  /** Variant label / id when a specific variant is selected. */
  variant?: string;
  /** Override unit price (e.g. active tier price from the buy box). */
  price?: number;
}

/**
 * The single source of truth mapping our `Product` model → GA4 item shape.
 * EVERY ecommerce event funnels through this so the dataLayer item shape is
 * identical everywhere (PDP, PLP, cart, search). Do not build items inline.
 *
 *   item_id        = SKU (stable identifier; not the BC entity id)
 *   item_name      = product name
 *   item_brand     = brand
 *   item_category  = category
 *   price          = unit price (tier override > product.price)
 *   quantity/index/item_list_name = passed in by the caller
 *   mpn            = manufacturer part number (when present) — feeds/Merchant Center
 *   item_variant   = variant label (when present)
 */
export function toGa4Item(product: Product, opts: ToGa4ItemOpts = {}): Ga4Item {
  const unitPrice = opts.price ?? product.price;

  const item: Ga4Item = {
    item_id: product.sku,
    item_name: product.name,
  };

  if (product.brand) item.item_brand = product.brand;
  if (product.category) item.item_category = product.category;
  if (typeof unitPrice === "number") item.price = money(unitPrice);
  if (typeof opts.quantity === "number") item.quantity = opts.quantity;
  if (typeof opts.index === "number") item.index = opts.index;
  if (opts.listName) item.item_list_name = opts.listName;
  if (product.mpn) item.mpn = product.mpn;
  if (opts.variant) item.item_variant = opts.variant;

  return item;
}

/** Sum a list of GA4 items into an ecommerce `value` (price × quantity). */
export function itemsValue(items: Ga4Item[]): number {
  return money(
    items.reduce((sum, it) => sum + (it.price ?? 0) * (it.quantity ?? 1), 0),
  );
}
