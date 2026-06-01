import { NextResponse } from "next/server";
import { getProductBySku } from "@/lib/shopify/queries/products";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sku = searchParams.get("sku");
  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const product = await getProductBySku(sku).catch(() => null);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const variant = product.variants.edges.find(e => e.node.sku === sku)?.node
    ?? product.variants.edges[0]?.node;
  if (!variant) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  return NextResponse.json({
    name: product.title,
    price: parseFloat(variant.price.amount),
    handle: product.handle,
    variantId: variant.id,
    merchandiseId: variant.id,
    sku: variant.sku,
  });
}
