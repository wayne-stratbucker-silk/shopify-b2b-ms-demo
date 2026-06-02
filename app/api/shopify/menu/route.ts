import { getMenu } from "@/lib/shopify/queries/products";
import { NextResponse } from "next/server";

export const revalidate = 60;

export async function GET(request: Request) {
  const handle = new URL(request.url).searchParams.get("handle") || "main-menu";
  try {
    const tree = await getMenu(handle);
    return NextResponse.json(tree);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
