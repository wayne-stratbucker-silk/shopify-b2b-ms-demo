import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCart } from "@/lib/shopify/queries/cart";

const CART_COOKIE = "shopify_cart_id";

export async function GET() {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ count: 0 });

  try {
    const cart = await getCart(cartId) as { totalQuantity?: number } | null;
    return NextResponse.json({ count: cart ? ((cart as { totalQuantity?: number }).totalQuantity ?? 0) : 0 });
  } catch {
    return NextResponse.json({ count: 0 });
  }
}
