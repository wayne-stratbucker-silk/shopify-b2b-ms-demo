import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { createQuote } from "@/lib/quotes/client";
import { getProductBySku } from "@/lib/shopify/queries/products";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.permissions, "company.orders.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { sku, quantity, title, referenceNumber, poNumber, notes, expiresAt } = await req.json();
  if (!sku || !quantity) return NextResponse.json({ error: "sku and quantity required" }, { status: 400 });

  const product = await getProductBySku(sku);
  if (!product) return NextResponse.json({ error: `Product not found for SKU: ${sku}` }, { status: 404 });

  const defaultVariant = product.variants.edges[0]?.node;
  if (!defaultVariant) return NextResponse.json({ error: "No variant found" }, { status: 404 });

  // Get companyContactId for purchasing entity
  let companyContactId: string | undefined;
  if (session.companyId && session.customerId) {
    const data = await adminQuery<{ customer: { companyContacts: { edges: Array<{ node: { id: string } }> } } | null }>(
      `query GetContactId($customerId: ID!) {
        customer(id: $customerId) {
          companyContacts(first: 1) { edges { node { id } } }
        }
      }`,
      { customerId: session.customerId },
    ).catch(() => ({ customer: null }));
    companyContactId = data.customer?.companyContacts?.edges?.[0]?.node?.id;
  }

  const quote = await createQuote({
    lineItems: [{
      variantId: defaultVariant.id,
      quantity,
      originalUnitPrice: defaultVariant.price.amount,
      title: product.title,
    }],
    customerId: session.customerId,
    companyId: session.companyId,
    companyLocationId: session.companyLocationId,
    companyContactId,
    title,
    referenceNumber,
    poNumber,
    notes,
    expiresAt,
  });

  return NextResponse.json({ quoteId: quote.id, quoteName: quote.name });
}
