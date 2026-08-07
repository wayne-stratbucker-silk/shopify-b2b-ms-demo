import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getCreditLine } from "@/lib/b2b/credit";
import { type InvoiceData } from "@/components/account/download-invoice-button";
import { InvoicesTable, type InvoiceRow } from "./invoices-client";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") => n.toLocaleString("en-US", { style: "currency", currency });
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

interface ShopifyOrder {
  id: string;
  name: string;
  createdAt: string;
  displayFinancialStatus: string;
  poNumber?: string;
  totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  subtotalPriceSet: { shopMoney: { amount: string } };
  totalTaxSet: { shopMoney: { amount: string } };
  totalShippingPriceSet: { shopMoney: { amount: string } };
  totalOutstandingSet?: { shopMoney: { amount: string } };
  customer?: { firstName?: string; lastName?: string };
  shippingAddress?: { firstName?: string; lastName?: string; address1?: string; city?: string; province?: string; zip?: string; country?: string };
  lineItems: { edges: Array<{ node: { title: string; sku?: string; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } } } }> };
  paymentTerms?: { paymentTermsName?: string; paymentSchedules: { edges: Array<{ node: { dueAt?: string; completedAt?: string } }> } };
}

async function fetchInvoiceOrders(companyId: string): Promise<ShopifyOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const data = await adminQuery<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(
    `query GetInvoices($query: String!) {
      orders(first: 100, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt displayFinancialStatus poNumber
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalOutstandingSet { shopMoney { amount } }
          customer { firstName lastName }
          shippingAddress { firstName lastName address1 city province zip country }
          lineItems(first: 50) { edges { node { title sku quantity originalUnitPriceSet { shopMoney { amount } } } } }
          paymentTerms { paymentTermsName paymentSchedules(first: 1) { edges { node { dueAt completedAt } } } }
        }}
      }
    }`,
    { query: `company_id:${id} payment_terms:true` }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

function buildInvoiceData(order: ShopifyOrder, companyName: string): InvoiceData {
  const buyerName = order.customer ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() : "";
  const sa = order.shippingAddress;
  const shipTo = sa?.address1
    ? { name: `${sa.firstName ?? ""} ${sa.lastName ?? ""}`.trim(), street: sa.address1, cityStateZip: [sa.city, sa.province, sa.zip].filter(Boolean).join(", ") }
    : undefined;
  return {
    orderId: parseInt(order.id.split("/").pop() ?? "0", 10),
    date: fmtDate(order.createdAt),
    buyerName,
    company: companyName,
    poNumber: order.poNumber ?? "",
    status: order.displayFinancialStatus,
    items: order.lineItems.edges.map(e => {
      const unitPrice = parseFloat(e.node.originalUnitPriceSet.shopMoney.amount);
      return { sku: e.node.sku ?? "", name: e.node.title, quantity: e.node.quantity, price: unitPrice, total: unitPrice * e.node.quantity };
    }),
    subtotal: parseFloat(order.subtotalPriceSet.shopMoney.amount),
    shipping: parseFloat(order.totalShippingPriceSet.shopMoney.amount),
    tax: parseFloat(order.totalTaxSet.shopMoney.amount),
    total: parseFloat(order.totalPriceSet.shopMoney.amount),
    shipTo,
  };
}

function statusCode(s: string): 0 | 1 | 2 {
  if (s === "PAID" || s === "REFUNDED") return 2;
  if (s === "PARTIALLY_PAID" || s === "PARTIALLY_REFUNDED") return 1;
  return 0;
}

export default async function InvoicesPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/invoices");

  if (!hasPermission(session.permissions, "company.invoices.view")) {
    return (
      <div className="card" style={{ padding: 40 }}>
        <h1 className="text-h1" style={{ marginBottom: 8 }}>Invoices</h1>
        <p style={{ color: "var(--muted)" }}>You don&apos;t have permission to view invoices.</p>
      </div>
    );
  }

  const canPay = hasPermission(session.permissions, "company.invoices.pay");
  const [orders, credit] = await Promise.all([
    session.companyId ? fetchInvoiceOrders(session.companyId) : Promise.resolve([]),
    getCreditLine(session).catch(() => null),
  ]);
  const now = new Date();
  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD";

  const rows: InvoiceRow[] = orders.map((order) => {
    const dueAt = order.paymentTerms?.paymentSchedules?.edges?.[0]?.node?.dueAt;
    const status = statusCode(order.displayFinancialStatus);
    const total = parseFloat(order.totalPriceSet.shopMoney.amount);
    const outstanding = order.totalOutstandingSet ? parseFloat(order.totalOutstandingSet.shopMoney.amount) : (status === 2 ? 0 : total);
    return {
      id: order.id.split("/").pop() ?? order.id,
      gid: order.id,
      name: order.name,
      dueDate: dueAt ? Math.floor(new Date(dueAt).getTime() / 1000) : undefined,
      original: total,
      open: outstanding,
      status,
      invoiceData: buildInvoiceData(order, session.companyName ?? ""),
    };
  });

  const open = rows.filter((r) => r.status < 2);
  const overdue = open.filter((r) => r.dueDate && r.dueDate < now.getTime() / 1000);
  const upcoming = open.filter((r) => r.dueDate && r.dueDate >= now.getTime() / 1000).sort((a, b) => (a.dueDate ?? 0) - (b.dueDate ?? 0));
  const nextDue = upcoming[0];
  const outstandingTotal = open.reduce((s, r) => s + r.open, 0);
  const overdueTotal = overdue.reduce((s, r) => s + r.open, 0);

  const creditEnabled = !!credit?.creditEnabled && (credit?.creditLimit ?? 0) > 0;
  const usedPct = creditEnabled && credit ? Math.min(100, (credit.usedCredit / credit.creditLimit) * 100).toFixed(1) : "0.0";

  return (
    <div>
      <div className="page-h">
        <div>
          <h1>Invoices &amp; payments</h1>
          {rows.length > 0 && <p className="sub">{rows.length} {rows.length === 1 ? "invoice" : "invoices"} total</p>}
        </div>
      </div>

      {/* Credit line card */}
      {creditEnabled && credit && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-h">
            <h3>Credit line{credit.netTerms ? ` · ${credit.netTerms} terms` : ""}</h3>
            {credit.accountNumber && <span className="mono muted" style={{ fontSize: 12 }}>{credit.accountNumber}</span>}
          </div>
          <div className="card-b">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 14 }}>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Credit limit</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 600 }}>{fmt(credit.creditLimit, currency)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Used</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--warn)" }}>{fmt(credit.usedCredit, currency)}</div>
              </div>
              <div>
                <div className="muted" style={{ fontSize: 12, marginBottom: 3 }}>Available</div>
                <div className="mono" style={{ fontSize: 20, fontWeight: 600, color: "var(--success)" }}>{fmt(credit.availableCredit, currency)}</div>
              </div>
            </div>
            <div style={{ height: 6, background: "var(--line)", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
              <div style={{ height: "100%", width: `${usedPct}%`, background: "var(--warn)", borderRadius: 999 }} />
            </div>
            <div className="muted" style={{ fontSize: 12, display: "flex", justifyContent: "space-between" }}>
              <span>{usedPct}% utilized</span>
              {credit.netTerms && <span>{credit.netTerms} terms</span>}
            </div>
          </div>
        </div>
      )}

      {/* KPI tiles */}
      <div className="g3" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <span className="lbl">Open invoices</span>
          <span className="val">{open.length}</span>
          <span className="delta">{fmt(outstandingTotal, currency)} outstanding</span>
        </div>
        <div className="kpi">
          <span className="lbl">Overdue</span>
          <span className="val" style={{ color: overdue.length > 0 ? "var(--danger)" : undefined }}>{overdue.length}</span>
          <span className="delta" style={{ color: overdue.length > 0 ? "var(--danger)" : undefined }}>{overdue.length > 0 ? fmt(overdueTotal, currency) : "—"}</span>
        </div>
        <div className="kpi">
          <span className="lbl">Next due</span>
          <span className="val" style={{ fontSize: 18 }}>{nextDue?.dueDate ? fmtDate(new Date(nextDue.dueDate * 1000).toISOString()) : "—"}</span>
          <span className="delta">{nextDue ? fmt(nextDue.open, currency) : "No open invoices"}</span>
        </div>
      </div>

      <InvoicesTable invoices={rows} canPay={canPay} />
    </div>
  );
}
