import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getQuote, getQuotesForCompany, getQuotesForCustomer } from "@/lib/quotes/client";
import { getQuoteCartDraftOrderId } from "@/lib/quotes/quote-cart";
import { Icon } from "@/components/ui/icons";
import { QuotesTable } from "./quotes-client";
import type { Quote } from "@/types";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function isExpiringSoon(dateStr: string, withinDays = 7): boolean {
  try {
    const msLeft = new Date(dateStr).getTime() - Date.now();
    return msLeft > 0 && msLeft / 86400000 < withinDays;
  } catch { return false; }
}

const TAB_LINK = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? "var(--primary)" : "var(--muted)",
  borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
  textDecoration: "none",
  marginBottom: -1,
});

type Props = { searchParams: Promise<{ view?: string }> };

export default async function QuotesPage({ searchParams }: Props) {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/quotes");

  if (!hasPermission(session.permissions, "company.quotes.view_own") &&
      !hasPermission(session.permissions, "company.quotes.view_all")) {
    return <div className="card" style={{ padding: 40 }}>You don&apos;t have permission to view quotes.</div>;
  }

  const { view } = await searchParams;
  const canViewAll = hasPermission(session.permissions, "company.quotes.view_all");
  // Default to the user's own quotes ("My quotes" is the first/default tab); the
  // company-wide view is opt-in via ?view=company and gated on view_all.
  const currentView: "company" | "my" =
    view === "company" && canViewAll ? "company" : "my";

  const quotes: Quote[] = currentView === "company" && session.companyId
    ? await getQuotesForCompany(session.companyId).catch(() => [])
    : await getQuotesForCustomer(session.customerId).catch(() => []);

  // Active quote-cart (cookie-backed draft order) → surface a tab to jump into
  // it, with an item-count badge. Only one cheap Admin call, and only when a
  // cart exists.
  const cartDraftId = await getQuoteCartDraftOrderId().catch(() => null);
  let quoteCartCount = 0;
  if (cartDraftId) {
    const cart = await getQuote(cartDraftId).catch(() => null);
    quoteCartCount = cart?.quoteItems?.reduce((s, i) => s + (i.qty ?? 1), 0) ?? 0;
  }

  // Expiring-soon alert (Quote Ready quotes lapsing within 7 days).
  const soonExpiring = quotes.filter(
    (q) => q.expires && q.status === "in_process" && isExpiringSoon(q.expires),
  );

  // ── KPIs (mirror the invoices page tiles) ──────────────────────────────────
  const now = new Date();
  const activeStatuses = (q: Quote) => !["ordered", "expired", "archived"].includes(q.status);
  const totalCount = quotes.length;
  // MTD/YTD quote value by created date.
  const mtdValue = quotes
    .filter((q) => { const d = new Date(q.date); return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth(); })
    .reduce((s, q) => s + (q.total > 0 ? q.total : 0), 0);
  const ytdValue = quotes
    .filter((q) => new Date(q.date).getFullYear() === now.getFullYear())
    .reduce((s, q) => s + (q.total > 0 ? q.total : 0), 0);
  const orderedQuotes = quotes.filter((q) => q.status === "ordered").length;
  const openValue = quotes.filter(activeStatuses).reduce((s, q) => s + (q.total > 0 ? q.total : 0), 0);

  return (
    <div>
      {soonExpiring.length > 0 && (
        <div className="alert alert-warn" style={{ marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <Icon name="alert" size={16} style={{ flexShrink: 0 }} />
          <span>
            <strong>{soonExpiring.length} quote{soonExpiring.length > 1 ? "s" : ""}</strong>{" "}
            {soonExpiring.length > 1 ? "are" : "is"} expiring within 7 days — review and accept before{" "}
            {soonExpiring.length > 1 ? "they lapse" : "it lapses"}.
          </span>
        </div>
      )}

      {/* Page header */}
      <div className="page-h">
        <div>
          <h1>{currentView === "company" ? "Company quotes" : "My quotes"}</h1>
          <p className="sub">{totalCount} {totalCount === 1 ? "quote" : "quotes"}</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href="/account/quotes/new" className="btn btn-sm">
            <Icon name="plus" size={14} />
            New quote
          </Link>
        </div>
      </div>

      {/* Tabs — My / Company (view_all only) + Quote cart link */}
      {(canViewAll || quoteCartCount > 0) && (
        <div className="row" style={{ gap: 0, marginBottom: 20, borderBottom: "1px solid var(--line)", alignItems: "center" }}>
          {canViewAll && (
            <>
              <Link href="/account/quotes?view=my" style={TAB_LINK(currentView === "my")}>
                My quotes
              </Link>
              <Link href="/account/quotes?view=company" style={TAB_LINK(currentView === "company")}>
                Company quotes
              </Link>
            </>
          )}
          {quoteCartCount > 0 && (
            <Link
              href="/account/quotes/cart"
              style={{
                marginLeft: "auto",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 16px",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--primary)",
                textDecoration: "none",
                marginBottom: -1,
              }}
            >
              Quote cart
              <span
                style={{
                  background: "var(--primary)",
                  color: "#fff",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "1px 7px",
                  minWidth: 18,
                  textAlign: "center",
                }}
              >
                {quoteCartCount}
              </span>
            </Link>
          )}
        </div>
      )}

      {/* KPI tiles */}
      {totalCount > 0 && (
        <div className="g4" style={{ marginBottom: 24 }}>
          <div className="kpi">
            <span className="lbl">Total quotes</span>
            <span className="val">{totalCount}</span>
            <span className="delta">{openValue > 0 ? `${fmt(openValue)} in play` : "all time"}</span>
          </div>
          <div className="kpi">
            <span className="lbl">MTD quote value</span>
            <span className="val">{fmt(mtdValue)}</span>
            <span className="delta">this calendar month</span>
          </div>
          <div className="kpi">
            <span className="lbl">YTD quote value</span>
            <span className="val">{fmt(ytdValue)}</span>
            <span className="delta">this calendar year</span>
          </div>
          <div className="kpi">
            <span className="lbl">Ordered quotes</span>
            <span className="val" style={{ color: "var(--success, #16a34a)" }}>{orderedQuotes}</span>
            <span className="delta">converted to orders</span>
          </div>
        </div>
      )}

      {/* Quotes table (client-side sortable) */}
      {totalCount === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No quotes yet.{" "}
          <Link href="/account/quotes/new" style={{ color: "var(--primary)" }}>Request your first quote →</Link>
        </div>
      ) : (
        <div className="card">
          <QuotesTable rows={quotes} showBuyer={currentView === "company"} />
        </div>
      )}
    </div>
  );
}
