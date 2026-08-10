import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { getSession, encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";
import { getStaffSession } from "@/lib/staff/session";
import { resolveRep, repCanImpersonate } from "@/lib/staff/rep";
import {
  encodeGrant,
  getImpersonationContext,
  IMP_COOKIE,
  IMP_COOKIE_OPTS,
  IMP_MAX_AGE,
  type ImpersonationGrant,
} from "@/lib/auth/impersonation";
import { getCompanyContactCustomerId, listCompanyContacts } from "@/lib/staff/companies";
import { enforceRateLimit } from "@/lib/security/rate-limit";

export const dynamic = "force-dynamic";

// Whether the current buyer session is a staff masquerade (drives the banner).
// Keys masquerading/company/name/staff are kept backward-compatible with the
// banner; mode/expiresAt are additive.
export async function GET() {
  const ctx = await getImpersonationContext();
  if (!ctx) return NextResponse.json({ masquerading: false });
  const session = await getSession();
  return NextResponse.json({
    masquerading: true,
    company: session?.companyName,
    name: session?.name,
    staff: ctx.grant.actorEmail,
    mode: ctx.grant.mode,
    expiresAt: ctx.grant.expiresAt,
  });
}

// Staff-only: assume a buyer session for a company.
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, "masquerade", 10, 60_000);
  if (limited) return limited;

  // Same-origin guard: when an Origin header is present it must match this host.
  // (Absent Origin — e.g. same-origin GET-style navigations — is allowed.)
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let companyId: string | undefined;
  let requestedCustomerId: string | undefined;
  let reason: string | undefined;
  try {
    ({ companyId, customerId: requestedCustomerId, reason } = (await req.json()) as {
      companyId?: string;
      customerId?: string;
      reason?: string;
    });
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  let customerId: string | null;
  if (requestedCustomerId) {
    // A specific contact was picked — it MUST be a contact of this company.
    // Otherwise a staffer could target an arbitrary customer id via the API.
    const contacts = await listCompanyContacts(companyId);
    const isContact = contacts.some((c) => c.customerId === requestedCustomerId);
    if (!isContact) {
      return NextResponse.json({ error: "Not a contact of this company" }, { status: 403 });
    }
    customerId = requestedCustomerId;
  } else {
    // No contact chosen — fall back to the company's default contact.
    customerId = await getCompanyContactCustomerId(companyId);
  }
  if (!customerId) return NextResponse.json({ error: "No contact found for this company" }, { status: 404 });

  const customer = await getCustomerWithCompany(customerId).catch(() => null);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  // Scope the buyer session to the requested company (not just the contact's
  // first company). If it can't be scoped to that exact company, refuse and
  // issue no cookies — this prevents cross-company impersonation.
  const target = buildSession(customer, companyId);
  if (!target.companyId || target.companyId !== companyId) {
    return NextResponse.json({ error: "Company mismatch" }, { status: 403 });
  }

  // Rep→company scoping gate: the acting staff must be a resolvable rep that is
  // authorized to impersonate THIS company. Refuse (issuing no cookies) otherwise.
  const rep = await resolveRep(staff.email);
  if (!rep || !(await repCanImpersonate(rep, companyId))) {
    return NextResponse.json({ error: "Not authorized for this company" }, { status: 403 });
  }

  // A rep that can place orders may assist (prepare orders / edit cart / draft
  // quotes); otherwise the masquerade is read-only.
  const mode = rep.canPlaceOrders ? "assist" : "read_only";

  const now = Date.now();
  const grant: ImpersonationGrant = {
    actorEmail: staff.email,
    actorRepId: rep.id,
    companyId,
    sid: randomBytes(16).toString("hex"),
    startedAt: now,
    expiresAt: now + IMP_MAX_AGE * 1000,
    mode,
  };
  // Optional audit-lite reason captured from the contact picker.
  const trimmedReason = reason?.trim();
  if (trimmedReason) grant.reason = trimmedReason;
  // Bind the buyer session to the grant via its sid (NOT a boolean flag).
  target.impSid = grant.sid;

  const jar = await cookies();
  // Cap the buyer cookie to the grant's 8h lifetime so it can't outlive the grant.
  jar.set(SESSION_COOKIE, encodeSession(target), { ...SESSION_COOKIE_OPTS, maxAge: IMP_MAX_AGE });
  jar.set(IMP_COOKIE, encodeGrant(grant), IMP_COOKIE_OPTS);

  console.info("[impersonation] start", { actor: staff.email, companyId, mode });

  return NextResponse.json({ ok: true, redirect: "/account", company: target.companyName });
}
