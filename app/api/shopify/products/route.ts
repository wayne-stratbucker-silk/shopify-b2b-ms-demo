import { resolveSkuVariants } from "@/lib/shopify/queries/products";
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
    // Exact SKU → variant resolution via the Admin API (the Storefront API
    // cannot filter by SKU). See resolveSkuVariants for details.
    const variantMap = await resolveSkuVariants(skus);

    const products = skus.flatMap((sku) => {
      const v = variantMap.get(sku);
      if (!v) return [];

      return [
        {
          sku: v.sku,
          name: v.title,
          brand: v.vendor,
          price: fmt(v.price),
          unitPriceRaw: v.price,
          listPriceRaw: v.compareAtPrice,
          stock: v.inventoryQuantity,
          imageUrl: v.imageUrl,
          path: `/products/${v.handle}`,
        },
      ];
    });

    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}
