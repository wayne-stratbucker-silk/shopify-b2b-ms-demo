import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuoteCart, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { createQuote, updateQuoteStatus } from "@/lib/quotes/client";
import { adminQuery } from "@/lib/shopify/admin-client";
import type { MailingAddressInput } from "@/lib/quotes/client";
import type { QuoteCartLineItem } from "@/types/line-item";

interface ComponentAddress {
  firstName?: string;
  lastName?: string;
  companyName?: string;
  address?: string;
  apartment?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phoneNumber?: string;
}

function mapAddress(a: ComponentAddress | undefined): MailingAddressInput | undefined {
  if (!a) return undefined;
  const result: MailingAddressInput = {};
  if (a.firstName) result.firstName = a.firstName;
  if (a.lastName) result.lastName = a.lastName;
  if (a.companyName) result.company = a.companyName;
  if (a.address) result.address1 = a.address;
  if (a.apartment) result.address2 = a.apartment;
  if (a.city) result.city = a.city;
  if (a.state) result.province = a.state;
  if (a.zipCode) result.zip = a.zipCode;
  if (a.country) result.country = a.country;
  if (a.phoneNumber) result.phone = a.phoneNumber;
  return Object.keys(result).length > 0 ? result : undefined;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Read metadata from the request body (sent by QuoteCartReview)
  const body = await req.json().catch(() => ({})) as {
    items?: QuoteCartLineItem[];
    quoteTitle?: string;
    notes?: string;
    referenceNumber?: string;
    phoneNumber?: string;
    shippingAddress?: ComponentAddress;
    billingAddress?: ComponentAddress;
    sourceQuoteId?: string;
  };

  // Items: prefer the body (respects in-browser qty edits) with cookie as fallback
  const bodyItems = body.items && body.items.length > 0 ? body.items : null;
  const cookieItems = await getQuoteCart();
  const rawItems = bodyItems ?? cookieItems.map((i) => ({
    sku: i.sku,
    name: i.name,
    quantity: i.quantity,
    unitPrice: i.price,
    variantId: undefined as number | undefined,
    productId: undefined as number | undefined,
    imageUrl: i.imageUrl,
  }));

  if (!rawItems || rawItems.length === 0) {
    return NextResponse.json({ error: "Quote cart is empty" }, { status: 400 });
  }

  // Rebuild line items with GIDs from cookie (cookie has the authoritative GIDs)
  const cookieMap = new Map(cookieItems.map((i) => [i.sku, i]));
  const lineItems = rawItems.map((item) => {
    const cookie = cookieMap.get(item.sku);
    return {
      variantId: cookie?.variantId ?? `gid://shopify/ProductVariant/${item.variantId ?? 0}`,
      quantity: item.quantity,
      originalUnitPrice: String(item.unitPrice),
      title: item.name,
    };
  }).filter((i) => i.variantId && !i.variantId.endsWith("/0"));

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "No valid line items" }, { status: 400 });
  }

  let companyContactId: string | undefined;
  if (session.customerId) {
    const data = await adminQuery<{ customer: { companyContacts: { edges: Array<{ node: { id: string } }> } } | null }>(
      `query { customer(id: "${session.customerId}") { companyContacts(first:1) { edges { node { id } } } } }`
    ).catch(() => ({ customer: null }));
    companyContactId = data.customer?.companyContacts?.edges?.[0]?.node.id;
  }

  try {
    const quote = await createQuote({
      lineItems,
      customerId: session.customerId,
      companyId: session.companyId,
      companyLocationId: session.companyLocationId,
      companyContactId,
      title: body.quoteTitle,
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      shippingAddress: mapAddress(body.shippingAddress),
      billingAddress: mapAddress(body.billingAddress),
    });

    // If this is a resubmit of an existing quote, mark the original as updated_by_buyer
    if (body.sourceQuoteId) {
      await updateQuoteStatus(body.sourceQuoteId, "updated_by_buyer").catch(() => {});
    }

    await clearQuoteCart();
    return NextResponse.json({ quoteId: quote.id, quoteName: quote.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
