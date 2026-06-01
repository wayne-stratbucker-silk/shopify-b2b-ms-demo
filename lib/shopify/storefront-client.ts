const STOREFRONT_API_VERSION = "2025-04";
const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const STOREFRONT_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_TOKEN!;

const endpoint = `https://${STORE_DOMAIN}/api/${STOREFRONT_API_VERSION}/graphql.json`;

export interface BuyerContext {
  customerAccessToken?: string;
  companyLocationId?: string;
}

export async function storefrontQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
  buyer?: BuyerContext,
  tags?: string[],
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Shopify-Storefront-Access-Token": STOREFRONT_TOKEN,
  };

  // Pass buyer context via header when not using @inContext directive
  if (buyer?.customerAccessToken) {
    headers["Shopify-Storefront-Buyer-Token"] = buyer.customerAccessToken;
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({ query, variables }),
    next: tags ? { tags } : undefined,
  });

  if (!res.ok) {
    throw new Error(`Storefront API ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Storefront API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}
