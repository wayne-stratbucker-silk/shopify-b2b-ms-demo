import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { STAFF_MASQ_COOKIE } from "@/lib/staff/session";

export const dynamic = "force-dynamic";

/** Exit a staff masquerade: drop the buyer session, return to the dashboard. */
export async function POST() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(STAFF_MASQ_COOKIE);
  return NextResponse.json({ ok: true, redirect: "/staff" });
}
