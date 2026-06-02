import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { jwtVerify, createRemoteJWKSet } from "jose";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const SHOP_ID = process.env.SHOPIFY_SHOP_ID!;
const CUSTOMER_ACCOUNTS_BASE =
  process.env.SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL ??
  `https://shopify.com/authentication/${SHOP_ID}`;
const SHOPIFY_JWKS = createRemoteJWKSet(
  new URL(`${CUSTOMER_ACCOUNTS_BASE}/oauth/jwks`)
);

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const jar = await cookies();
  const storedState = jar.get("oauth_state")?.value;
  const returnTo = safeReturnUrl(jar.get("oauth_return_to")?.value, "/account");

  if (error || !code || !state || state !== storedState) {
    const loginUrl = new URL("/login", APP_URL);
    loginUrl.searchParams.set("error", error ?? "auth_failed");
    return NextResponse.redirect(loginUrl);
  }

  // Clear OAuth cookies
  jar.delete("oauth_state");
  jar.delete("oauth_nonce");
  jar.delete("oauth_return_to");

  try {
    const { idToken } = await exchangeCodeForTokens(code);

    // Verify the ID token signature using Shopify's JWKS (RS256)
    const { payload } = await jwtVerify(idToken, SHOPIFY_JWKS, { algorithms: ["RS256"] });
    const sub = (payload.sub as string | undefined) ?? "";
    const customerId = sub.startsWith("gid://") ? sub : `gid://shopify/Customer/${sub}`;

    const customer = await getCustomerWithCompany(customerId);
    if (!customer) throw new Error("Customer not found");

    const session = buildSession(customer);
    const encoded = encodeSession(session);

    const response = NextResponse.redirect(new URL(returnTo, APP_URL));
    response.cookies.set(SESSION_COOKIE, encoded, SESSION_COOKIE_OPTS);
    return response;
  } catch (err) {
    console.error("Auth callback error:", err);
    const loginUrl = new URL("/login", APP_URL);
    loginUrl.searchParams.set("error", "auth_error");
    return NextResponse.redirect(loginUrl);
  }
}
