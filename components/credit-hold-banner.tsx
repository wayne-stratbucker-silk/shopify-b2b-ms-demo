import { getSession } from "@/lib/auth/session";
import { getCreditLine, isOnCreditHold } from "@/lib/b2b/credit";

const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_AR_EMAIL || "ar@acme-demo.com";
const SUPPORT_PHONE = process.env.NEXT_PUBLIC_AR_PHONE || "1-800-555-0139";

/**
 * Global alert shown across the account area when the buyer's active company
 * is on credit hold. Best-effort: any lookup failure resolves to "no hold"
 * and renders nothing (never blocks the page). Credit-based ordering
 * (express checkout) is separately gated on the same signal.
 */
export async function CreditHoldBanner() {
  const session = await getSession();
  if (!session) return null;

  const credit = await getCreditLine(session);
  if (!isOnCreditHold(credit)) return null;

  const company = session.companyName || "Your company";

  return (
    <div
      role="alert"
      style={{
        background: "#fef2f2",
        border: "1px solid #fecaca",
        color: "#991b1b",
        padding: "12px 16px",
        borderRadius: "var(--radius)",
        marginBottom: 20,
        fontSize: 13,
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 700 }}>Account on credit hold</span>
      <span style={{ opacity: 0.9, flex: "1 1 320px", minWidth: 240 }}>
        {company} is currently on credit hold, so new orders can&apos;t be placed on
        payment terms. You can still browse, build quotes and lists. Contact
        accounts receivable to resolve your balance.
      </span>
      <span style={{ display: "flex", gap: 12, whiteSpace: "nowrap" }}>
        <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: "#991b1b", fontWeight: 600 }}>
          {SUPPORT_EMAIL}
        </a>
        <a href={`tel:${SUPPORT_PHONE.replace(/[^0-9+]/g, "")}`} style={{ color: "#991b1b", fontWeight: 600 }}>
          {SUPPORT_PHONE}
        </a>
      </span>
    </div>
  );
}
