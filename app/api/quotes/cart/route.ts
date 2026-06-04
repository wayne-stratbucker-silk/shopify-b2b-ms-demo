import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuoteCartDraftOrderId, setQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { getQuote, findCartDraftOrderForCustomer } from "@/lib/quotes/client";
import type { QuoteCartLineItem } from "@/types/line-item";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [], count: 0 });

  let draftOrderId = await getQuoteCartDraftOrderId();

  // Fallback: recover cart from Shopify if cookie was lost
  if (!draftOrderId) {
    draftOrderId = await findCartDraftOrderForCustomer(session.customerId).catch(() => null);
    if (draftOrderId) await setQuoteCartDraftOrderId(draftOrderId);
  }

  if (!draftOrderId) return NextResponse.json({ items: [], count: 0 });

  const quote = await getQuote(draftOrderId).catch(() => null);

  if (!quote || quote.status !== "draft") {
    await clearQuoteCart();
    return NextResponse.json({ items: [], count: 0 });
  }

  const items: QuoteCartLineItem[] = (quote.quoteItems ?? []).map((item) => ({
    sku: item.sku,
    name: item.name,
    quantity: item.qty,
    unitPrice: item.listPrice,
    imageUrl: item.imageUrl,
    variantId: item.variantId ? parseInt(item.variantId.split("/").pop() ?? "0", 10) || undefined : undefined,
    productId: item.productId ? parseInt(item.productId.split("/").pop() ?? "0", 10) || undefined : undefined,
  }));

  return NextResponse.json({ items, count: items.length });
}
