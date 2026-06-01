// ─── GA4 recommended ecommerce event helpers ───
//
// Each helper:
//   1. pushes `{ ecommerce: null }` to clear the previous ecommerce object
//      (GA4 best practice — prevents item bleed between events), then
//   2. pushes the named event with a fresh `ecommerce: { currency, value, items }`.
//
// All items must already be in GA4 shape via `toGa4Item`. See docs/ANALYTICS.md.

import { DEFAULT_CURRENCY, money, pushToDataLayer } from "./data-layer";
import { itemsValue } from "./to-ga4-item";
import type { Ga4Ecommerce, Ga4Item } from "./types";

interface BaseOpts {
  currency?: string;
  /** Override the computed value (else sum of price × quantity). */
  value?: number;
}

function emit(event: string, ecommerce: Ga4Ecommerce): void {
  // Clear the previous ecommerce object first (GA4 convention).
  pushToDataLayer({ ecommerce: null });
  pushToDataLayer({ event, ecommerce });
}

function ecom(items: Ga4Item[], opts: BaseOpts = {}): Ga4Ecommerce {
  return {
    currency: opts.currency ?? DEFAULT_CURRENCY,
    value: opts.value != null ? money(opts.value) : itemsValue(items),
    items,
  };
}

/** PDP view — fires once when the product detail loads. */
export function trackViewItem(item: Ga4Item, opts: BaseOpts = {}): void {
  emit("view_item", ecom([item], opts));
}

/** A list of products was shown (search results, category grid, carousel). */
export function trackViewItemList(
  items: Ga4Item[],
  listName?: string,
  opts: BaseOpts = {},
): void {
  emit("view_item_list", { ...ecom(items, opts), item_list_name: listName } as Ga4Ecommerce);
}

/** A product was clicked from a list (card click). */
export function trackSelectItem(
  item: Ga4Item,
  listName?: string,
  opts: BaseOpts = {},
): void {
  emit("select_item", { ...ecom([item], opts), item_list_name: listName } as Ga4Ecommerce);
}

/** Item added to the cart. */
export function trackAddToCart(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("add_to_cart", ecom(items, opts));
}

/** Item removed from the cart. */
export function trackRemoveFromCart(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("remove_from_cart", ecom(items, opts));
}

/** Cart page viewed. */
export function trackViewCart(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("view_cart", ecom(items, opts));
}

/** Checkout started (checkout CTA clicked). */
export function trackBeginCheckout(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("begin_checkout", ecom(items, opts));
}

/** Item saved to a wishlist / shopping list ("Add to list"). */
export function trackAddToWishlist(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("add_to_wishlist", ecom(items, opts));
}

/**
 * Item added to a B2B quote cart. Not a standard GA4 event — modeled as a
 * custom event but kept in ecommerce shape so the same item mapping and any
 * downstream pixel mapping still work.
 */
export function trackAddToQuote(items: Ga4Item[], opts: BaseOpts = {}): void {
  emit("add_to_quote", ecom(items, opts));
}

/**
 * Purchase / order completion. NOTE: order-confirmation is not wired in this
 * storefront yet (checkout is handed off to BigCommerce-hosted checkout). This
 * helper exists so the event is ready to fire from a future thank-you page —
 * pass `transaction_id` (order id), items, and totals. See docs/ANALYTICS.md.
 */
export function trackPurchase(
  transactionId: string,
  items: Ga4Item[],
  opts: BaseOpts & { tax?: number; shipping?: number; coupon?: string; affiliation?: string } = {},
): void {
  const base = ecom(items, opts);
  emit("purchase", {
    ...base,
    transaction_id: transactionId,
    tax: opts.tax != null ? money(opts.tax) : undefined,
    shipping: opts.shipping != null ? money(opts.shipping) : undefined,
    coupon: opts.coupon,
    affiliation: opts.affiliation,
  });
}

/** Site search performed. GA4 `search` carries `search_term` (top-level). */
export function trackSearch(searchTerm: string): void {
  pushToDataLayer({ event: "search", search_term: searchTerm });
}
