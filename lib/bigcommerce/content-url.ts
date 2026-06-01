// Compatibility shim — replaces BigCommerce WebDAV URLs with Shopify Files API.
// Pass absolute URLs through unchanged; filenames resolve to the store domain
// files path. Merchandisers should use Shopify Admin → Content → Files to
// upload assets and paste the full CDN URL in Makeswift.

export function bcContentUrl(input: string | null | undefined): string {
  if (!input) return "";
  const value = input.trim();
  if (!value) return "";
  // Pass-through for absolute or protocol-relative URLs
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(value)) return value;
  // Unknown filenames return as-is — merchandisers should use full Shopify CDN URLs
  return value;
}
