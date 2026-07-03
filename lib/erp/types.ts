// Shared ERP types — kept independent of adapter implementation so the
// rest of the app does not depend on NetSuite/SAP/QuickBooks specifics.

export interface CompanyFinancials {
  companyId: number;
  /** Whether credit / payment-terms purchasing is enabled for this company. */
  creditEnabled: boolean;
  /** Approved credit ceiling. */
  creditLimit: number;
  /** Open accounts-receivable balance owed by the company. */
  arBalance: number;
  /** Negotiated terms — e.g. "Net 30", "Net 45", "Due on receipt". */
  paymentTerms: string;
  /**
   * Whether the company is on credit hold. When true, term-based ordering
   * (express checkout / pay-by-PO) should be blocked and a banner shown.
   * A Shopify Company metafield (b2b.credit_hold) can override this so staff
   * can place a hold from the admin without an ERP round-trip.
   */
  creditHold: boolean;
  /**
   * Whether to hard-block orders that exceed available credit. When false the
   * limit is advisory (surfaced in the UI but not enforced at order placement).
   */
  limitPurchases: boolean;
  /**
   * Wall-clock timestamp of the last successful sync from the ERP. Modeled
   * after a nightly batch — consumers should treat this as advisory and
   * surface it in the UI when staleness matters.
   */
  syncedAt: string;
}

export interface ErpAdapter {
  /** Identifier of the underlying ERP — useful for logging and feature flags. */
  readonly id: "mock" | "netsuite" | "sap" | "quickbooks";

  /**
   * Fetch a company's financials. Returns null when the ERP is unreachable
   * or the company has no record — callers MUST treat null as a soft failure
   * and continue (e.g. allow Add-to-Cart with a warning banner).
   */
  getCompanyFinancials(companyId: number): Promise<CompanyFinancials | null>;
}
