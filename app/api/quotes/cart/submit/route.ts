import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { getQuote, submitCartAsQuote, updateQuoteStatus } from "@/lib/quotes/client";
import type { MailingAddressInput } from "@/lib/quotes/client";

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

  const body = await req.json().catch(() => ({})) as {
    quoteTitle?: string;
    notes?: string;
    referenceNumber?: string;
    shippingAddress?: ComponentAddress;
    billingAddress?: ComponentAddress;
    sourceQuoteId?: string;
  };

  const draftOrderId = await getQuoteCartDraftOrderId();
  if (!draftOrderId) return NextResponse.json({ error: "Quote cart is empty" }, { status: 400 });

  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote) return NextResponse.json({ error: "Quote cart not found" }, { status: 400 });
  if (quote.status !== "draft") return NextResponse.json({ error: "Cart has already been submitted" }, { status: 400 });

  try {
    await submitCartAsQuote(draftOrderId, {
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
    return NextResponse.json({ quoteId: draftOrderId, quoteName: quote.draftOrderName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit quote";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
