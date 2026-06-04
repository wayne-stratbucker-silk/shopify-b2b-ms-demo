import { cookies } from "next/headers";

export const QUOTE_CART_COOKIE = "acme_quote_cart";

// Kept for type compatibility with cart page components
export interface QuoteCartItem {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  price: number;
  imageUrl?: string;
  handle: string;
}

/**
 * Returns the Shopify Draft Order GID for the active quote cart, or null.
 * Handles migration from the legacy cookie format (array of items) by
 * clearing the old cookie and returning null.
 */
export async function getQuoteCartDraftOrderId(): Promise<string | null> {
  const jar = await cookies();
  const raw = jar.get(QUOTE_CART_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    // Legacy format: array of items — clear it and return null
    if (Array.isArray(parsed)) {
      jar.delete(QUOTE_CART_COOKIE);
      return null;
    }
    if (parsed && typeof parsed.draftOrderId === "string") {
      return parsed.draftOrderId;
    }
    return null;
  } catch {
    jar.delete(QUOTE_CART_COOKIE);
    return null;
  }
}

export async function setQuoteCartDraftOrderId(draftOrderId: string): Promise<void> {
  const jar = await cookies();
  jar.set(QUOTE_CART_COOKIE, encodeURIComponent(JSON.stringify({ draftOrderId })), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearQuoteCart(): Promise<void> {
  const jar = await cookies();
  jar.delete(QUOTE_CART_COOKIE);
}
