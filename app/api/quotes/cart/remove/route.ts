import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { getQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { getQuote, updateCartDraftOrder, deleteCartDraftOrder } from "@/lib/quotes/client";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("quote");
  if (guard) return guard;

  const { sku } = await req.json() as { sku?: string };
  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const draftOrderId = await getQuoteCartDraftOrderId();
  if (!draftOrderId) return NextResponse.json({ ok: true, count: 0 });

  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote || quote.status !== "draft") {
    await clearQuoteCart();
    return NextResponse.json({ ok: true, count: 0 });
  }

  const remaining = (quote.quoteItems ?? []).filter((i) => i.sku !== sku);

  if (remaining.length === 0) {
    await deleteCartDraftOrder(draftOrderId);
    await clearQuoteCart();
    return NextResponse.json({ ok: true, count: 0 });
  }

  const lineItems = remaining
    .filter((i) => i.variantId)
    .map((i) => ({
      variantId: i.variantId!,
      quantity: i.qty,
      originalUnitPrice: String(i.listPrice),
      title: i.name,
    }));

  await updateCartDraftOrder(draftOrderId, lineItems);
  return NextResponse.json({ ok: true, count: lineItems.length });
}
