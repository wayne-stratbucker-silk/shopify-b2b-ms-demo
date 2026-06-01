// Shared ERP types — kept independent of adapter implementation so the
// rest of the app does not depend on NetSuite/SAP/QuickBooks specifics.

export interface CompanyFinancials {
  companyId: number;
  /** Approved credit ceiling. */
  creditLimit: number;
  /** Open accounts-receivable balance owed by the company. */
  arBalance: number;
  /** Negotiated terms — e.g. "Net 30", "Net 45", "Due on receipt". */
  paymentTerms: string;
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
