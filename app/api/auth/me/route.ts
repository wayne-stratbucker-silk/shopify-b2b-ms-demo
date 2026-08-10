import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  // Whitelist the fields we expose — never leak the raw session (in particular
  // the isImpersonated flag stays server-side).
  return NextResponse.json({
    user: {
      customerId: session.customerId,
      email: session.email,
      name: session.name,
      companyId: session.companyId,
      companyName: session.companyName,
      companyExternalId: session.companyExternalId,
      companyLocationId: session.companyLocationId,
      role: session.role,
      permissions: session.permissions,
    },
  });
}
