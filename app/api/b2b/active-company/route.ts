import { NextResponse } from "next/server";
import {
  getSession,
  encodeSession,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTS,
  ACTIVE_LOCATION_COOKIE_NAME,
} from "@/lib/auth/session";
import { getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { getImpersonationContext } from "@/lib/auth/impersonation";
import { companyGidToNumber } from "@/lib/b2b/credit";

// Switch the active company for a multi-company contact. Re-issues the signed
// session scoped to the selected company (role, location and permissions all
// change with the company) rather than trusting a client-supplied value.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A staff masquerade is pinned to the company it was launched for; switching
  // companies mid-impersonation would silently re-scope the impersonated session.
  if (await getImpersonationContext()) {
    return NextResponse.json({ error: "Cannot switch company while impersonating" }, { status: 403 });
  }

  const { companyId } = (await request.json().catch(() => ({}))) as { companyId?: number };
  if (companyId == null) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const customer = await getCustomerWithCompany(session.customerId).catch(() => null);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Only allow switching to a company the customer is actually a contact of.
  const target = customer.companyContacts.find(
    (c) => companyGidToNumber(c.company?.id) === Number(companyId),
  );
  if (!target?.company?.id) {
    return NextResponse.json({ error: "Not a member of that company" }, { status: 403 });
  }

  const newSession = buildSession(customer, target.company.id);
  const res = NextResponse.json({ ok: true, activeCompanyId: companyGidToNumber(newSession.companyId) });
  res.cookies.set(SESSION_COOKIE, encodeSession(newSession), SESSION_COOKIE_OPTS);
  // The previous active-location cookie belongs to the old company — clear it so
  // the new company's default location (from the re-issued session) applies.
  res.cookies.set(ACTIVE_LOCATION_COOKIE_NAME, "", { ...SESSION_COOKIE_OPTS, maxAge: 0 });
  return res;
}
