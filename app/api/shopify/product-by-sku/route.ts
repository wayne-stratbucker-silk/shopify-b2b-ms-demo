import { NextResponse } from "next/server";
import { getProductBySku } from "@/lib/shopify/queries/products";

interface VariantNode {
  id: string;
  sku: string;
  title: string;
  quantityAvailable?: number | null;
  price: { amount: string };
  compareAtPrice?: { amount: string } | null;
  selectedOptions: { name: string; value: string }[];
}

// Shopify gives every product at least one variant; one with a single
// "Title: Default Title" option is a simple product, not a real choice.
function isDefaultVariant(v: VariantNode): boolean {
  return (
    v.selectedOptions.length === 1 &&
    v.selectedOptions[0]?.name === "Title" &&
    v.selectedOptions[0]?.value === "Default Title"
  );
}

const toNum = (v?: { amount: string } | null): number | undefined =>
  v ? parseFloat(v.amount) : undefined;

// Resolve a SKU to a product and its variants for the Quick Order pad. Returns
// the matched variant's pricing/stock at the top level plus a `variants[]` array
// (matched variant first) so the pad can render a selector for multi-variant
// products. `variants` is omitted for simple products.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sku = searchParams.get("sku")?.trim();
  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const product = await getProductBySku(sku).catch(() => null);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const nodes = product.variants.edges.map((e) => e.node as unknown as VariantNode);
  const matched = nodes.find((v) => v.sku === sku) ?? nodes[0];
  if (!matched) return NextResponse.json({ error: "Variant not found" }, { status: 404 });

  const unitPrice = toNum(matched.price) ?? 0;
  const compareAt = toNum(matched.compareAtPrice);
  const listPrice = compareAt && compareAt > unitPrice ? compareAt : undefined;

  const hasOptions = !(nodes.length === 1 && isDefaultVariant(nodes[0]));
  // Matched variant first so the pad defaults its selection to the typed SKU.
  const ordered = hasOptions ? [matched, ...nodes.filter((v) => v !== matched)] : nodes;
  const variants = hasOptions
    ? ordered.map((v) => ({
        id: v.id,
        sku: v.sku,
        label: v.selectedOptions.map((o) => o.value).join(" / ") || v.title,
        optionName: v.selectedOptions.map((o) => o.name).join(" / ") || "Option",
        price: toNum(v.price) ?? 0,
        stock: v.quantityAvailable ?? undefined,
      }))
    : undefined;

  return NextResponse.json({
    sku: matched.sku,
    name: product.title,
    handle: product.handle,
    productId: product.id,
    unitPrice,
    listPrice,
    stock: matched.quantityAvailable ?? undefined,
    variants,
    // Legacy fields (kept for any direct single-variant callers).
    price: unitPrice,
    variantId: matched.id,
    merchandiseId: matched.id,
  });
}
