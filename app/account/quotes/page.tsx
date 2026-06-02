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
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--warn-fade, #fff7e8)", border: "1px solid var(--warn, #f59e0b)", borderRadius: "var(--radius-card)", marginBottom: 20, fontSize: 13 }}>
          <Icon name="alert" size={16} style={{ color: "var(--warn, #f59e0b)", flexShrink: 0 }} />
          <span>
            <strong>{soonExpiring.length} quote{soonExpiring.length > 1 ? "s" : ""}</strong>{" "}
            {soonExpiring.length > 1 ? "are" : "is"} expiring within 7 days — review and accept before{" "}
            {soonExpiring.length > 1 ? "they lapse" : "it lapses"}.
          </span>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h1 className="text-h1">Quotes</h1>
        <div style={{ display: "flex", gap: 8 }}>
          {hasQuoteCart && (
            <Link href="/account/quotes/cart" className="btn" style={{ fontSize: 13 }}>
              Quote Cart
            </Link>
          )}
          <Link href="/account/quotes/new" className="btn btn-primary" style={{ fontSize: 13 }}>
            + New Quote
          </Link>
        </div>
      </div>

      {canViewAll && (
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/account/quotes" className={`btn${!showAll ? " btn-primary" : ""}`} style={{ fontSize: 13 }}>My Quotes</Link>
          <Link href="/account/quotes?view=all" className={`btn${showAll ? " btn-primary" : ""}`} style={{ fontSize: 13 }}>All Company Quotes</Link>
        </div>
      )}

      {quotes.length === 0 ? (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--muted)" }}>
          No quotes yet.{" "}
          <Link href="/account/quotes/new" style={{ color: "var(--primary)" }}>Request your first quote →</Link>
        </div>
      ) : (
        <div className="card" style={{ overflow: "auto" }}>
          <table className="tbl" style={{ width: "100%" }}>
            <thead>
              <tr>
                <th>Quote #</th>
                <th>Date</th>
                <th>Title</th>
                <th>Status</th>
                <th>Total</th>
                <th>Expires</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id}>
                  <td style={{ fontWeight: 600 }}>{q.draftOrderName}</td>
                  <td className="text-sm">{fmtDate(q.date)}</td>
                  <td className="text-sm">{q.title || "—"}</td>
                  <td>
                    <span className={`status ${STATUS_CLS[q.status]}`}>{STATUS_LABELS[q.status]}</span>
                    {q.expires && isExpiringSoon(q.expires) && (
                      <span className="status warn" style={{ marginLeft: 6, fontSize: 10 }}>Expires soon</span>
                    )}
                  </td>
                  <td style={{ fontWeight: 600 }}>{q.total > 0 ? fmt(q.total) : "—"}</td>
                  <td className="text-sm">{q.expires ? fmtDate(q.expires) : "—"}</td>
                  <td>
                    <Link href={`/account/quotes/${encodeURIComponent(q.id)}`} className="text-sm" style={{ color: "var(--primary)" }}>
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
