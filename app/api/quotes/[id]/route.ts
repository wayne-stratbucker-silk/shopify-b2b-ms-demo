import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getQuote, sendQuoteInvoice, updateQuoteStatus, addQuoteMessage,
  updateQuoteLineItemPrice, updateQuoteExpiry,
} from "@/lib/quotes/client";
import { setQuoteCart } from "@/lib/quotes/quote-cart";
import { hasPermission } from "@/lib/auth/permissions";
import type { QuoteStatus } from "@/types";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const quote = await getQuote(decodeURIComponent(id));
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(quote);
}

// Quote actions: accept, approve, email, message, status
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const draftOrderId = decodeURIComponent(id);
  const { action, status, message, lineItemId, price, expiresAt } = await req.json() as {
    action?: string;
    status?: string;
    message?: string;
    lineItemId?: string;
    price?: number;
    expiresAt?: string;
  };

  // Accept: buyer accepts the quoted price and proceeds to checkout.
  // Requires order creation permission (not quote.approve — that's for internal approval).
  if (action === "accept") {
    if (!hasPermission(session.permissions, "company.orders.create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { invoiceUrl } = await sendQuoteInvoice(draftOrderId);
    await updateQuoteStatus(draftOrderId, "ordered");
    return NextResponse.json({ invoiceUrl });
  }

  // Approve: internal company admin approves a pending quote before it goes to sales rep.
  if (action === "approve") {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await updateQuoteStatus(draftOrderId, "in_process");
    return NextResponse.json({ ok: true });
  }

  // Email: send Shopify draft order invoice email to the buyer (sales rep action).
  if (action === "email") {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { invoiceUrl } = await sendQuoteInvoice(draftOrderId);
    return NextResponse.json({ ok: true, invoiceUrl });
  }

  if (action === "message" && message) {
    const quote = await getQuote(draftOrderId);
    if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await addQuoteMessage(draftOrderId, quote.messages ?? [], {
      author: session.name,
      authorRole: "buyer",
      date: new Date().toISOString(),
      body: message,
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "status" && status) {
    await updateQuoteStatus(draftOrderId, status as QuoteStatus);
    return NextResponse.json({ ok: true });
  }

  // Set or extend quote expiry date (admins only)
  if (action === "set_expiry" && expiresAt) {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await updateQuoteExpiry(draftOrderId, expiresAt);
    return NextResponse.json({ ok: true });
  }

  // Inline price edit on a line item (admins only)
  if (action === "update_line_price" && lineItemId && price != null) {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const q = await getQuote(draftOrderId);
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const item = q.quoteItems?.find((i) => i.lineItemId === lineItemId);
    await updateQuoteLineItemPrice(draftOrderId, lineItemId, item?.listPrice ?? price, price);
    return NextResponse.json({ ok: true });
  }

  // Reload quote items into the quote cart (for buyer "Request changes" flow)
  if (action === "reload_to_cart") {
    const q = await getQuote(draftOrderId);
    if (!q) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const items = (q.quoteItems ?? [])
      .filter((item) => item.variantId && item.productId)
      .map((item) => ({
        sku: item.sku,
        name: item.name,
        quantity: item.qty,
        price: item.listPrice,
        variantId: item.variantId!,
        productId: item.productId!,
        handle: item.productHandle ?? item.sku,
        imageUrl: item.imageUrl,
      }));
    await setQuoteCart(items);
    return NextResponse.json({ ok: true, count: items.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
