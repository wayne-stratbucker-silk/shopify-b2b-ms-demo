import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  fetchInvoiceOrder,
  invoiceBelongsToSession,
  invoiceIsPaid,
  invoiceOutstanding,
  type InvoiceOrder,
} from "@/lib/b2b/invoices";
import { DownloadInvoiceButton, type InvoiceData } from "@/components/account/download-invoice-button";
import { PayInvoiceButton } from "@/components/account/pay-invoice-button";
import { RecordFilesMenu } from "@/components/account/record-files-menu";
import { listRecordFiles, toFileView } from "@/lib/b2b/company-files";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency });

function fmtDate(s?: string | null) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

function money(m: { shopMoney: { amount: string } } | undefined): number {
  return parseFloat(m?.shopMoney.amount ?? "0");
}

function addr(a?: InvoiceOrder["shippingAddress"]): string[] {
  if (!a) return [];
  return [
    a.name ?? "",
    a.address1 ?? "",
    [a.city, a.province, a.zip].filter(Boolean).join(", "),
    a.country ?? "",
  ].filter(Boolean);
}

function buildInvoiceDoc(order: InvoiceOrder, companyName: string): InvoiceData {
  const buyerName = order.customer
    ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim()
    : "";
  const sa = order.shippingAddress;
  return {
    orderId: parseInt(order.id.split("/").pop() ?? "0", 10),
    date: fmtDate(order.createdAt),
    buyerName,
    company: companyName,
    poNumber: order.poNumber ?? "",
    status: order.displayFinancialStatus,
    items: order.lineItems.edges.map(({ node }) => {
      const unit = money(node.originalUnitPriceSet);
      return { sku: node.sku ?? "", name: node.title, quantity: node.quantity, price: unit, total: unit * node.quantity };
    }),
    subtotal: money(order.subtotalPriceSet),
    shipping: money(order.totalShippingPriceSet),
    tax: money(order.totalTaxSet),
    total: money(order.totalPriceSet),
    shipTo: sa?.address1
      ? { name: sa.name ?? "", street: sa.address1, cityStateZip: [sa.city, sa.province, sa.zip].filter(Boolean).join(", ") }
      : undefined,
  };
}

interface Props { params: Promise<{ invoiceId: string }> }

