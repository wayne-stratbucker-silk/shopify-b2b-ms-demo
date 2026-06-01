import { adminQuery } from "@/lib/shopify/admin-client";

// Per-company SKU mapping: stored as a JSON metafield on the Shopify Company object.
// Namespace: "b2b", key: "customer_skus"
// Value: JSON object  { "VENDOR-SKU": "CUSTOMER-SKU", ... }
//
// To populate: set this metafield in Shopify Admin on the Company record, or
// via the Admin API:
//   companyUpdate(id, { metafields: [{ namespace:"b2b", key:"customer_skus",
//     value: JSON.stringify({...}), type:"json" }] })

type SkuMap = Record<string, string>;

const cache = new Map<string, SkuMap>();

export async function getCompanySkuMap(companyId: string | undefined): Promise<SkuMap> {
  if (!companyId) return {};

  if (cache.has(companyId)) return cache.get(companyId)!;

  try {
    const data = await adminQuery<{
      company: { metafield: { value: string } | null } | null;
    }>(
      `query GetCompanySkuMap($id: ID!) {
        company(id: $id) {
          metafield(namespace: "b2b", key: "customer_skus") { value }
        }
      }`,
      { id: companyId },
    );

    const raw = data.company?.metafield?.value ?? "{}";
    const map: SkuMap = JSON.parse(raw);
    cache.set(companyId, map);
    return map;
  } catch {
    return {};
  }
}

export function lookupCustomerSku(map: SkuMap, vendorSku: string): string | undefined {
  if (!vendorSku) return undefined;
  return map[vendorSku] ?? map[vendorSku.toUpperCase()] ?? map[vendorSku.toLowerCase()] ?? undefined;
}
