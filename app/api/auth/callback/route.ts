import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { jwtVerify, createRemoteJWKSet } from "jose";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!;
const SHOP_ID = process.env.SHOPIFY_SHOP_ID!;
const CUSTOMER_ACCOUNTS_BASE =
  process.env.SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL ??
  `https://shopify.com/authentication/${SHOP_ID}`;
const SHOPIFY_JWKS = createRemoteJWKSet(
  new URL(`${CUSTOMER_ACCOUNTS_BASE}/.well-known/jwks.json`)
);

function loginUrl(errorCode: string): URL {
  const u = new URL("/login", APP_URL);
  u.searchParams.set("error", errorCode);
  return u;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const jar = await cookies();
  const storedState = jar.get("oauth_state")?.value;
  const storedNonce = jar.get("oauth_nonce")?.value;
  const codeVerifier = jar.get("oauth_code_verifier")?.value;
  const returnTo = safeReturnUrl(jar.get("oauth_return_to")?.value, "/account");

  if (error || !code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(loginUrl(error ?? "auth_failed"));
  }

  // Clear all OAuth cookies before proceeding
  jar.delete("oauth_state");
  jar.delete("oauth_nonce");
  jar.delete("oauth_return_to");
  jar.delete("oauth_code_verifier");

  // Step 1: exchange auth code for tokens via PKCE
  let tokens: Awaited<ReturnType<typeof exchangeCodeForTokens>>;
  try {
    tokens = await exchangeCodeForTokens(code, codeVerifier);
  } catch (e) {
    console.error("[auth/callback] token_exchange_failed:", e);
    return NextResponse.redirect(loginUrl("token_exchange_failed"));
  }

  // Step 2: verify ID token signature, issuer, and audience
  let jwtPayload: Awaited<ReturnType<typeof jwtVerify>>["payload"];
  try {
    ({ payload: jwtPayload } = await jwtVerify(tokens.idToken, SHOPIFY_JWKS, {
      algorithms: ["RS256"],
      issuer: CUSTOMER_ACCOUNTS_BASE,
      audience: CLIENT_ID,
    }));
  } catch (e) {
    console.error("[auth/callback] jwt_failed:", e);
    return NextResponse.redirect(loginUrl("jwt_failed"));
  }

  // Step 3: nonce validation (replay protection)
  if (storedNonce && jwtPayload.nonce !== storedNonce) {
    console.error("[auth/callback] nonce_mismatch");
    return NextResponse.redirect(loginUrl("nonce_mismatch"));
  }

  // Step 4: look up customer + company via Admin API
  const sub = (jwtPayload.sub as string | undefined) ?? "";
  const customerId = sub.startsWith("gid://") ? sub : `gid://shopify/Customer/${sub}`;
  let customer: Awaited<ReturnType<typeof getCustomerWithCompany>>;
  try {
    customer = await getCustomerWithCompany(customerId);
  } catch (e) {
    console.error("[auth/callback] customer_lookup_failed:", e);
    return NextResponse.redirect(loginUrl("customer_lookup_failed"));
  }
  if (!customer) {
    console.error("[auth/callback] customer_not_found:", customerId);
    return NextResponse.redirect(loginUrl("customer_not_found"));
  }

  // Build session and set cookie
  const session = buildSession(customer);
  const encoded = encodeSession(session);
  const response = NextResponse.redirect(new URL(returnTo, APP_URL));
  response.cookies.set(SESSION_COOKIE, encoded, SESSION_COOKIE_OPTS);
  return response;
}
