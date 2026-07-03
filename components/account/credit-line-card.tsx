import { type CreditLine, creditUtilization } from "@/lib/b2b/credit";

const fmt = (n: number, currency = "USD") =>
  n.toLocaleString("en-US", { style: "currency", currency, maximumFractionDigits: 0 });

function fmtSynced(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return "";
  }
}

/**
 * Credit-line summary card for the account dashboard: available credit, a
 * utilization bar, net terms and hold state. Renders nothing when there's no
 * company / ERP data; shows a muted note when terms aren't enabled.
 */
export function CreditLineCard({ credit }: { credit: CreditLine | null }) {
  if (!credit) return null;

  if (!credit.creditEnabled) {
    return (
      <div className="card">
        <div className="card-h"><h3>Credit line</h3></div>
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Payment terms aren&apos;t enabled for this account. Orders are placed by card.
        </div>
      </div>
    );
  }

  const util = creditUtilization(credit);
  const pct = Math.round(util * 100);
  const barColor = credit.creditHold
    ? "var(--danger)"
    : util >= 0.9
      ? "#d97706"
      : "var(--primary)";

  return (
    <div className="card">
      <div className="card-h" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h3>Credit line</h3>
        {credit.creditHold ? (
          <span className="status status-err">On hold</span>
        ) : (
          <span className="muted" style={{ fontSize: 12 }}>{credit.netTerms}</span>
        )}
      </div>
      <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <div className="muted" style={{ fontSize: 12 }}>Available credit</div>
          <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-.02em", color: credit.creditHold ? "var(--danger)" : "inherit" }}>
            {fmt(credit.availableCredit, credit.currency)}
          </div>
        </div>

        {/* Utilization bar */}
        <div>
          <div
            aria-hidden="true"
            style={{ height: 8, borderRadius: 999, background: "var(--line, #e5e7eb)", overflow: "hidden" }}
          >
            <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width .3s" }} />
          </div>
          <div className="row" style={{ justifyContent: "space-between", marginTop: 6, fontSize: 12 }}>
            <span className="muted">{fmt(credit.usedCredit, credit.currency)} used</span>
            <span className="muted">{fmt(credit.creditLimit, credit.currency)} limit</span>
          </div>
        </div>

        <div className="row" style={{ justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--line, #eee)", paddingTop: 10 }}>
          {credit.accountNumber ? (
            <span className="muted">Account #{credit.accountNumber}</span>
          ) : <span />}
          {credit.syncedAt && <span className="muted">Synced {fmtSynced(credit.syncedAt)}</span>}
        </div>
      </div>
    </div>
  );
}
