import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { hasPermission } from "@/lib/auth/permissions";
import { placeExpress } from "@/lib/checkout/express";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

const CART_COOKIE = "shopify_cart_id";

export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "express-place", 10, 60_000);
  if (limited) return limited;

  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("order_place");
  if (guard) return guard;
  if (!hasPermission(session.permissions, "company.orders.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { poNumber?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const result = await placeExpress(session, body.poNumber?.trim() || undefined);
  if (result.error) {
    return NextResponse.json(
      { error: result.error, message: result.message },
      { status: result.error === "error" ? 502 : 409 },
    );
  }

  // Order placed — the cart is consumed. Clear the cart cookie.
  const jar = await cookies();
  jar.delete(CART_COOKIE);

  return NextResponse.json({
    ok: true,
    orderName: result.orderName,
    invoicePath: result.invoicePath,
  });
}
