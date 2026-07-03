import type { CompanyFinancials, ErpAdapter } from "./types";

/**
 * Deterministic mock ERP adapter — returns the same financial profile for
 * the same companyId every call. Useful for demos and tests where we want
 * predictable credit / AR numbers without real ERP access.
 *
 * The numbers are intentionally varied across companies so the demo shows
 * a range of credit / AR states (healthy, near-limit, over-limit).
 */
class MockErpAdapter implements ErpAdapter {
  readonly id = "mock" as const;

  // Toggle for tests / demo controls — when true, getCompanyFinancials
  // returns null to simulate an ERP outage (Add-to-Cart should still work
  // with a banner).
  static simulateOutage = false;

  async getCompanyFinancials(companyId: number): Promise<CompanyFinancials | null> {
    if (MockErpAdapter.simulateOutage) return null;
    if (!companyId || companyId < 0) return null;

    // Deterministic per-company values. Bucket by companyId modulo a small
    // set so the demo always shows the same numbers for the same company.
    // The buckets are tuned to show a range of B2B credit states:
    //   0 healthy · 1 healthy (enforced limit) · 2 near-limit (enforced) ·
    //   3 ON CREDIT HOLD · 4 healthy (large advisory limit).
    const bucket = companyId % 5;
    const profiles: Array<Omit<CompanyFinancials, "companyId" | "syncedAt">> = [
      { creditEnabled: true, creditLimit: 50_000, arBalance: 12_450.18, paymentTerms: "Net 30", creditHold: false, limitPurchases: false },
      { creditEnabled: true, creditLimit: 100_000, arBalance: 38_900.00, paymentTerms: "Net 30", creditHold: false, limitPurchases: true },
      { creditEnabled: true, creditLimit: 250_000, arBalance: 198_223.45, paymentTerms: "Net 45", creditHold: false, limitPurchases: true },
      { creditEnabled: true, creditLimit: 25_000, arBalance: 1_245.00, paymentTerms: "Net 15", creditHold: true, limitPurchases: true },
      { creditEnabled: true, creditLimit: 500_000, arBalance: 87_400.00, paymentTerms: "Net 60", creditHold: false, limitPurchases: false },
    ];
    const profile = profiles[bucket];

    // Model a nightly batch: snap to the most recent 02:00 UTC and treat
    // that as the last sync.
    const now = new Date();
    const lastBatch = new Date(now);
    lastBatch.setUTCHours(2, 0, 0, 0);
    if (lastBatch > now) lastBatch.setUTCDate(lastBatch.getUTCDate() - 1);

    return {
      companyId,
      ...profile,
      syncedAt: lastBatch.toISOString(),
    };
  }
}

export const mockErpAdapter = new MockErpAdapter();
export { MockErpAdapter };
