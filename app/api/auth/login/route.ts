import { NextResponse } from "next/server";
import { getLoginUrl, generatePKCE } from "@/lib/auth/customer-accounts";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnUrl(url.searchParams.get("returnTo"), "/account");

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");
  const { codeVerifier, codeChallenge } = generatePKCE();

  const secure = process.env.NODE_ENV === "production";
  const cookieOpts = { httpOnly: true, secure, sameSite: "lax" as const, maxAge: 300 };

  const jar = await cookies();
  jar.set("oauth_state", state, cookieOpts);
  jar.set("oauth_nonce", nonce, cookieOpts);
  jar.set("oauth_return_to", returnTo, cookieOpts);
  jar.set("oauth_code_verifier", codeVerifier, cookieOpts);

  const loginUrl = getLoginUrl(state, nonce, codeChallenge);
  return NextResponse.redirect(loginUrl);
}
