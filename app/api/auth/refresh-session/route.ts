import { NextResponse } from "next/server";
import { getSession, encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS, type Session } from "@/lib/auth/session";
import { getCustomerWithCompany, getCustomerByEmail, buildSession } from "@/lib/auth/customer-accounts";

export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, reason: "no_session" }, { status: 401 });

  const needsRefresh = !session.companyId || !session.companyName || session.name.includes("@");
  if (!needsRefresh) return NextResponse.json({ ok: true, reason: "already_fresh" });

  try {
    // If the stored customerId has no valid numeric part, look up by email instead
    const idNumeric = session.customerId.replace(/.*Customer\//, "");
    const customer = idNumeric && /^\d+$/.test(idNumeric)
      ? await getCustomerWithCompany(session.customerId)
      : await getCustomerByEmail(session.email);

    if (!customer) return NextResponse.json({ ok: false, reason: "customer_not_found" }, { status: 404 });

    const fresh = buildSession(customer);
    const merged: Session = {
      ...session,
      customerId: fresh.customerId || session.customerId, // update to real Admin API GID
      // Prefer Admin API name; if empty, use email prefix as display name
      name: fresh.name || (session.name.includes("@") ? session.email.split("@")[0] : session.name),
      companyId: fresh.companyId ?? session.companyId,
      companyName: fresh.companyName ?? session.companyName,
      companyExternalId: fresh.companyExternalId ?? session.companyExternalId,
      companyLocationId: fresh.companyLocationId ?? session.companyLocationId,
      role: fresh.role,
      permissions: fresh.permissions,
    };

    const response = NextResponse.json({ ok: true, reason: "refreshed", companyName: merged.companyName, name: merged.name });
    response.cookies.set(SESSION_COOKIE, encodeSession(merged), SESSION_COOKIE_OPTS);
    console.info("[refresh-session] updated — name:", merged.name, "company:", merged.companyName);
    return response;
  } catch (e) {
    console.error("[refresh-session] failed:", String(e));
    return NextResponse.json({ ok: false, reason: "error" }, { status: 500 });
  }
}
