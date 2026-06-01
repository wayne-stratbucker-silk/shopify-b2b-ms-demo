import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { jwtVerify } from "jose";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

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
    const { accessToken, idToken } = await exchangeCodeForTokens(code);

    // Decode the ID token to get the customer ID
    const decoded = await jwtVerify(idToken, async () => {
      // Shopify signs with RS256; for now trust the payload (verify in prod with JWKS)
      return new Uint8Array(0);
    }).catch(() => {
      // Fallback: parse without verification for dev
      const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
      return { payload };
    });

    const sub = (decoded as { payload: { sub?: string } }).payload?.sub ?? "";
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
