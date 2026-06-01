import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getQuote, sendQuoteInvoice, updateQuoteStatus, addQuoteMessage } from "@/lib/quotes/client";
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

// Accept quote — sends invoice email and returns invoice URL
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.permissions, "company.quotes.approve")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const draftOrderId = decodeURIComponent(id);
  const { action, status, message } = await req.json();

  if (action === "accept") {
    const { invoiceUrl } = await sendQuoteInvoice(draftOrderId);
    await updateQuoteStatus(draftOrderId, "ordered");
    return NextResponse.json({ invoiceUrl });
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

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
