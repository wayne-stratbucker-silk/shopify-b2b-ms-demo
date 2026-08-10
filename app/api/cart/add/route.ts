import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartCreate, cartLinesAdd } from "@/lib/shopify/queries/cart";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";

const CART_COOKIE = "shopify_cart_id";

interface LineInput {
  merchandiseId?: string;
  quantity?: number | string;
}

// Accepts either a single line (`{ merchandiseId, quantity }`) or a batch
// (`{ items: [{ merchandiseId, quantity }] }`). Quick Order sends a batch so all
// resolved rows land in one atomic cart mutation; the PDP buy box still posts a
// single line. Returns `cartUrl` for callers that redirect to the cart.
export async function POST(req: Request) {
  const guard = await guardImpersonatedWrite("cart");
  if (guard) return guard;

  const body = (await req.json()) as LineInput & { items?: LineInput[] };

  const rawItems: LineInput[] = Array.isArray(body.items)
    ? body.items
    : body.merchandiseId
      ? [{ merchandiseId: body.merchandiseId, quantity: body.quantity }]
      : [];

  const lineItems = rawItems
    .filter((it): it is { merchandiseId: string; quantity?: number | string } => !!it?.merchandiseId)
    .map((it) => ({
      merchandiseId: it.merchandiseId,
      quantity: Math.max(1, parseInt(String(it.quantity ?? 1), 10) || 1),
    }));

  if (!lineItems.length) {
    return NextResponse.json({ error: "merchandiseId required" }, { status: 400 });
  }

  const session = await getSession();
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;

  let cart: { id: string; checkoutUrl: string; totalQuantity?: number };

  if (cartId) {
    cart = (await cartLinesAdd(cartId, lineItems)) as typeof cart;
  } else {
    cart = (await cartCreate(lineItems, session?.companyLocationId)) as typeof cart;
    jar.set(CART_COOKIE, cart.id, {
      httpOnly: false,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return NextResponse.json({
    cartId: cart.id,
    count: cart.totalQuantity ?? lineItems.length,
    cartUrl: "/cart",
  });
}
