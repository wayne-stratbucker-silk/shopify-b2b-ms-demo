import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, isAllowedStaff } from "@/lib/staff/google";
import { encodeStaff, STAFF_COOKIE, STAFF_COOKIE_OPTS } from "@/lib/staff/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const expected = jar.get("staff_oauth_state")?.value;
  jar.delete("staff_oauth_state");

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${url.origin}/staff?error=oauth`);
  }

  const redirectUri = `${url.origin}/api/staff/auth/google/callback`;
  const user = await exchangeGoogleCode(code, redirectUri);
  if (!user) return NextResponse.redirect(`${url.origin}/staff?error=oauth`);
  if (!isAllowedStaff(user.email)) return NextResponse.redirect(`${url.origin}/staff?error=denied`);

  jar.set(STAFF_COOKIE, encodeStaff({ email: user.email, name: user.name, picture: user.picture }), STAFF_COOKIE_OPTS);
  return NextResponse.redirect(`${url.origin}/staff`);
}
