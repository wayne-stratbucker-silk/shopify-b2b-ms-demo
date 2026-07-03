import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";
import {
  fetchInvoiceOrder,
  invoiceBelongsToSession,
  invoiceIsPaid,
  invoiceOutstanding,
} from "@/lib/b2b/invoices";

export const dynamic = "force-dynamic";

/**
 * Record payment against a B2B invoice (an order on payment terms).
 *
 * Shopify-native equivalent of BigCommerce's invoiceCreateBcCart: mark the
 * order paid via orderMarkAsPaid. Gated on the distinct company.invoices.pay
 * grant and an IDOR check (the order must belong to the caller's company).
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.permissions, "company.invoices.pay")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { orderId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const orderId = body.orderId;
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  const order = await fetchInvoiceOrder(orderId);
  // Return 404 (never 403) for missing or unentitled invoices — don't confirm
  // the existence of an order the caller isn't allowed to see.
  if (!order || !invoiceBelongsToSession(order, session)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (invoiceIsPaid(order)) {
    return NextResponse.json({ error: "Invoice already paid" }, { status: 409 });
  }
  if (invoiceOutstanding(order) <= 0) {
    return NextResponse.json({ error: "Nothing outstanding" }, { status: 409 });
  }

  const result = await adminQuery<{
    orderMarkAsPaid: {
      order: { id: string; displayFinancialStatus: string; totalOutstandingSet: { shopMoney: { amount: string } } } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation PayInvoice($input: OrderMarkAsPaidInput!) {
      orderMarkAsPaid(input: $input) {
        order { id displayFinancialStatus totalOutstandingSet { shopMoney { amount } } }
        userErrors { field message }
      }
    }`,
    { input: { id: order.id } },
  ).catch((e: unknown) => {
    console.error("[invoices/pay] orderMarkAsPaid failed", e);
    return null;
  });

  const errs = result?.orderMarkAsPaid?.userErrors ?? [];
  if (!result || errs.length > 0 || !result.orderMarkAsPaid.order) {
    return NextResponse.json(
      { error: errs[0]?.message || "Payment could not be recorded" },
      { status: 502 },
    );
  }

  const paid = result.orderMarkAsPaid.order;
  return NextResponse.json({
    ok: true,
    financialStatus: paid.displayFinancialStatus,
    outstanding: parseFloat(paid.totalOutstandingSet.shopMoney.amount || "0"),
  });
}
