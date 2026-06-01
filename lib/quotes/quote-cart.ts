import { cookies } from "next/headers";

export const QUOTE_CART_COOKIE = "acme_quote_cart";

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

export async function getQuoteCart(): Promise<QuoteCartItem[]> {
  const jar = await cookies();
  const raw = jar.get(QUOTE_CART_COOKIE)?.value;
  if (!raw) return [];
  try { return JSON.parse(decodeURIComponent(raw)) as QuoteCartItem[]; } catch { return []; }
}

export async function setQuoteCart(items: QuoteCartItem[]): Promise<void> {
  const jar = await cookies();
  jar.set(QUOTE_CART_COOKIE, encodeURIComponent(JSON.stringify(items)), {
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
