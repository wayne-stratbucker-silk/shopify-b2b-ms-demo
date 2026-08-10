import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartLinesUpdate } from "@/lib/shopify/queries/cart";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";

const CART_COOKIE = "shopify_cart_id";

export async function PATCH(req: Request) {
  const guard = await guardImpersonatedWrite("cart");
  if (guard) return guard;

  const { lineId, quantity } = await req.json();
  if (!lineId || quantity === undefined) return NextResponse.json({ error: "lineId and quantity required" }, { status: 400 });

  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ error: "No cart" }, { status: 400 });

  const cart = await cartLinesUpdate(cartId, [{ id: lineId, quantity }]);
  return NextResponse.json({ cart });
}
