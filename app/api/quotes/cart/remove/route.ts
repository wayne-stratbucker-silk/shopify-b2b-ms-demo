import { NextResponse } from "next/server";
import { getQuoteCart, setQuoteCart } from "@/lib/quotes/quote-cart";

export async function POST(req: Request) {
  const { sku } = await req.json() as { sku?: string };
  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const cart = await getQuoteCart();
  const updated = cart.filter((i) => i.sku !== sku);
  await setQuoteCart(updated);

  return NextResponse.json({ ok: true, count: updated.length });
}
