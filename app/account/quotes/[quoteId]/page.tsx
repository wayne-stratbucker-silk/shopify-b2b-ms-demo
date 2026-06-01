import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getQuote } from "@/lib/quotes/client";
import type { QuoteStatus } from "@/types";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Awaiting Review",
  in_process: "Quote Ready — Action Required",
  updated_by_buyer: "Updated by Buyer",
  ordered: "Converted to Order",
  expired: "Expired",
  archived: "Archived",
};

interface Props { params: Promise<{ quoteId: string }> }

export default async function QuoteDetailPage({ params }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/quotes");

  const { quoteId } = await params;
  const draftOrderId = decodeURIComponent(quoteId);
  const quote = await getQuote(draftOrderId).catch(() => null);
  if (!quote) return notFound();

  const canAccept = quote.allowCheckout &&
    hasPermission(session.permissions, "company.quotes.approve") &&
    hasPermission(session.permissions, "company.orders.create");

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Link href="/account/quotes" className="text-sm" style={{ color: "var(--muted)" }}>← Quotes</Link>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: 8 }}>
          <div>
            <h1 className="text-h1">Quote {quote.draftOrderName}</h1>
            {quote.title && <p className="text-body" style={{ color: "var(--muted)", marginTop: 4 }}>{quote.title}</p>}
            <p className="text-sm" style={{ color: "var(--muted)", marginTop: 4 }}>Requested {fmtDate(quote.date)}</p>
          </div>
          <span className={`status ${quote.statusKind}`}>{STATUS_LABELS[quote.status]}</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24 }}>
        <div>
          {/* Line items */}
          <div className="card" style={{ overflow: "auto", marginBottom: 16 }}>
            <table className="tbl" style={{ width: "100%" }}>
              <thead><tr><th>Product</th><th>SKU</th><th>Qty</th><th>List Price</th><th>Quoted Price</th><th>Total</th></tr></thead>
              <tbody>
                {(quote.quoteItems ?? []).map((item, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td className="text-sm text-mono">{item.sku}</td>
                    <td>{item.qty}</td>
                    <td className="text-sm" style={{ textDecoration: item.quotedPrice < item.listPrice ? "line-through" : "none", color: "var(--muted)" }}>
                      {fmt(item.listPrice)}
                    </td>
                    <td style={{ fontWeight: 600, color: item.quotedPrice < item.listPrice ? "var(--success)" : "inherit" }}>
                      {fmt(item.quotedPrice)}
                    </td>
                    <td style={{ fontWeight: 600 }}>{fmt(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Message thread */}
          {(quote.messages ?? []).length > 0 && (
            <div className="card" style={{ padding: 20, marginBottom: 16 }}>
              <div className="text-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Notes</div>
              {quote.messages!.map((msg, i) => (
                <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < quote.messages!.length - 1 ? "1px solid var(--line)" : "none" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{msg.author}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>{fmtDate(msg.date)}</span>
                  </div>
                  <p className="text-sm">{msg.body}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 20 }}>
            <div className="text-h4" style={{ fontWeight: 600, marginBottom: 12 }}>Quote Total</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 16 }}>{fmt(quote.total)}</div>
            {quote.expires && (
              <p className="text-xs" style={{ color: "var(--muted)", marginBottom: 12 }}>
                Expires {fmtDate(quote.expires)}
              </p>
            )}
            {canAccept && (
              <form action={`/api/quotes/${encodeURIComponent(quote.id)}`} method="POST">
                <input type="hidden" name="action" value="accept" />
                <button type="submit" className="btn btn-primary btn-block">
                  Accept & Checkout →
                </button>
              </form>
            )}
            {quote.status === "in_process" && !canAccept && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>Contact your admin to approve this quote.</p>
            )}
          </div>

          {quote.poNumber && (
            <div className="card" style={{ padding: 16 }}>
              <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>PO Number</div>
              <div className="text-mono">{quote.poNumber}</div>
            </div>
          )}

          {quote.referenceNumber && (
            <div className="card" style={{ padding: 16 }}>
              <div className="text-xs" style={{ color: "var(--muted)", marginBottom: 4 }}>Reference</div>
              <div className="text-mono">{quote.referenceNumber}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
