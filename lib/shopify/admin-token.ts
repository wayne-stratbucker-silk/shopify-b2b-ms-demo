// Admin API access tokens via the OAuth 2.0 client credentials grant.
//
// Shopify deprecated the old "reveal token once" custom-app tokens. A custom app
// now exchanges its client id + secret for a short-lived (24h) Admin API access
// token, refreshing programmatically. Scopes are configured on the app, not
// requested here.
// https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/client-credentials-grant
//
// Pure module (process.env + fetch only) so the standalone seed scripts can import
// it too. Env is read lazily inside the functions so it works regardless of when
// the caller populates process.env (node --env-file, dotenv/config, etc.).

// Refresh a little before the 24h expiry so requests never race the boundary.
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

interface CachedToken {
  token: string;
  expiresAt: number; // epoch ms, already minus the buffer
}

let cached: CachedToken | null = null;
let inflight: Promise<string> | null = null;

async function mintToken(): Promise<CachedToken> {
  const storeDomain = process.env.SHOPIFY_STORE_DOMAIN;
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  if (!storeDomain || !clientId || !clientSecret) {
    throw new Error(
      "SHOPIFY_STORE_DOMAIN, SHOPIFY_API_KEY and SHOPIFY_API_SECRET are required to mint an Admin API token via the client credentials grant.",
    );
  }
  const res = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`client_credentials grant failed ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000 - EXPIRY_BUFFER_MS,
  };
}

/**
 * Returns a valid Admin API access token, minting/refreshing via the client
 * credentials grant as needed. Concurrent callers share one in-flight request.
 *
 * Falls back to a static SHOPIFY_ADMIN_API_TOKEN only when no client id/secret
 * is configured. Pass `forceRefresh` to discard the cache (e.g. after a 401).
 */
export async function getAdminToken(forceRefresh = false): Promise<string> {
  const clientId = process.env.SHOPIFY_API_KEY;
  const clientSecret = process.env.SHOPIFY_API_SECRET;
  const staticToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

  // Prefer client credentials; only use a static token when creds aren't set.
  if ((!clientId || !clientSecret) && staticToken) return staticToken;

  if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }
  if (!inflight) {
    inflight = mintToken()
      .then((t) => {
        cached = t;
        return t.token;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}
