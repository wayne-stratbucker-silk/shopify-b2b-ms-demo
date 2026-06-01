import { getCompanyFinancials } from "@/lib/erp";

interface Props {
  companyId: number | undefined;
}

/**
 * Renders a soft warning banner when the ERP is unreachable for the
 * current company. Per spec: do NOT block Add-to-Cart, but make the
 * stale-data state visible so buyers know credit/AR may be out of date.
 */
export async function ErpStatusBanner({ companyId }: Props) {
  if (!companyId) return null;
  const fin = await getCompanyFinancials(companyId);
  if (fin) return null; // ERP healthy — no banner

  return (
    <div
      role="status"
      style={{
        background: "#fff7ed",
        border: "1px solid #fed7aa",
        color: "#9a3412",
        padding: "10px 14px",
        borderRadius: "var(--radius)",
        marginBottom: 16,
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontWeight: 600 }}>Financials unavailable</span>
      <span style={{ opacity: 0.85 }}>
        Your credit limit and AR balance can&apos;t be loaded from our ERP right now.
        You can keep shopping; cart submissions will be reconciled when the ERP is back.
      </span>
    </div>
  );
}
