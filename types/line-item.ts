// ─── Canonical line-item shapes ────────────────────────────────────────────────
//
// One internal shape per surface (cart / quote draft / quote API / shopping list
// / quick-order builder), all extending a single `LineItem` base. Wire formats
// (BC cart REST, B2B Edition `BCQuoteItem`, `B2BShoppingListItem`) stay verbatim
// in `lib/bigcommerce/**` and `lib/b2b/**`; the adapter helpers there convert.
//
// Phase A introduces these types additively — no existing reader has been
// rewritten yet. Phase B routes call sites through the adapters and drops
// the old per-surface type aliases.

/** Canonical line-item record carried across surfaces. */
export interface LineItem {
  productId: number;
  variantId?: number;
  sku: string;
  /** Per-Company SKU overlay applied after the canonical SKU resolves. */
  customerSku?: string;
  name: string;
  quantity: number;
  /** Per-unit selling price (post-tier, post-sale). */
  unitPrice: number;
  /** Per-unit MSRP / list price, for strike-through display. */
  listPrice?: number;
  imageUrl?: string;
}

/** A cart line as the storefront cart UI consumes it. */
export interface CartLineItem extends LineItem {
  /** BC cart line id (returned by the cart API). */
  id: string;
  lineTotal: number;
  note?: string;
}

/** A quote-cart draft entry persisted in the buyer's browser cookie. */
export interface QuoteCartLineItem extends Omit<LineItem, "productId"> {
  /** Optional until the SKU resolver runs — pre-resolve rows can be SKU-only. */
  productId?: number;
}

/** A line item shipped to / returned from the B2B Edition `/rfq` API. */
export interface QuoteApiLineItem extends LineItem {
  /** Negotiated price (`offeredPrice` on the wire). Falls back to `unitPrice`. */
  offeredPrice?: number;
  discount?: number;
  options?: Array<{ optionId: number; optionValue: string | number }>;
  orderQuantityMinimum?: number;
  orderQuantityMaximum?: number;
}

/** A line item on a B2B Edition shopping list. */
export interface ShoppingListLineItem extends LineItem {
  /** B2B list-line id (used for per-item mutations). */
  id: number;
  productUrl?: string;
}

/** A single buyer-facing variant option, used by the quick-order builder. */
export interface VariantOption {
  id: number;
  sku: string;
  label: string;
  optionName: string;
  price?: number;
  stock?: number;
}

/** Quick-order strip row — transient client state, partial line item + status. */
export interface QuickOrderRow extends Partial<LineItem> {
  /** Row id (unrelated to BC; used as React key). */
  id: string;
  status: "idle" | "loading" | "found" | "not-found" | "error";
  brand?: string;
  /** Aggregate stock for the resolved product (`stockQty` from Algolia). */
  stock?: number;
  variants?: VariantOption[];
  selectedVariantId?: number;
  selectedVariantSku?: string;
  selectedVariantPrice?: number;
}
