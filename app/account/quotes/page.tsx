import { redirect } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getQuotesForCompany, getQuotesForCustomer } from "@/lib/quotes/client";
import { QUOTE_CART_COOKIE } from "@/lib/quotes/quote-cart";
import { Icon } from "@/components/ui/icons";
import type { Quote, QuoteStatus } from "@/types";

function isExpiringSoon(dateStr: string, withinDays = 7): boolean {
  try {
    const msLeft = new Date(dateStr).getTime() - Date.now();
    return msLeft > 0 && msLeft / 86400000 < withinDays;
  } catch { return false; }
}

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return "—"; }
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  new: "Awaiting Review",
  in_process: "Quote Ready",
  updated_by_buyer: "Updated",
  ordered: "Ordered",
  expired: "Expired",
  archived: "Archived",
};

const STATUS_CLS: Record<QuoteStatus, string> = {
  new: "info",
  in_process: "ok",
  updated_by_buyer: "warn",
  ordered: "muted",
  expired: "err",
  archived: "muted",
};

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
  const showAll = view === "all" && canViewAll;

  const quotes: Quote[] = showAll && session.companyId
    ? await getQuotesForCompany(session.companyId).catch(() => [])
    : await getQuotesForCustomer(session.customerId).catch(() => []);

  const jar = await cookies();
  const hasQuoteCart = !!jar.get(QUOTE_CART_COOKIE)?.value;

  const soonExpiring = quotes.filter(
    (q) => q.expires && q.status === "in_process" && isExpiringSoon(q.expires),
  );

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

      <div className="page-h">
        <div>
          <h1>Quotes</h1>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {hasQuoteCart && (
            <Link href="/account/quotes/cart" className="btn btn-ghost btn-sm">
              Quote cart
            </Link>
          )}
          <Link href="/account/quotes/new" className="btn btn-sm">
            + New quote
          </Link>
        </div>
      </div>

      {canViewAll && (
        <div className="row" style={{ gap: 0, marginBottom: 20, borderBottom: "1px solid var(--line)" }}>
          <Link
            href="/account/quotes"
            style={{ padding: "10px 16px", borderBottom: `2px solid ${!showAll ? "var(--primary)" : "transparent"}`, color: !showAll ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: !showAll ? 500 : 400, textDecoration: "none" }}
          >
            My quotes
          </Link>
          <Link
            href="/account/quotes?view=all"
            style={{ padding: "10px 16px", borderBottom: `2px solid ${showAll ? "var(--primary)" : "transparent"}`, color: showAll ? "var(--primary)" : "var(--muted)", fontSize: 13, fontWeight: showAll ? 500 : 400, textDecoration: "none" }}
          >
            Company quotes
          </Link>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="card" style={{ padding: "40px 16px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          No quotes yet.{" "}
          <Link href="/account/quotes/new" style={{ color: "var(--primary)" }}>Request your first quote →</Link>
        </div>
      ) : (
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>Quote</th>
              <th>Date</th>
              <th className="col-hide">Title</th>
              <th>Status</th>
              <th className="num">Total</th>
              <th className="col-meta">Expires</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {quotes.map(q => (
              <tr key={q.id}>
                <td className="col-primary">
                  <Link href={`/account/quotes/${encodeURIComponent(q.id)}`} className="tbl row-link">
                    {q.draftOrderName}
                  </Link>
                </td>
                <td className="col-meta muted">{fmtDate(q.date)}</td>
                <td className="col-hide muted" style={{ fontSize: 12 }}>{q.title || "—"}</td>
                <td className="col-status">
                  <span className={`status status-${STATUS_CLS[q.status]}`}>{STATUS_LABELS[q.status]}</span>
                  {q.expires && isExpiringSoon(q.expires) && (
                    <span className="status status-warn" style={{ marginLeft: 6, fontSize: 10 }}>Expires soon</span>
                  )}
                </td>
                <td className="col-value num">{q.total > 0 ? fmt(q.total) : "—"}</td>
                <td className="col-meta muted">{q.expires ? fmtDate(q.expires) : "—"}</td>
                <td className="col-action">
                  <Link href={`/account/quotes/${encodeURIComponent(q.id)}`} className="btn btn-ghost btn-xs">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
