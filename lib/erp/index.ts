// Server-side ERP integration point.
//
// The default adapter is a deterministic mock — swap by setting
// process.env.ACME_ERP_ADAPTER to "netsuite" | "sap" | "quickbooks" once
// those adapters are implemented. Until then this module always returns
// the mock implementation so consumers have a stable shape to build UI
// against.
//
// Callers must treat a null result as a soft failure — surface a warning
// banner and allow Add-to-Cart, do NOT block the buyer.

import { mockErpAdapter } from "./mock-adapter";
import type { CompanyFinancials, ErpAdapter } from "./types";

export type { CompanyFinancials, ErpAdapter } from "./types";

function selectAdapter(): ErpAdapter {
  const id = (process.env.ACME_ERP_ADAPTER ?? "mock").toLowerCase();
  // Only the deterministic mock is implemented today. netsuite/sap/quickbooks
  // are not wired yet (TODO(company-track): add real adapters once the ERP
  // integration contract is signed). If one is configured we warn — so a
  // misconfigured env is visible in logs — but still return the mock rather
  // than crash, since the whole ERP path is a soft dependency (see
  // getCompanyFinancials / the null-result contract above).
  if (id !== "mock") {
    console.warn(
      `[erp] ACME_ERP_ADAPTER="${id}" is not implemented; falling back to the mock adapter. ` +
        `Implement an adapter in lib/erp before configuring this.`,
    );
  }
  return mockErpAdapter;
}

let cached: ErpAdapter | null = null;
function adapter(): ErpAdapter {
  if (!cached) cached = selectAdapter();
  return cached;
}

/**
 * Server-only entrypoint used across the app to fetch a company's
 * credit / AR / terms snapshot.
 *
 * Returns null when the ERP is unreachable. Callers should:
 *   - show a soft warning banner explaining financials are temporarily
 *     unavailable
 *   - NOT block Add-to-Cart, quote requests, or other buyer actions
 */
export async function getCompanyFinancials(
  companyId: number,
): Promise<CompanyFinancials | null> {
  try {
    return await adapter().getCompanyFinancials(companyId);
  } catch {
    return null;
  }
}

/** Friendly name for the active adapter — used for diagnostic banners. */
export function getActiveErpId(): ErpAdapter["id"] {
  return adapter().id;
}
