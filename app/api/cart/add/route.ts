import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartCreate, cartLinesAdd } from "@/lib/shopify/queries/cart";
import { getSession } from "@/lib/auth/session";

const CART_COOKIE = "shopify_cart_id";

export async function POST(req: Request) {
  const { merchandiseId, quantity = 1 } = await req.json();
  if (!merchandiseId) return NextResponse.json({ error: "merchandiseId required" }, { status: 400 });

  const session = await getSession();
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;

  let cart: { id: string; checkoutUrl: string; totalQuantity?: number };
  const lineItems = [{ merchandiseId, quantity }];

  if (cartId) {
    cart = await cartLinesAdd(cartId, lineItems) as typeof cart;
  } else {
    cart = await cartCreate(lineItems, session?.companyLocationId) as typeof cart;
    jar.set(CART_COOKIE, cart.id, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return NextResponse.json({ cartId: cart.id, count: (cart as { totalQuantity?: number }).totalQuantity ?? 1 });
}
