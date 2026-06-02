import { NextResponse } from "next/server";
import { getQuoteCart } from "@/lib/quotes/quote-cart";
import type { QuoteCartLineItem } from "@/types/line-item";

function extractNumericId(gid: string): number | undefined {
  const n = parseInt(gid.split("/").pop() ?? "", 10);
  return isNaN(n) || n === 0 ? undefined : n;
}

export async function GET() {
  const cookieItems = await getQuoteCart();

  const items: QuoteCartLineItem[] = cookieItems.map((item) => ({
    sku: item.sku,
    name: item.name,
    quantity: item.quantity,
    unitPrice: item.price,
    imageUrl: item.imageUrl,
    variantId: extractNumericId(item.variantId),
    productId: extractNumericId(item.productId),
  }));

  return NextResponse.json({ items, count: items.length });
}
