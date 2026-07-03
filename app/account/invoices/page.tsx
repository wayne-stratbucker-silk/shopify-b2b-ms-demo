import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";
import { DownloadInvoiceButton, type InvoiceData } from "@/components/account/download-invoice-button";
import { UrgencyPill } from "@/components/account/urgency-pill";
import { SortableTable, type SortColumn, type SortRow } from "@/components/account/sortable-table";

const INVOICE_COLUMNS: SortColumn[] = [
  { header: "Order #", sortable: true },
  { header: "Date", sortable: true },
  { header: "Due Date", sortable: true },
  { header: "Status", sortable: true },
  { header: "Amount", align: "num", sortable: true },
  { header: "" },
];

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
  customer?: { firstName?: string; lastName?: string };
  shippingAddress?: { firstName?: string; lastName?: string; address1?: string; city?: string; province?: string; zip?: string; country?: string };
  lineItems: { edges: Array<{ node: { title: string; sku?: string; quantity: number; originalUnitPriceSet: { shopMoney: { amount: string } } } }> };
  paymentTerms?: { paymentSchedules: { edges: Array<{ node: { dueAt?: string; completedAt?: string } }> } };
}

async function fetchInvoiceOrders(companyId: string): Promise<ShopifyOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const data = await adminQuery<{ orders: { edges: Array<{ node: ShopifyOrder }> } }>(
    `query GetInvoices($query: String!) {
      orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt displayFinancialStatus poNumber
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          customer { firstName lastName }
          shippingAddress { firstName lastName address1 city province zip country }
          lineItems(first: 50) { edges { node {
            title sku quantity
            originalUnitPriceSet { shopMoney { amount } }
          }}}
          paymentTerms {
            paymentSchedules(first: 1) {
              edges { node { dueAt completedAt } }
            }
          }
        }}
      }
    }`,
    { query: `company_id:${id} payment_terms:true` }
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map(e => e.node);
}

function buildInvoiceData(order: ShopifyOrder, companyName: string): InvoiceData {
  const buyerName = order.customer
    ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim()
    : "";
  const sa = order.shippingAddress;
  const shipTo = sa?.address1
    ? {
        name: `${sa.firstName ?? ""} ${sa.lastName ?? ""}`.trim(),
        street: sa.address1,
        cityStateZip: [sa.city, sa.province, sa.zip].filter(Boolean).join(", "),
      }
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
      return {
        sku: e.node.sku ?? "",
        name: e.node.title,
        quantity: e.node.quantity,
        price: unitPrice,
        total: unitPrice * e.node.quantity,
      };
    }),
    subtotal: parseFloat(order.subtotalPriceSet.shopMoney.amount),
    shipping: parseFloat(order.totalShippingPriceSet.shopMoney.amount),
    tax: parseFloat(order.totalTaxSet.shopMoney.amount),
    total: parseFloat(order.totalPriceSet.shopMoney.amount),
    shipTo,
  };
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

  const orders = session.companyId ? await fetchInvoiceOrders(session.companyId) : [];
  const now = new Date();

  const open = orders.filter(o => o.displayFinancialStatus !== "PAID" && o.displayFinancialStatus !== "REFUNDED");
  const overdue = open.filter(o => {
    const dueAt = o.paymentTerms?.paymentSchedules?.edges?.[0]?.node?.dueAt;
    return dueAt && new Date(dueAt) < now;
  });
  const upcoming = open
    .map(o => ({ order: o, dueAt: o.paymentTerms?.paymentSchedules?.edges?.[0]?.node?.dueAt }))
    .filter(({ dueAt }) => dueAt && new Date(dueAt) >= now)
    .sort((a, b) => new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime());

  const nextDue = upcoming[0];
  const outstandingTotal = open.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const overdueTotal = overdue.reduce((s, o) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const currency = orders[0]?.totalPriceSet.shopMoney.currencyCode ?? "USD";

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 8 }}>Invoices</h1>
      <p className="text-sm" style={{ color: "var(--muted)", marginBottom: 24 }}>
        Orders placed on payment terms (Net 30, Net 60, etc.)
      </p>

      {/* KPI tiles */}
      <div className="g3" style={{ marginBottom: 32 }}>
        <div className="kpi">
          <div className="lbl">Open Invoices</div>
          <div className="val">{open.length}</div>
          <div className="delta">{fmt(outstandingTotal, currency)} outstanding</div>
        </div>
        <div className="kpi">
          <div className="lbl">Overdue</div>
          <div className="val" style={{ color: overdue.length > 0 ? "var(--danger)" : "inherit" }}>{overdue.length}</div>
          <div className="delta" style={{ color: overdue.length > 0 ? "var(--danger)" : "inherit" }}>
            {overdue.length > 0 ? fmt(overdueTotal, currency) : "None"}
          </div>
        </div>
        <div className="kpi">
          <div className="lbl">Next Due</div>
          <div className="val" style={{ fontSize: 18 }}>
            {nextDue ? fmtDate(nextDue.dueAt!) : "—"}
          </div>
          <div className="delta">
            {nextDue ? fmt(parseFloat(nextDue.order.totalPriceSet.shopMoney.amount), currency) : "No upcoming"}
          </div>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No invoices found. Orders placed with payment terms will appear here.
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <SortableTable
            initialSort={{ index: 1, dir: "desc" }}
            columns={INVOICE_COLUMNS}
            rows={orders.map((order): SortRow => {
              const schedule = order.paymentTerms?.paymentSchedules?.edges?.[0]?.node;
              const dueAt = schedule?.dueAt;
              const isOverdue = dueAt && new Date(dueAt) < now && order.displayFinancialStatus !== "PAID";
              const overdueDays = isOverdue
                ? Math.floor((now.getTime() - new Date(dueAt!).getTime()) / 86_400_000)
                : 0;
              const amt = parseFloat(order.totalPriceSet.shopMoney.amount);
              const invoiceData = buildInvoiceData(order, session.companyName ?? "");
              const invoiceHref = `/account/invoices/${order.id.split("/").pop()}`;
              return {
                key: order.id,
                cells: [
                  { className: "", sortValue: order.name, content: <span style={{ fontWeight: 600 }}><Link href={invoiceHref} className="row-link" style={{ color: "var(--primary)" }}>{order.name}</Link></span> },
                  { className: "text-sm", sortValue: new Date(order.createdAt).getTime(), content: fmtDate(order.createdAt) },
                  { className: "text-sm", sortValue: dueAt ? new Date(dueAt).getTime() : 0, content: dueAt ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 2, alignItems: "flex-start" }}>
                        <span>{fmtDate(dueAt)}</span>
                        <UrgencyPill dueDate={dueAt} settled={order.displayFinancialStatus === "PAID"} />
                      </div>
                    ) : "—" },
                  { sortValue: order.displayFinancialStatus, content: (
                      <span className={`status ${order.displayFinancialStatus === "PAID" ? "ok" : isOverdue ? "err" : "info"}`}>
                        {isOverdue ? `Overdue · ${overdueDays}d` : order.displayFinancialStatus}
                      </span>
                    ) },
                  { className: "num", sortValue: amt, content: <span style={{ fontWeight: 600 }}>{fmt(amt, order.totalPriceSet.shopMoney.currencyCode)}</span> },
                  { content: <DownloadInvoiceButton invoice={invoiceData} /> },
                ],
              };
            })}
          />
        </div>
      )}
    </div>
  );
}
