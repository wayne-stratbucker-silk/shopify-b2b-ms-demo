import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuoteCart, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { createQuote } from "@/lib/quotes/client";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.redirect("/login");

  const items = await getQuoteCart();
  if (items.length === 0) return NextResponse.redirect("/account/quotes/cart");

  let companyContactId: string | undefined;
  if (session.customerId) {
    const data = await adminQuery<{ customer: { companyContacts: { edges: Array<{ node: { id: string } }> } } | null }>(
      `query { customer(id: "${session.customerId}") { companyContacts(first:1) { edges { node { id } } } } }`
    ).catch(() => ({ customer: null }));
    companyContactId = data.customer?.companyContacts?.edges?.[0]?.node.id;
  }

  const quote = await createQuote({
    lineItems: items.map(i => ({
      variantId: i.variantId,
      quantity: i.quantity,
      originalUnitPrice: String(i.price),
      title: i.name,
    })),
    customerId: session.customerId,
    companyId: session.companyId,
    companyLocationId: session.companyLocationId,
    companyContactId,
  });

  await clearQuoteCart();
  return NextResponse.redirect(new URL(`/account/quotes/${encodeURIComponent(quote.id)}`, process.env.NEXT_PUBLIC_APP_URL!));
}
