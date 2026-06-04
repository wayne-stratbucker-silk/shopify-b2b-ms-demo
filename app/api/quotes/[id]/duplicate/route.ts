import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuote, createCartDraftOrder } from "@/lib/quotes/client";
import { setQuoteCartDraftOrderId } from "@/lib/quotes/quote-cart";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draftOrderId = decodeURIComponent(id);
  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const lineItems = (quote.quoteItems ?? [])
    .filter((item) => item.variantId)
    .map((item) => ({
      variantId: item.variantId!,
      quantity: item.qty,
      originalUnitPrice: String(item.listPrice),
      title: item.name,
    }));

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "No duplicable items found" }, { status: 400 });
  }

  const cart = await createCartDraftOrder(session.customerId, lineItems, {
    companyId: session.companyId,
    companyLocationId: session.companyLocationId,
  });
  await setQuoteCartDraftOrderId(cart.id);
  return NextResponse.json({ ok: true, count: lineItems.length });
}
