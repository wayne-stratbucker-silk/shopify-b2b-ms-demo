import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getQuote } from "@/lib/quotes/client";
import { QuoteMessageForm } from "@/components/quote-message-form";
import { QuoteActions } from "@/components/quote-actions";
import { QuoteLineItems } from "@/components/quote-line-items";
import { AcceptButton } from "@/components/accept-button";
import { AdminCompleteButton } from "@/components/admin-complete-button";
import { RejectButton } from "@/components/reject-button";
import { QuoteActionButton } from "@/components/quote-action-button";
import { QuoteExpiryEditor } from "@/components/quote-expiry-editor";
import type { QuoteStatus } from "@/types";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
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

  const isAdmin = hasPermission(session.permissions, "company.quotes.approve");
  const isBuyer = hasPermission(session.permissions, "company.orders.create") && !isAdmin;

  // Any buyer with order creation rights can accept a vendor's quoted price
  const canAccept = quote.allowCheckout &&
    quote.status === "in_process" &&
    hasPermission(session.permissions, "company.orders.create") &&
    !isAdmin;

  // Admins can internally approve a new quote (sending it to the sales rep)
  const canApprove = quote.status === "new" && isAdmin;

  // Admins can send the Shopify draft-order invoice email to the buyer
  const canSendEmail = isAdmin;

  // Admins can force-complete a quote on behalf of the buyer
  const canComplete = quote.status === "in_process" && isAdmin;

  // Admins can reject a pending or in-process quote
  const canReject = (quote.status === "new" || quote.status === "in_process") && isAdmin;

  // Buyers can request changes when a quote is still active
  const canRequestChanges = isBuyer;

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
          {/* Line items — admins get inline price editing */}
          <QuoteLineItems
            quoteId={encodeURIComponent(quote.id)}
            items={quote.quoteItems ?? []}
            isAdmin={canSendEmail}
          />

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

          <QuoteMessageForm quoteId={encodeURIComponent(quote.id)} />
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
            {quote.invoiceUrl && (
              <a
                href={quote.invoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-block"
                style={{ marginBottom: 8, textAlign: "center", display: "block" }}
              >
                View Invoice PDF
              </a>
            )}
            {canAccept && (
              <AcceptButton quoteId={encodeURIComponent(quote.id)} />
            )}
            {canApprove && (
              <div style={{ marginTop: 8 }}>
                <QuoteActionButton
                  quoteId={encodeURIComponent(quote.id)}
                  action="approve"
                  label="Approve Quote"
                  pendingLabel="Approving…"
                  style={{ borderColor: "var(--success)", color: "var(--success)" }}
                />
              </div>
            )}
            {canComplete && (
              <div style={{ marginTop: 8 }}>
                <AdminCompleteButton quoteId={encodeURIComponent(quote.id)} />
              </div>
            )}
            {canReject && (
              <div style={{ marginTop: 8 }}>
                <RejectButton quoteId={encodeURIComponent(quote.id)} />
              </div>
            )}
            {canSendEmail && (
              <div style={{ marginTop: 8 }}>
                <QuoteActionButton
                  quoteId={encodeURIComponent(quote.id)}
                  action="email"
                  label="Send Invoice Email"
                  pendingLabel="Sending…"
                  className="btn btn-ghost btn-block"
                />
              </div>
            )}
            {quote.status === "in_process" && !canAccept && !canSendEmail && (
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

          {/* Admins can set/extend the expiry date that drives "expiring soon" alerts. */}
          {isAdmin && quote.status !== "ordered" && quote.status !== "archived" && (
            <QuoteExpiryEditor
              quoteId={encodeURIComponent(quote.id)}
              currentExpiry={quote.expires}
            />
          )}

          <QuoteActions
            quoteId={encodeURIComponent(quote.id)}
            status={quote.status}
            canRequestChanges={canRequestChanges}
          />
        </div>
      </div>
    </div>
  );
}
