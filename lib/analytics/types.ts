// ─── GA4 ecommerce dataLayer types ───
//
// These mirror the GA4 "recommended ecommerce events" item shape. They are
// intentionally permissive (extra fields allowed) so a marketer can map any
// downstream pixel (Meta / Google Ads / TikTok) off the same dataLayer push
// without code changes. See docs/ANALYTICS.md for the field → pixel mapping.

/** A single line item in GA4 ecommerce shape (`items[]`). */
export interface Ga4Item {
  /** GA4 required identifier — we use the product SKU. */
  item_id: string;
  /** GA4 required display name. */
  item_name: string;
  item_brand?: string;
  item_category?: string;
  /** Unit price (selling price), not extended. */
  price?: number;
  quantity?: number;
  /** Zero-based position within a list (for select_item attribution). */
  index?: number;
  /** Source list name (e.g. "Search Results", category name). */
  item_list_name?: string;
  /** Manufacturer part number — useful for Google Merchant / feeds. */
  mpn?: string;
  /** Variant label when a specific variant is in play. */
  item_variant?: string;
  /** Allow downstream-pixel-specific extras without fighting the type. */
  [key: string]: string | number | undefined;
}

/** The `ecommerce` block attached to each ecommerce event. */
export interface Ga4Ecommerce {
  currency?: string;
  /** Monetary value of the event (sum of price × quantity, or order total). */
  value?: number;
  items?: Ga4Item[];
  // Purchase / checkout extras
  transaction_id?: string;
  tax?: number;
  shipping?: number;
  coupon?: string;
  affiliation?: string;
}

/** Any object pushed onto window.dataLayer. */
export interface DataLayerEvent {
  event?: string;
  ecommerce?: Ga4Ecommerce | null;
  [key: string]: unknown;
}

declare global {
  interface Window {
    dataLayer?: DataLayerEvent[];
    /** gtag.js command queue (direct-GA4 mode). Defined by the GA4 init
     *  script, or stubbed by the data-layer bridge if an event fires first. */
    gtag?: (...args: unknown[]) => void;
  }
}
