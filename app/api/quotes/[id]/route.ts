import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import {
  getQuote, sendQuoteInvoice, updateQuoteStatus, addQuoteMessage,
  updateQuoteLineItemPrice, updateQuoteExpiry, completeDraftOrder,
  createCartDraftOrder,
} from "@/lib/quotes/client";
import { setQuoteCartDraftOrderId } from "@/lib/quotes/quote-cart";
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
  const { action, status, message, lineItemId, price, expiresAt, reason } = await req.json() as {
    action?: string;
    status?: string;
    message?: string;
    lineItemId?: string;
    price?: number;
    expiresAt?: string;
    reason?: string;
  };

  // Accept: buyer accepts the quoted price and converts the draft order to a real Shopify order.
  if (action === "accept") {
    if (!hasPermission(session.permissions, "company.orders.create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const { orderId, orderStatusUrl, orderName } = await completeDraftOrder(draftOrderId, true);
      await updateQuoteStatus(draftOrderId, "ordered");
      return NextResponse.json({ ok: true, orderId, orderStatusUrl, orderName });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // Complete: admin force-converts a draft order to an order on behalf of the buyer.
  if (action === "complete") {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    try {
      const { orderId, orderStatusUrl, orderName } = await completeDraftOrder(draftOrderId, true);
      await updateQuoteStatus(draftOrderId, "ordered");
      return NextResponse.json({ ok: true, orderId, orderStatusUrl, orderName });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  // Approve: internal company admin approves a pending quote before it goes to sales rep.
  if (action === "approve") {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await updateQuoteStatus(draftOrderId, "in_process");
    return NextResponse.json({ ok: true });
  }

  // Reject: admin rejects a pending or in-process quote (archives it with optional reason).
  if (action === "reject") {
    if (!hasPermission(session.permissions, "company.quotes.approve")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (reason) {
      const q = await getQuote(draftOrderId);
      if (q) {
        await addQuoteMessage(draftOrderId, q.messages ?? [], {
          author: session.name,
          authorRole: "rep",
          date: new Date().toISOString(),
          body: `Rejected: ${reason}`,
        });
      }
    }
    await updateQuoteStatus(draftOrderId, "archived");
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
    const lineItems = (q.quoteItems ?? [])
      .filter((item) => item.variantId)
      .map((item) => ({
        variantId: item.variantId!,
        quantity: item.qty,
        originalUnitPrice: String(item.listPrice),
        title: item.name,
      }));
    if (lineItems.length === 0) {
      return NextResponse.json({ error: "No duplicable items found" }, { status: 400 });
    }
    const cart = await createCartDraftOrder(session.customerId, lineItems, {
      companyId: session.companyId,
      companyLocationId: session.companyLocationId,
    });
    await setQuoteCartDraftOrderId(cart.id);
    return NextResponse.json({ ok: true, count: lineItems.length });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
