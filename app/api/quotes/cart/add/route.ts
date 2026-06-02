import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuoteCart, setQuoteCart } from "@/lib/quotes/quote-cart";
import { getProductBySku } from "@/lib/shopify/queries/products";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json() as {
    sku?: string;
    qty?: number;
    quantity?: number;
    productName?: string;
    name?: string;
    unitPrice?: number;
    productId?: number;
    imageUrl?: string;
    variantId?: string;
  };

  const sku = body.sku?.trim();
  const qty = body.qty ?? body.quantity ?? 1;
  const productName = body.productName ?? body.name ?? "";
  const unitPrice = body.unitPrice ?? 0;
  const imageUrl = body.imageUrl;

  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  // Look up product to get GIDs and handle — needed for the quote submit step
  const product = await getProductBySku(sku);
  if (!product) return NextResponse.json({ error: `Product not found: ${sku}` }, { status: 404 });

  const matchingVariant = product.variants.edges
    .map((e) => e.node)
    .find((v) => v.sku === sku) ?? product.variants.edges[0]?.node;

  if (!matchingVariant) return NextResponse.json({ error: "No variant found" }, { status: 404 });

  const cart = await getQuoteCart();
  const existing = cart.find((i) => i.sku === sku);

  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      sku,
      name: productName || product.title,
      quantity: qty,
      price: unitPrice,
      variantId: matchingVariant.id,
      productId: product.id,
      handle: product.handle,
      imageUrl,
    });
  }

  await setQuoteCart(cart);
  return NextResponse.json({ ok: true, count: cart.length });
}
