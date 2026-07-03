// White-label brand configuration — the single source of truth for brand
// identity + support contacts. Ports catalyst's brand/white-label config so a
// fork can re-brand entirely from env vars without touching source. All keys
// are NEXT_PUBLIC_ so they resolve in both server and client components.

export interface BrandConfig {
  /** Short display name, e.g. "ACME". */
  name: string;
  /** Legal entity name for documents, e.g. "ACME Industrial Supply Co.". */
  legalName: string;
  /** One-line descriptor under the logo. */
  tagline: string;
  /** General customer-support email + phone. */
  supportEmail: string;
  supportPhone: string;
  /** Accounts-receivable contact (credit holds, invoices). */
  arEmail: string;
  arPhone: string;
  /** Brand primary color (documents / print). */
  primaryColor: string;
}

export const brand: BrandConfig = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "ACME",
  legalName: process.env.NEXT_PUBLIC_BRAND_LEGAL_NAME || "ACME Industrial Supply Co.",
  tagline: process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Commercial Electrical & Lighting",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "support@acme-demo.com",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "1-800-555-0100",
  arEmail: process.env.NEXT_PUBLIC_AR_EMAIL || "ar@acme-demo.com",
  arPhone: process.env.NEXT_PUBLIC_AR_PHONE || "1-800-555-0139",
  primaryColor: process.env.NEXT_PUBLIC_BRAND_PRIMARY || "#1a3a5c",
};
