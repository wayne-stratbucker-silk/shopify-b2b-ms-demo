// Server-side ERP integration point.
//
// The default adapter reads a company's credit/AR/terms from Shopify Company
// metafields (see metafield-adapter.ts). Set process.env.ACME_ERP_ADAPTER to
// "mock" for an offline/deterministic demo, or to "netsuite" | "sap" |
// "quickbooks" once those real adapters are implemented.
//
// Callers must treat a null result as a soft failure — surface a warning
// banner and allow Add-to-Cart, do NOT block the buyer.

import { mockErpAdapter } from "./mock-adapter";
import { metafieldErpAdapter } from "./metafield-adapter";
import type { CompanyFinancials, ErpAdapter } from "./types";

export type { CompanyFinancials, ErpAdapter } from "./types";

function selectAdapter(): ErpAdapter {
  // Default to the Shopify-native metafield adapter (reads b2b.* Company
  // metafields — seed with `npm run seed:credit`). `mock` stays available for
  // tests/offline demos. netsuite/sap/quickbooks are not wired yet
  // (TODO(company-track): add real adapters once the ERP contract is signed);
  // an unknown value warns and falls back to the metafield adapter rather than
  // crash, since the whole ERP path is a soft dependency (null → banner, never
  // block the buyer).
  const id = (process.env.ACME_ERP_ADAPTER ?? "metafield").toLowerCase();
  if (id === "mock") return mockErpAdapter;
  if (id === "metafield") return metafieldErpAdapter;
  console.warn(
    `[erp] ACME_ERP_ADAPTER="${id}" is not implemented; using the metafield adapter. ` +
      `Implement an adapter in lib/erp before configuring this.`,
  );
  return metafieldErpAdapter;
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
