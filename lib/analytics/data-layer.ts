import type { DataLayerEvent } from "./types";

/** Default currency for all ecommerce events. Adjust if the storefront ever
 *  goes multi-currency — GA4 reads `currency` per-event from the ecommerce block. */
export const DEFAULT_CURRENCY = "USD";

/**
 * Direct-GA4 mode: a GA4 measurement id is set but NO GTM container.
 *
 * In GTM mode the container forwards our dataLayer events to GA4. But with
 * gtag.js loaded directly, gtag DOES NOT forward arbitrary
 * `dataLayer.push({ event, ecommerce })` objects to GA4 — it only processes
 * its own `gtag(...)` calls. So in this mode we bridge each named event to
 * gtag() ourselves. Gated off in GTM mode to avoid double-counting.
 */
const GA4_DIRECT =
  Boolean(process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID) && !process.env.NEXT_PUBLIC_GTM_ID;

/**
 * Safely push an event onto window.dataLayer.
 *
 * - No-ops on the server (SSR / RSC) where `window` is undefined.
 * - Lazily initializes `window.dataLayer` if a tag manager hasn't yet.
 * - In direct-GA4 mode, also forwards named events to gtag.js (see above).
 * - Never throws — analytics must not break the storefront.
 */
export function pushToDataLayer(event: DataLayerEvent): void {
  if (typeof window === "undefined") return;
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(event);
    if (GA4_DIRECT && typeof event.event === "string") forwardToGtag(event);
  } catch {
    // Swallow — a broken analytics push must never surface to the shopper.
  }
}

/**
 * Forward a named dataLayer event to GA4 via gtag.js (direct-GA4 mode only).
 *
 * The GTM dataLayer shape nests fields under `ecommerce`; gtag.js expects them
 * flattened as event params (`currency`, `value`, `items`, `search_term`, …),
 * so we spread the ecommerce block up one level. The `{ ecommerce: null }`
 * clear push has no `event` and never reaches here.
 */
function forwardToGtag(event: DataLayerEvent): void {
  // gtag.js defines window.gtag in its init <script>. If an event fires before
  // that script runs (e.g. the initial PDP view_item on a cold load), define
  // the same queue-stub so the call is buffered and replayed once gtag.js
  // loads — never dropped, never thrown.
  if (typeof window.gtag !== "function") {
    window.gtag = function gtag() {
      // Canonical gtag.js stub — it pushes the `arguments` object (not a copy)
      // so gtag.js replays the queued command verbatim once it loads.
      // eslint-disable-next-line prefer-rest-params
      (window.dataLayer ??= []).push(arguments as unknown as DataLayerEvent);
    };
  }
  const { event: name, ecommerce, ...rest } = event;
  window.gtag("event", name as string, { ...(ecommerce ?? {}), ...rest });
}

/**
 * Round to 2 decimals to keep dataLayer monetary values clean (avoids
 * floating-point noise like 12.340000000001 that pixels dislike).
 */
export function money(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
