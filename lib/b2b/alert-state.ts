// Per-customer alert read-state, persisted in a Shopify customer metafield
// (b2b.alerts_read, a JSON array of alert ids). Replaces the browser cookie so
// "read" survives across devices and sessions. Alerts themselves are derived
// (orders / quotes / credit) — only which ones a user has dismissed is stored.

import { adminQuery } from "@/lib/shopify/admin-client";

const NS = "b2b";
const KEY = "alerts_read";
const MAX_READ = 200;

// The session customerId may be a CustomerAccount GID; the Admin API + metafield
// owner need the Customer GID. Normalize the same way getCustomerWithCompany does.
function toCustomerGid(customerId: string): string {
  if (customerId.startsWith("gid://shopify/Customer/") && !customerId.includes("Account")) {
    return customerId;
  }
  const numeric = customerId.split("/").pop() ?? customerId;
  return `gid://shopify/Customer/${numeric}`;
}

export async function getReadAlertIds(customerId: string): Promise<Set<string>> {
  const data = await adminQuery<{ customer: { metafield: { value: string } | null } | null }>(
    `query AlertsRead($id: ID!) {
      customer(id: $id) { metafield(namespace: "${NS}", key: "${KEY}") { value } }
    }`,
    { id: toCustomerGid(customerId) },
  ).catch(() => ({ customer: null }));
  const raw = data.customer?.metafield?.value;
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

export async function setReadAlertIds(customerId: string, ids: Set<string>): Promise<void> {
  // Keep it bounded — retain the most recently added ids.
  const arr = Array.from(ids).slice(-MAX_READ);
  await adminQuery<{ metafieldsSet: { userErrors: Array<{ field: string[]; message: string }> } }>(
    `mutation SetAlertsRead($mf: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $mf) { userErrors { field message } }
    }`,
    {
      mf: [{
        ownerId: toCustomerGid(customerId),
        namespace: NS,
        key: KEY,
        type: "json",
        value: JSON.stringify(arr),
      }],
    },
  ).catch(() => {});
}
