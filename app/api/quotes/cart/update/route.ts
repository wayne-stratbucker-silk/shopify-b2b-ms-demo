import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { getQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { getQuote, updateCartDraftOrder } from "@/lib/quotes/client";

// Set the absolute quantity for a single line item in the quote cart.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("quote");
  if (guard) return guard;

  const { sku, quantity } = await req.json() as { sku?: string; quantity?: number };
  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });
  if (quantity == null || quantity < 1) {
    return NextResponse.json({ error: "quantity must be >= 1" }, { status: 400 });
  }

  const draftOrderId = await getQuoteCartDraftOrderId();
  if (!draftOrderId) return NextResponse.json({ error: "Quote cart is empty" }, { status: 400 });

  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote || quote.status !== "draft") {
    await clearQuoteCart();
    return NextResponse.json({ error: "Quote cart not found" }, { status: 400 });
  }

  const lineItems = (quote.quoteItems ?? [])
    .filter((i) => i.variantId)
    .map((i) => ({
      variantId: i.variantId!,
      quantity: i.sku === sku ? quantity : i.qty,
      originalUnitPrice: String(i.listPrice),
      title: i.name,
    }));

  if (!lineItems.some((i) => i.variantId)) {
    return NextResponse.json({ error: "No updatable items found" }, { status: 400 });
  }

  await updateCartDraftOrder(draftOrderId, lineItems);
  return NextResponse.json({ ok: true, count: lineItems.length });
}
