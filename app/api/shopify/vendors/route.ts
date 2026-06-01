import { adminQuery } from "@/lib/shopify/admin-client";
import { NextResponse } from "next/server";

export const revalidate = 300;

interface VendorQueryResult {
  products: {
    edges: Array<{ node: { vendor: string } }>;
  };
}

export async function GET() {
  try {
    const data = await adminQuery<VendorQueryResult>(
      `query GetVendors {
        products(first: 250) {
          edges { node { vendor } }
        }
      }`,
    );

    const seen = new Set<string>();
    const vendors: Array<{ id: number; name: string; imageUrl: string; url: string }> = [];

    let idx = 0;
    for (const { node } of data.products.edges) {
      const name = node.vendor?.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      vendors.push({
        id: idx++,
        name,
        imageUrl: "",
        url: `/search?vendor=${encodeURIComponent(name)}`,
      });
    }

    vendors.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(vendors);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
