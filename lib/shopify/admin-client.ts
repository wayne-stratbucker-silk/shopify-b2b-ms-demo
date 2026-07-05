import { getAdminToken } from "@/lib/shopify/admin-token";

const ADMIN_API_VERSION = "2026-07";
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN!;

const endpoint = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;

export async function adminQuery<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const send = (token: string) =>
    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": token,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

  let res = await send(await getAdminToken());
  // A client-credentials token can be revoked/expire early; mint a fresh one and
  // retry once on 401 before giving up.
  if (res.status === 401) {
    res = await send(await getAdminToken(true));
  }

  if (!res.ok) {
    throw new Error(`Admin API ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Admin API errors: ${JSON.stringify(json.errors)}`);
  }
  return json.data as T;
}
