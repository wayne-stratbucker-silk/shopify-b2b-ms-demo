import { NextResponse } from "next/server";
import { predictiveSearchProducts } from "@/lib/shopify/queries/search";

// Native Shopify predictive search for client consumers (header autocomplete,
// quick-order mobile typeahead). Kept fresh — search is inherently dynamic.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(url.searchParams.get("limit")) || 8, 20);
  if (!q) return NextResponse.json({ products: [] });
  try {
    const products = await predictiveSearchProducts(q, limit);
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ products: [] }, { status: 200 });
  }
}
