import { validateSkus } from "@/lib/shopify/queries/products";
import { NextResponse } from "next/server";

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const skusParam = searchParams.get("skus") ?? "";
  const skus = skusParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!skus.length) {
    return NextResponse.json({ products: [] });
  }

  try {
    const productMap = await validateSkus(skus);

    const products = skus.flatMap((sku) => {
      const shopifyProduct = productMap.get(sku);
      if (!shopifyProduct) return [];

      const variant = shopifyProduct.variants.edges
        .map((e) => e.node)
        .find((v) => v.sku === sku);

      const price = parseFloat(
        variant?.price?.amount ??
          shopifyProduct.variants.edges[0]?.node?.price?.amount ??
          "0",
      );
      const listPrice = parseFloat(variant?.compareAtPrice?.amount ?? "0");

      return [
        {
          sku,
          name: shopifyProduct.title,
          brand: shopifyProduct.vendor || undefined,
          price: fmt(price),
          unitPriceRaw: price,
          listPriceRaw: listPrice > 0 ? listPrice : undefined,
          imageUrl: shopifyProduct.featuredImage?.url,
          path: `/${shopifyProduct.handle}`,
          // No `variants` field → treated as a finished SKU by all consumers
        },
      ];
    });

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
