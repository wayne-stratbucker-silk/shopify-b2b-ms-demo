// Public entrypoint for the analytics data layer.
// Import from "@/lib/analytics" everywhere — keeps call sites stable.
export * from "./types";
export { pushToDataLayer, DEFAULT_CURRENCY, money } from "./data-layer";
export { toGa4Item, itemsValue, type ToGa4ItemOpts } from "./to-ga4-item";
export {
  trackViewItem,
  trackViewItemList,
  trackSelectItem,
  trackAddToCart,
  trackRemoveFromCart,
  trackViewCart,
  trackBeginCheckout,
  trackAddToWishlist,
  trackAddToQuote,
  trackPurchase,
  trackSearch,
} from "./events";
