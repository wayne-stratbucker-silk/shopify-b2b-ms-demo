import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { decodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";

const IMPERSONATE_ORIGINAL_COOKIE = "acme_impersonate_original";

export async function POST() {
  const jar = await cookies();
  const originalToken = jar.get(IMPERSONATE_ORIGINAL_COOKIE)?.value;

  // Clear the impersonation cookie
  jar.delete(IMPERSONATE_ORIGINAL_COOKIE);

  if (originalToken) {
    const originalSession = decodeSession(originalToken);
    if (originalSession) {
      // Restore original admin session
      const { encodeSession } = await import("@/lib/auth/session");
      jar.set(SESSION_COOKIE, encodeSession(originalSession), SESSION_COOKIE_OPTS);
      return NextResponse.json({ ok: true, restored: true });
    }
  }

  // No valid original session to restore — clear entirely and redirect to login
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true, restored: false });
}
