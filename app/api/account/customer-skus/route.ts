import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCompanySkuMap } from "@/lib/shopify/customer-skus";

// Returns the per-company SKU map so client components (product cards, order
// line items, quote line items) can overlay customer-specific part numbers.
// Response: { skus: { "VENDOR-SKU": "CUSTOMER-SKU", ... } }
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ skus: {} });

  const skus = await getCompanySkuMap(session.companyId);
  return NextResponse.json({ skus });
}
