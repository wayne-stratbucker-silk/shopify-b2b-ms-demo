import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { cartDiscountCodesUpdate } from "@/lib/shopify/queries/cart";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";

export const dynamic = "force-dynamic";

const CART_COOKIE = "shopify_cart_id";

/**
 * Apply or clear a cart discount code (Shopify-native equivalent of BC
 * coupons). POST { code } applies; POST { code: "" } or { clear: true } clears.
 * Shopify echoes invalid codes back with applicable=false, so we surface that.
 */
export async function POST(req: Request) {
  const guard = await guardImpersonatedWrite("cart");
  if (guard) return guard;

  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return NextResponse.json({ error: "No cart" }, { status: 400 });

  let body: { code?: string; clear?: boolean } = {};
  try { body = await req.json(); } catch { /* empty */ }

  const code = body.clear ? "" : (body.code ?? "").trim();
  const codes = code ? [code] : [];

  const result = await cartDiscountCodesUpdate(cartId, codes).catch((e: unknown) => {
    console.error("[cart/discount] update failed", e);
    return null;
  });
  if (!result || result.userErrors.length > 0 || !result.cart) {
    return NextResponse.json({ error: result?.userErrors[0]?.message || "Could not update discount" }, { status: 502 });
  }

  const applied = result.cart.discountCodes.filter((d) => d.applicable).map((d) => d.code);
  if (code && !applied.some((c) => c.toLowerCase() === code.toLowerCase())) {
    return NextResponse.json({ applied: false, error: "That code isn't valid for this cart.", codes: applied });
  }
  return NextResponse.json({ applied: true, codes: applied });
}
