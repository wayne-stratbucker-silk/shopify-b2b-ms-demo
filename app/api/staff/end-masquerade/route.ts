import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { IMP_COOKIE } from "@/lib/auth/impersonation";

export const dynamic = "force-dynamic";

/**
 * Exit a staff masquerade: drop the buyer session AND the impersonation grant,
 * return to the dashboard. The staff (acme_staff) session stays intact.
 */
export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(IMP_COOKIE);
  return NextResponse.json({ ok: true, redirect: "/staff" });
}
