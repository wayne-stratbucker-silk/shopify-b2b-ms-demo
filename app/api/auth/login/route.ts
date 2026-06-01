import { NextResponse } from "next/server";
import { getLoginUrl } from "@/lib/auth/customer-accounts";
import { safeReturnUrl } from "@/lib/auth/safe-return-url";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const returnTo = safeReturnUrl(url.searchParams.get("returnTo"), "/account");

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  const jar = await cookies();
  jar.set("oauth_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 300 });
  jar.set("oauth_nonce", nonce, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 300 });
  jar.set("oauth_return_to", returnTo, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 300 });

  const loginUrl = getLoginUrl(state, nonce);
  return NextResponse.redirect(loginUrl);
}
