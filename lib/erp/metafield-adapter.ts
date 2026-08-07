import type { CompanyFinancials, ErpAdapter } from "./types";
import { adminQuery } from "@/lib/shopify/admin-client";

/**
 * Shopify-native ERP adapter — reads a company's credit/AR/terms from Company
 * metafields (namespace `b2b`) instead of a hardcoded mock. Shopify has no
 * out-of-the-box object for credit limit / AR balance, so these live in
 * metafields (seed with `npm run seed:credit`; staff can edit them in the admin):
 *
 *   b2b.credit_enabled   boolean
 *   b2b.credit_limit     number_decimal
 *   b2b.ar_balance       number_decimal
 *   b2b.payment_terms    single_line_text_field  (e.g. "Net 30")
 *   b2b.limit_purchases  boolean
 *   b2b.credit_hold      boolean
 *
 * Returns null when the company has no credit record (no credit_limit metafield)
 * — callers treat null as a soft failure (banner, never block the buyer).
 */
class MetafieldErpAdapter implements ErpAdapter {
  readonly id = "metafield" as const;

  async getCompanyFinancials(companyId: number): Promise<CompanyFinancials | null> {
    if (!companyId || companyId < 0) return null;
    const gid = `gid://shopify/Company/${companyId}`;

    const data = await adminQuery<{
      company: {
        updatedAt: string;
        creditEnabled: { value: string } | null;
        creditLimit: { value: string } | null;
        arBalance: { value: string } | null;
        paymentTerms: { value: string } | null;
        limitPurchases: { value: string } | null;
        creditHold: { value: string } | null;
      } | null;
    }>(
      `query CompanyFinancials($id: ID!) {
        company(id: $id) {
          updatedAt
          creditEnabled: metafield(namespace: "b2b", key: "credit_enabled") { value }
          creditLimit: metafield(namespace: "b2b", key: "credit_limit") { value }
          arBalance: metafield(namespace: "b2b", key: "ar_balance") { value }
          paymentTerms: metafield(namespace: "b2b", key: "payment_terms") { value }
          limitPurchases: metafield(namespace: "b2b", key: "limit_purchases") { value }
          creditHold: metafield(namespace: "b2b", key: "credit_hold") { value }
        }
      }`,
      { id: gid },
    ).catch(() => ({ company: null }));

    const c = data.company;
    // No credit_limit metafield → treat as "no ERP record" (soft null).
    if (!c || c.creditLimit?.value == null) return null;

    const num = (v: string | null | undefined, dflt = 0) => {
      const n = parseFloat(v ?? "");
      return Number.isFinite(n) ? n : dflt;
    };
    const bool = (v: string | null | undefined, dflt = false) =>
      v == null ? dflt : v === "true" || v === "1";

    return {
      companyId,
      creditEnabled: bool(c.creditEnabled?.value, true),
      creditLimit: num(c.creditLimit.value),
      arBalance: num(c.arBalance?.value),
      paymentTerms: c.paymentTerms?.value || "Net 30",
      creditHold: bool(c.creditHold?.value),
      limitPurchases: bool(c.limitPurchases?.value),
      syncedAt: c.updatedAt ?? new Date().toISOString(),
    };
  }
}

export const metafieldErpAdapter = new MetafieldErpAdapter();
export { MetafieldErpAdapter };
