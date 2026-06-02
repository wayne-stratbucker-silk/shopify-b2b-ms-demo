import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { jwtVerify, createRemoteJWKSet } from "jose";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://shopify-b2b-ms-demo.vercel.app";
const CLIENT_ID = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!;
const SHOP_ID = process.env.SHOPIFY_SHOP_ID!;
const CUSTOMER_ACCOUNTS_BASE =
  process.env.SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL ??
  `https://shopify.com/authentication/${SHOP_ID}`;
const SHOPIFY_JWKS = createRemoteJWKSet(
  new URL(`${CUSTOMER_ACCOUNTS_BASE}/.well-known/jwks.json`)
);

function toLoginUrl(errorCode: string): string {
  return `${APP_URL}/login?error=${errorCode}`;
}

export async function GET(req: Request) {
  // Top-level guard: nothing in this handler should cause a 500
  try {
    return await handleCallback(req);
  } catch (err) {
    console.error("[auth/callback] unhandled:", String(err));
    return NextResponse.redirect(toLoginUrl("unexpected"));
  }
}

async function handleCallback(req: Request) {
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
    console.error("[auth/callback] auth_failed — error:", error, "code:", !!code, "state match:", state === storedState, "verifier:", !!codeVerifier);
    return NextResponse.redirect(toLoginUrl(error ?? "auth_failed"));
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
    console.error("[auth/callback] token_exchange_failed:", String(e));
    return NextResponse.redirect(toLoginUrl("token_exchange_failed"));
  }

  // Validate we received an ID token
  if (!tokens.idToken || typeof tokens.idToken !== "string") {
    console.error("[auth/callback] no_id_token — token response keys:", Object.keys(tokens));
    return NextResponse.redirect(toLoginUrl("no_id_token"));
  }

  // Step 2: verify ID token signature, issuer, and audience
  let jwtPayload: Record<string, unknown>;
  try {
    const result = await jwtVerify(tokens.idToken, SHOPIFY_JWKS, {
      algorithms: ["RS256"],
      issuer: CUSTOMER_ACCOUNTS_BASE,
      audience: CLIENT_ID,
    });
    jwtPayload = result.payload as Record<string, unknown>;
  } catch (e) {
    console.error("[auth/callback] jwt_failed:", String(e));
    return NextResponse.redirect(toLoginUrl("jwt_failed"));
  }

  // Step 3: nonce validation (replay protection)
  if (storedNonce && jwtPayload["nonce"] !== storedNonce) {
    console.error("[auth/callback] nonce_mismatch");
    return NextResponse.redirect(toLoginUrl("nonce_mismatch"));
  }

  // Step 4: look up customer + company via Admin API
  const sub = typeof jwtPayload["sub"] === "string" ? jwtPayload["sub"] : "";
  const customerId = sub.startsWith("gid://") ? sub : `gid://shopify/Customer/${sub}`;

  let customer: Awaited<ReturnType<typeof getCustomerWithCompany>>;
  try {
    customer = await getCustomerWithCompany(customerId);
  } catch (e) {
    console.error("[auth/callback] customer_lookup_failed:", String(e));
    return NextResponse.redirect(toLoginUrl("customer_lookup_failed"));
  }
  if (!customer) {
    console.error("[auth/callback] customer_not_found:", customerId);
    return NextResponse.redirect(toLoginUrl("customer_not_found"));
  }

  // Build session and set cookie
  const session = buildSession(customer);
  const encoded = encodeSession(session);
  const response = NextResponse.redirect(`${APP_URL}${returnTo}`);
  response.cookies.set(SESSION_COOKIE, encoded, SESSION_COOKIE_OPTS);
  return response;
}