export default async function InvoiceDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/invoices");
  if (!hasPermission(session.permissions, "company.invoices.view")) {
    return (
      <div className="card" style={{ padding: 40 }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Invoice</h1>
        <p style={{ color: "var(--muted)" }}>You don&apos;t have permission to view invoices.</p>
      </div>
    );
  }

  const { invoiceId } = await params;
  const order = await fetchInvoiceOrder(invoiceId);
  // Missing or not-your-company → 404 (never confirm existence).
  if (!order || !invoiceBelongsToSession(order, session)) return notFound();

  const currency = order.totalPriceSet.shopMoney.currencyCode ?? "USD";
  const total = money(order.totalPriceSet);
  const subtotal = money(order.subtotalPriceSet);
  const tax = money(order.totalTaxSet);
  const shipping = money(order.totalShippingPriceSet);
  const paid = money(order.totalReceivedSet);
  const outstanding = invoiceOutstanding(order);
  const isPaid = invoiceIsPaid(order);

  const schedule = order.paymentTerms?.paymentSchedules?.edges?.[0]?.node;
  const dueAt = schedule?.dueAt ?? null;
  const now = new Date();
  const isOverdue = !!dueAt && new Date(dueAt) < now && !isPaid;
  const overdueDays = isOverdue ? Math.floor((now.getTime() - new Date(dueAt!).getTime()) / 86_400_000) : 0;

  const canPay = hasPermission(session.permissions, "company.invoices.pay");
  const showPay = canPay && !isPaid && outstanding > 0;

  const successfulTx = order.transactions.filter(t => t.status === "SUCCESS");
  const recordFiles = session.companyId
    ? (await listRecordFiles(session.companyId, "invoice", invoiceId)).map(toFileView)
    : [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/invoices" className="text-sm" style={{ color: "var(--muted)" }}>← Invoices</Link>
        <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", gap: 16, marginTop: 8 }}>
          <div>
            <h1 className="text-h1">Invoice {order.name}</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Issued {fmtDate(order.createdAt)}
              {order.paymentTerms?.paymentTermsName ? ` · ${order.paymentTerms.paymentTermsName}` : ""}
            </p>
          </div>
          <div className="row" style={{ gap: 10, alignItems: "center" }}>
            <RecordFilesMenu files={recordFiles} label="Documents" />
            <span className={`status ${isPaid ? "ok" : isOverdue ? "err" : "info"}`}>
              {isPaid ? "Paid" : isOverdue ? `Overdue · ${overdueDays}d` : order.displayFinancialStatus}
            </span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 24 }} className="invoice-detail-grid">
        {/* Left: line items */}
        <div>
          <div className="card" style={{ overflow: "auto", marginBottom: 16 }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead><tr><th>Product</th><th>SKU</th><th className="num">Qty</th><th className="num">Unit</th><th className="num">Total</th></tr></thead>
              <tbody>
                {order.lineItems.edges.map(({ node: item }) => {
                  const unit = money(item.originalUnitPriceSet);
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 500 }}>{item.title}</td>
                      <td className="text-sm text-mono">{item.sku || "—"}</td>
                      <td className="num">{item.quantity}</td>
                      <td className="num">{fmt(unit, currency)}</td>
                      <td className="num" style={{ fontWeight: 600 }}>{fmt(unit * item.quantity, currency)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {successfulTx.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Payment history</div>
              <table className="tbl" style={{ width: "100%" }}>
                <thead><tr><th>Date</th><th>Type</th><th className="num">Amount</th></tr></thead>
                <tbody>
                  {successfulTx.map(t => (
                    <tr key={t.id}>
                      <td className="text-sm">{fmtDate(t.processedAt)}</td>
                      <td className="text-sm" style={{ textTransform: "capitalize" }}>{t.kind.toLowerCase()}</td>
                      <td className="num">{fmt(money(t.amountSet), t.amountSet.shopMoney.currencyCode ?? currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: balances + actions + meta */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="text-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Balance</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {([["Subtotal", subtotal], ["Shipping", shipping], ["Tax", tax], ["Total", total]] as const).map(([l, v]) => (
                <div key={l} className="row" style={{ justifyContent: "space-between" }}>
                  <span style={{ color: "var(--muted)" }}>{l}</span>
                  <span style={{ fontWeight: l === "Total" ? 700 : 400 }}>{fmt(v, currency)}</span>
                </div>
              ))}
              <div className="row" style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 8 }}>
                <span style={{ color: "var(--muted)" }}>Paid</span>
                <span>{fmt(paid, currency)}</span>
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ fontWeight: 600 }}>Amount due</span>
                <span style={{ fontWeight: 700, color: outstanding > 0 ? "var(--danger)" : "inherit" }}>{fmt(outstanding, currency)}</span>
              </div>
              {dueAt && (
                <div className="row" style={{ justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "var(--muted)" }}>Due date</span>
                  <span style={{ color: isOverdue ? "var(--danger)" : "inherit" }}>{fmtDate(dueAt)}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
              {showPay && <PayInvoiceButton orderId={order.id} amountLabel={fmt(outstanding, currency)} />}
              <DownloadInvoiceButton invoice={buildInvoiceDoc(order, session.companyName ?? "")} />
            </div>
          </div>

          {order.poNumber && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 4 }}>PO Number</div>
              <div className="text-mono text-sm">{order.poNumber}</div>
            </div>
          )}

          {order.billingAddress && addr(order.billingAddress).length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 8 }}>Bill To</div>
              <div className="text-sm" style={{ lineHeight: 1.6 }}>
                {session.companyName && <div style={{ fontWeight: 600 }}>{session.companyName}</div>}
                {addr(order.billingAddress).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}

          {order.shippingAddress && addr(order.shippingAddress).length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 8 }}>Ship To</div>
              <div className="text-sm" style={{ lineHeight: 1.6 }}>
                {addr(order.shippingAddress).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
