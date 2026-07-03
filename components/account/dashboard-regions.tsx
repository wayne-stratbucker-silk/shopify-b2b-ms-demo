import Link from "next/link";
import type { Quote, QuoteStatus, ShoppingList } from "@/types";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const QUOTE_LABEL: Partial<Record<QuoteStatus, string>> = {
  new: "Awaiting review",
  in_process: "Ready to order",
  updated_by_buyer: "Updated",
  draft: "Draft",
};
const QUOTE_CLS: Partial<Record<QuoteStatus, string>> = {
  new: "info",
  in_process: "ok",
  updated_by_buyer: "warn",
  draft: "muted",
};

/** Open (active) quotes region for the account dashboard. */
export function OpenQuotesCard({ quotes }: { quotes: Quote[] }) {
  const top = quotes.slice(0, 3);
  return (
    <div className="card">
      <div className="card-h">
        <h3>Open quotes</h3>
        <Link href="/account/quotes" style={{ fontSize: 12, color: "var(--muted)" }}>View all →</Link>
      </div>
      {top.length === 0 ? (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          No open quotes.{" "}
          <Link href="/account/quotes/new" style={{ color: "var(--primary)" }}>Request one →</Link>
        </div>
      ) : (
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {top.map((q) => (
            <Link key={q.id} href={`/account/quotes/${encodeURIComponent(q.id)}`}
                  className="row" style={{ justifyContent: "space-between", gap: 8, textDecoration: "none", color: "var(--ink)", alignItems: "center" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {q.title || q.draftOrderName}
                </div>
                <span className={`status status-${QUOTE_CLS[q.status] ?? "muted"}`} style={{ fontSize: 10 }}>
                  {QUOTE_LABEL[q.status] ?? "Open"}
                </span>
              </div>
              {q.total > 0 && <span className="num" style={{ fontSize: 13, fontWeight: 600 }}>{fmt(q.total)}</span>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Saved lists region — the buyer's fastest reorder path. */
export function SavedListsCard({ lists }: { lists: ShoppingList[] }) {
  const top = lists.slice(0, 4);
  return (
    <div className="card">
      <div className="card-h">
        <h3>Saved lists</h3>
        <Link href="/account/lists" style={{ fontSize: 12, color: "var(--muted)" }}>View all →</Link>
      </div>
      {top.length === 0 ? (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          No saved lists yet.{" "}
          <Link href="/account/quick-order" style={{ color: "var(--primary)" }}>Build one →</Link>
        </div>
      ) : (
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {top.map((l) => (
            <Link key={l.id} href={`/account/lists/${l.id.split("/").pop()}`}
                  className="row" style={{ justifyContent: "space-between", gap: 8, textDecoration: "none", color: "var(--ink)", alignItems: "center" }}>
              <span style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
              <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{l.items} item{l.items === 1 ? "" : "s"}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
