// Company credit line — the Shopify-native B2B credit/AR surface.
//
// This replaces BigCommerce B2B Edition's `companyCreditConfig` /
// `/companies/{id}/credit` REST paths. The system of record for the credit
// limit, AR balance and terms is the ERP adapter (see lib/erp). On top of
// that, a Shopify Company metafield (b2b.credit_hold) lets staff place a
// company on hold from the Shopify admin without an ERP round-trip.
//
// Every consumer must treat a null result as "unknown": show a soft banner
// (see ErpStatusBanner) and NEVER hard-block the buyer on it.

import { cache } from "react";
import { getCompanyFinancials } from "@/lib/erp";
import { adminQuery } from "@/lib/shopify/admin-client";
import type { Session } from "@/lib/auth/session";

export interface CreditLine {
  /** Whether credit / payment-terms purchasing is enabled for this company. */
  creditEnabled: boolean;
  /** Approved credit ceiling. */
  creditLimit: number;
  /** Open AR balance owed by the company (what's "used" against the limit). */
  usedCredit: number;
  /** max(0, creditLimit - usedCredit). */
  availableCredit: number;
  /** Negotiated terms, e.g. "Net 30". */
  netTerms: string;
  /** ISO 4217 currency code for the figures above. */
  currency: string;
  /** Whether the company is on credit hold (blocks term-based ordering). */
  creditHold: boolean;
  /** Whether the available-credit limit is hard-enforced at order placement. */
  limitPurchases: boolean;
  /** ERP / account number for display. */
  accountNumber: string;
  /** ISO timestamp of the last ERP sync (advisory). */
  syncedAt: string;
}

const CURRENCY = "USD";

/** `gid://shopify/Company/123` → `123` (0 when unparseable). */
export function companyGidToNumber(gid: string | undefined): number {
  if (!gid) return 0;
  const n = parseInt(gid.split("/").pop() ?? "", 10);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Optional merchant override read from a Company metafield. Absent metafield
 * (or any error) → null, meaning "no override, defer to the ERP flag".
 */
async function readHoldOverride(companyId: string): Promise<boolean | null> {
  const data = await adminQuery<{
    company: { metafield: { value: string } | null } | null;
  }>(
    `query CreditHoldMeta($id: ID!) {
      company(id: $id) { metafield(namespace: "b2b", key: "credit_hold") { value } }
    }`,
    { id: companyId },
  ).catch(() => ({ company: null }));
  const v = data.company?.metafield?.value;
  if (v == null) return null;
  return v === "true" || v === "1";
}

/**
 * The active company's credit snapshot, merging the ERP (limit / AR / terms)
 * with an optional Shopify Company metafield hold override.
 *
 * Returns null when there is no company on the session or the ERP is
 * unreachable. Memoized per request via React `cache`, so the banner, the
 * dashboard card and the /api/b2b/credit route share a single fetch.
 */
export const getCreditLine = cache(
  async (session: Session | null): Promise<CreditLine | null> => {
    if (!session?.companyId) return null;
    const fin = await getCompanyFinancials(companyGidToNumber(session.companyId));
    if (!fin) return null;

    const override = await readHoldOverride(session.companyId);
    const creditHold = override ?? fin.creditHold;

    return {
      creditEnabled: fin.creditEnabled,
      creditLimit: fin.creditLimit,
      usedCredit: fin.arBalance,
      availableCredit: Math.max(0, fin.creditLimit - fin.arBalance),
      netTerms: fin.paymentTerms,
      currency: CURRENCY,
      creditHold,
      limitPurchases: fin.limitPurchases,
      accountNumber: session.companyExternalId ?? "",
      syncedAt: fin.syncedAt,
    };
  },
);

/** A company is on hold only when credit is enabled AND the hold flag is set. */
export function isOnCreditHold(credit: CreditLine | null): boolean {
  return !!credit && credit.creditEnabled && credit.creditHold;
}

/**
 * Whether an order of `total` would exceed available credit under a hard limit.
 * Advisory limits (limitPurchases false) never block, so this returns false.
 */
export function exceedsCredit(credit: CreditLine | null, total: number): boolean {
  if (!credit || !credit.creditEnabled || !credit.limitPurchases) return false;
  return total > credit.availableCredit;
}

/** Fraction of the credit limit used, clamped to [0, 1]. */
export function creditUtilization(credit: CreditLine): number {
  if (credit.creditLimit <= 0) return 0;
  return Math.min(1, Math.max(0, credit.usedCredit / credit.creditLimit));
}
