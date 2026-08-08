"use client";

// Interactive quotes table — mirrors the BC Catalyst accelerator's quotes UX
// (sortable columns, expiration DeadlinePill, status badges), wired to Shopify
// draft-order-backed Quotes. Column set matches the reference: Quote #, Date,
// Buyer (Company view only), Expiration, Status, Total.

import Link from "next/link";
import {
  useTableSort,
  sortRows,
  SortHeader,
  formatMoney,
  formatDate,
  DeadlinePill,
} from "@/components/account/sortable-table";
import type { Quote } from "@/types";

type SortCol = "quote" | "date" | "status" | "total";

// Quote timestamps are ISO strings; the shared sort/format helpers work in
// epoch-ms (formatDate) / epoch-seconds (DeadlinePill). Parse once per accessor
// / render so both stay SSR/CSR consistent.
const toMs = (s?: string): number => {
  if (!s) return 0;
  const t = new Date(s).getTime();
  return Number.isNaN(t) ? 0 : t;
};

const accessors: Record<SortCol, (q: Quote) => string | number> = {
  quote: (q) => q.draftOrderName || q.id,
  date: (q) => toMs(q.date),
  status: (q) => q.status,
  total: (q) => q.total,
};

export function QuotesTable({
  rows,
  showBuyer = false,
}: {
  rows: Quote[];
  // The Buyer column only makes sense on the Company view — on "My quotes" the
  // buyer is the signed-in user, so it's hidden.
  showBuyer?: boolean;
}) {
  const { sortCol, sortDir, toggleSort } = useTableSort<SortCol>("date", "desc");

  if (rows.length === 0) {
    return (
      <div className="muted" style={{ textAlign: "center", padding: "48px 24px", fontSize: 13 }}>
        No quotes yet.
      </div>
    );
  }

  const sorted = sortRows(rows, accessors[sortCol], sortDir, (q) => toMs(q.date));

  return (
    <table className="tbl tbl-mobile-cards">
      <thead>
        <tr>
          <SortHeader col="quote" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>
            Quote #
          </SortHeader>
          <SortHeader col="date" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>
            Date
          </SortHeader>
          {showBuyer && <th>Buyer</th>}
          <th>Expiration</th>
          <SortHeader col="status" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>
            Status
          </SortHeader>
          <SortHeader col="total" activeCol={sortCol} dir={sortDir} onSort={toggleSort} className="num">
            Total
          </SortHeader>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((q) => {
          const expiresMs = toMs(q.expires);
          return (
            <tr key={q.id}>
              <td className="col-primary">
                <Link
                  href={`/account/quotes/${encodeURIComponent(q.id)}`}
                  className="tbl row-link mono"
                  style={{ fontSize: 13 }}
                >
                  {q.draftOrderName || `#${q.id}`}
                </Link>
              </td>
              <td className="col-meta muted">{formatDate(toMs(q.date))}</td>
              {showBuyer && (
                <td className="col-hide">{q.buyer || "—"}</td>
              )}
              <td className="col-expiry">
                {expiresMs ? <DeadlinePill ts={Math.floor(expiresMs / 1000)} /> : <span className="muted">—</span>}
              </td>
              <td className="col-status">
                <span className={`status status-${q.statusKind}`}>{q.statusLabel}</span>
              </td>
              <td className="col-value num">{q.total > 0 ? formatMoney(q.total) : "—"}</td>
              <td className="col-action">
                <Link
                  href={`/account/quotes/${encodeURIComponent(q.id)}`}
                  className="btn btn-ghost btn-xs"
                >
                  View
                </Link>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
