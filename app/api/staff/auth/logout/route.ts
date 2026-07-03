import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { STAFF_COOKIE } from "@/lib/staff/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const jar = await cookies();
  jar.delete(STAFF_COOKIE);
  return NextResponse.json({ ok: true });
}
