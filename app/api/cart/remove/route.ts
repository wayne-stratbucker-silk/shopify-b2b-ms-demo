import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartLinesRemove } from "@/lib/shopify/queries/cart";

const CART_COOKIE = "shopify_cart_id";

export async function DELETE(req: Request) {
  const { lineId } = await req.json();
  if (!lineId) return NextResponse.json({ error: "lineId required" }, { status: 400 });

  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ error: "No cart" }, { status: 400 });

  const cart = await cartLinesRemove(cartId, [lineId]);
  return NextResponse.json({ cart });
}
