import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { getStaffSession, STAFF_MASQ_COOKIE } from "@/lib/staff/session";
import { getCompanyContactCustomerId } from "@/lib/staff/companies";

export const dynamic = "force-dynamic";

// Whether the current buyer session is a staff masquerade (drives the banner).
export async function GET() {
  const session = await getSession();
  const jar = await cookies();
  const masq = jar.get(STAFF_MASQ_COOKIE)?.value;
  if (!session?.isImpersonated || !masq) return NextResponse.json({ masquerading: false });
  return NextResponse.json({
    masquerading: true,
    company: session.companyName,
    name: session.name,
    staff: masq,
  });
}

// Staff-only: assume a buyer session for a company.
export async function POST(req: Request) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let companyId: string | undefined;
  try {
    ({ companyId } = (await req.json()) as { companyId?: string });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const customerId = await getCompanyContactCustomerId(companyId);
  if (!customerId) return NextResponse.json({ error: "No contact found for this company" }, { status: 404 });

  const customer = await getCustomerWithCompany(customerId).catch(() => null);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const target = buildSession(customer);
  target.isImpersonated = true;

  const jar = await cookies();
  jar.set(SESSION_COOKIE, encodeSession(target), SESSION_COOKIE_OPTS);
  jar.set(STAFF_MASQ_COOKIE, staff.email, { ...SESSION_COOKIE_OPTS, maxAge: 60 * 60 * 8 });

  return NextResponse.json({ ok: true, redirect: "/account", company: target.companyName });
}
