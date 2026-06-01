import { getCollections } from "@/lib/shopify/queries/products";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET() {
  try {
    const collections = await getCollections(250);
    const nodes = collections.map((c) => ({
      id: c.id,
      name: c.title,
      slug: c.handle,
      url: `/${c.handle}`,
      image: c.image ?? undefined,
    }));
    return NextResponse.json(nodes);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
