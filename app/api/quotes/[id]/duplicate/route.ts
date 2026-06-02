import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuote } from "@/lib/quotes/client";
import { setQuoteCart } from "@/lib/quotes/quote-cart";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draftOrderId = decodeURIComponent(id);
  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const items = (quote.quoteItems ?? [])
    .filter((item) => item.variantId && item.productId)
    .map((item) => ({
      sku: item.sku,
      name: item.name,
      quantity: item.qty,
      price: item.listPrice,
      variantId: item.variantId!,
      productId: item.productId!,
      handle: item.productHandle ?? item.sku,
      imageUrl: item.imageUrl,
    }));

  if (items.length === 0) {
    return NextResponse.json({ error: "No duplicable items found" }, { status: 400 });
  }

  await setQuoteCart(items);
  return NextResponse.json({ ok: true, count: items.length });
}
