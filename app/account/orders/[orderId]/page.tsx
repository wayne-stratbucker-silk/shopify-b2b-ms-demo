import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import { ReorderButton } from "@/components/account/reorder-button";
import { DownloadInvoiceButton, type InvoiceData } from "@/components/account/download-invoice-button";

export const dynamic = "force-dynamic";

const fmt = (n: number, currency = "USD") => n.toLocaleString("en-US", { style: "currency", currency });
function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}
function finCls(s: string): string {
  if (s === "PAID") return "ok";
  if (s === "PENDING" || s === "PARTIALLY_PAID" || s === "AUTHORIZED") return "warn";
  if (s === "REFUNDED" || s === "VOIDED" || s === "PARTIALLY_REFUNDED") return "muted";
  return "info";
}
function fulCls(s: string): string {
  if (s === "FULFILLED") return "ok";
  if (s === "PARTIALLY_FULFILLED" || s === "IN_PROGRESS" || s === "SCHEDULED") return "warn";
  if (s === "UNFULFILLED" || s === "ON_HOLD") return "info";
  return "muted";
}
const pretty = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

interface Addr { name?: string; address1?: string; address2?: string; city?: string; province?: string; zip?: string; country?: string }

interface Props { params: Promise<{ orderId: string }> }

export default async function OrderDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/orders");

  const { orderId } = await params;
  const gid = orderId.startsWith("gid://") ? decodeURIComponent(orderId) : `gid://shopify/Order/${orderId}`;
  const numericId = gid.split("/").pop() ?? orderId;

  const data = await adminQuery<{ order: {
    id: string; name: string; createdAt: string; processedAt: string;
    displayFinancialStatus: string; displayFulfillmentStatus: string;
    poNumber?: string; note?: string;
    totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    subtotalPriceSet: { shopMoney: { amount: string } };
    totalTaxSet: { shopMoney: { amount: string } };
    totalShippingPriceSet: { shopMoney: { amount: string } };
    customer?: { firstName?: string; lastName?: string };
    shippingAddress?: Addr; billingAddress?: Addr;
    lineItems: { edges: Array<{ node: { id: string; title: string; quantity: number; sku?: string; originalUnitPriceSet: { shopMoney: { amount: string } }; variant?: { sku: string } } }> };
    fulfillments: Array<{ trackingInfo: Array<{ number: string; url?: string }> }>;
  } | null }>(
    `query GetOrder($id: ID!) {
      order(id: $id) {
        id name createdAt processedAt displayFinancialStatus displayFulfillmentStatus poNumber note
        totalPriceSet { shopMoney { amount currencyCode } }
        subtotalPriceSet { shopMoney { amount } }
        totalTaxSet { shopMoney { amount } }
        totalShippingPriceSet { shopMoney { amount } }
        customer { firstName lastName }
        shippingAddress { name address1 address2 city province zip country }
        billingAddress { name address1 address2 city province zip country }
        lineItems(first: 100) { edges { node { id title quantity sku originalUnitPriceSet { shopMoney { amount } } variant { sku } } } }
        fulfillments { trackingInfo { number url } }
      }
    }`,
    { id: gid }
  ).catch(() => ({ order: null }));

  const order = data.order;
  if (!order) return notFound();

  const currency = order.totalPriceSet.shopMoney.currencyCode;
  const total = parseFloat(order.totalPriceSet.shopMoney.amount);
  const subtotal = parseFloat(order.subtotalPriceSet.shopMoney.amount);
  const tax = parseFloat(order.totalTaxSet.shopMoney.amount);
  const shipping = parseFloat(order.totalShippingPriceSet.shopMoney.amount);
  const tracking = order.fulfillments.flatMap(f => f.trackingInfo);
  const buyer = order.customer ? `${order.customer.firstName ?? ""} ${order.customer.lastName ?? ""}`.trim() : "";

  const lineItems = order.lineItems.edges.map(({ node }) => {
    const unit = parseFloat(node.originalUnitPriceSet.shopMoney.amount);
    return { id: node.id, title: node.title, sku: node.sku || node.variant?.sku || "", quantity: node.quantity, unit, total: unit * node.quantity };
  });
  const reorderItems = lineItems.map((i) => ({ sku: i.sku, quantity: i.quantity }));

  const addrLines = (a?: Addr) => a?.address1 ? [a.name, a.address1, a.address2, [a.city, a.province, a.zip].filter(Boolean).join(", "), a.country].filter(Boolean) : null;
  const ship = addrLines(order.shippingAddress);
  const bill = addrLines(order.billingAddress);

  const invoiceData: InvoiceData = {
    orderId: parseInt(numericId, 10),
    date: fmtDate(order.createdAt),
    buyerName: buyer,
    company: session.companyName ?? "",
    poNumber: order.poNumber ?? "",
    status: order.displayFinancialStatus,
    items: lineItems.map((i) => ({ sku: i.sku, name: i.title, quantity: i.quantity, price: i.unit, total: i.total })),
    subtotal, shipping, tax, total,
    shipTo: order.shippingAddress?.address1
      ? { name: order.shippingAddress.name ?? "", street: order.shippingAddress.address1, cityStateZip: [order.shippingAddress.city, order.shippingAddress.province, order.shippingAddress.zip].filter(Boolean).join(", ") }
      : undefined,
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <nav className="crumbs" style={{ padding: "0 0 12px" }}>
        <Link href="/account">Account</Link>
        <span className="sep">/</span>
        <Link href="/account/orders">Orders</Link>
        <span className="sep">/</span>
        <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Order {order.name}</span>
      </nav>

      {/* Header + actions */}
      <div className="page-h">
        <div>
          <h1>Order {order.name}</h1>
          <p className="sub">Placed {fmtDate(order.createdAt)}{buyer ? ` · ${buyer}` : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <ReorderButton items={reorderItems} />
          <DownloadInvoiceButton invoice={invoiceData} />
        </div>
      </div>

      {/* Details + Summary */}
      <div className="g2" style={{ marginBottom: 24, alignItems: "start" }}>
        <div className="card">
          <div className="card-h"><h3>Details</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted">Payment</span>
              <span className={`status status-${finCls(order.displayFinancialStatus)}`}>{pretty(order.displayFinancialStatus)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="muted">Fulfillment</span>
              <span className={`status status-${fulCls(order.displayFulfillmentStatus)}`}>{pretty(order.displayFulfillmentStatus)}</span>
            </div>
            {order.poNumber && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">PO number</span><span className="mono">{order.poNumber}</span>
              </div>
            )}
            {buyer && (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">Buyer</span><span>{buyer}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="muted">Placed</span><span>{fmtDate(order.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h"><h3>Summary</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
            {([["Subtotal", subtotal], ["Shipping", shipping], ["Tax", tax]] as Array<[string, number]>).map(([l, v]) => (
              <div key={l} style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="muted">{l}</span><span className="mono">{fmt(v, currency)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--line)" }}>
              <span style={{ fontWeight: 600 }}>Total</span><span className="mono" style={{ fontWeight: 700 }}>{fmt(total, currency)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div className="card-h"><h3>Items ({lineItems.length})</h3></div>
        <table className="tbl">
          <thead><tr><th>Product</th><th>SKU</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Total</th></tr></thead>
          <tbody>
            {lineItems.map((item) => (
              <tr key={item.id}>
                <td style={{ fontWeight: 500 }}>{item.title}</td>
                <td className="mono" style={{ fontSize: 12 }}>{item.sku || "—"}</td>
                <td className="num">{item.quantity}</td>
                <td className="num">{fmt(item.unit, currency)}</td>
                <td className="num" style={{ fontWeight: 600 }}>{fmt(item.total, currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Addresses */}
      {(ship || bill) && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-h"><h3>Addresses</h3></div>
          <div className="card-b g2">
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Shipping</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{ship ? ship.map((l, i) => <div key={i}>{l}</div>) : <span className="muted">—</span>}</div>
            </div>
            <div>
              <div className="muted" style={{ fontSize: 12, marginBottom: 6, fontWeight: 500 }}>Billing</div>
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>{bill ? bill.map((l, i) => <div key={i}>{l}</div>) : <span className="muted">—</span>}</div>
            </div>
          </div>
        </div>
      )}

      {/* Tracking */}
      {tracking.length > 0 && (
        <div className="card">
          <div className="card-h"><h3>Tracking</h3></div>
          <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
            {tracking.map((t, i) => (
              <div key={i}>{t.url ? <a href={t.url} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>{t.number}</a> : t.number}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
