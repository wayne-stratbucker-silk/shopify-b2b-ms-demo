import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export const dynamic = "force-dynamic";

// Recently purchased SKUs for the signed-in buyer, derived from the active
// company's most recent orders' line items (mirrors the order lookup in
// app/account/orders/page.tsx). De-duped by SKU, keeping the most recent
// purchase date, so the Reorder card can offer one-tap "buy it again".

interface RecentSku {
  sku: string;
  name: string;
  lastOrdered: string; // ISO date of the most recent order containing this SKU
}

interface OrderNode {
  createdAt: string;
  lineItems: {
    edges: Array<{ node: { sku: string | null; title: string; variant: { sku: string | null } | null } }>;
  };
}

function scopeQuery(companyId: string | undefined, customerId: string): string {
  if (companyId && companyId !== "default") {
    const id = companyId.replace("gid://shopify/Company/", "");
    return `company_id:${id}`;
  }
  const numId = customerId.replace("gid://shopify/Customer/", "");
  return `customer_id:${numId}`;
}

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ items: [] }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.max(1, Math.min(parseInt(searchParams.get("limit") ?? "8", 10) || 8, 24));

  const query = scopeQuery(session.companyId, session.customerId);

  const data = await adminQuery<{ orders: { edges: Array<{ node: OrderNode }> } }>(
    `query RecentSkuOrders($query: String!) {
      orders(first: 20, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          createdAt
          lineItems(first: 50) {
            edges { node { sku title variant { sku } } }
          }
        }}
      }
    }`,
    { query },
  ).catch(() => ({ orders: { edges: [] } }));

  // Walk orders newest-first; the first time we see a SKU wins its lastOrdered.
  const seen = new Map<string, RecentSku>();
  for (const { node: order } of data.orders.edges) {
    for (const { node: li } of order.lineItems.edges) {
      const sku = (li.variant?.sku ?? li.sku ?? "").trim();
      if (!sku || seen.has(sku)) continue;
      seen.set(sku, { sku, name: li.title, lastOrdered: order.createdAt });
      if (seen.size >= limit) break;
    }
    if (seen.size >= limit) break;
  }

  return NextResponse.json({ items: [...seen.values()] });
}
