import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession, encodeSession, decodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { getCustomerWithCompany, buildSession } from "@/lib/auth/customer-accounts";

const IMPERSONATE_ORIGINAL_COOKIE = "acme_impersonate_original";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "admin") {
    return NextResponse.json({ error: "Only admins can impersonate customers" }, { status: 403 });
  }

  let customerId: string | undefined;
  try {
    const body = await req.json() as { customerId?: string };
    customerId = body.customerId;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!customerId) {
    return NextResponse.json({ error: "customerId required" }, { status: 400 });
  }

  const customer = await getCustomerWithCompany(customerId).catch(() => null);
  if (!customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  const targetSession = buildSession(customer);
  targetSession.isImpersonated = true;

  const jar = await cookies();

  // Save original session so it can be restored when impersonation ends
  const originalToken = jar.get(SESSION_COOKIE)?.value ?? "";
  jar.set(IMPERSONATE_ORIGINAL_COOKIE, originalToken, {
    ...SESSION_COOKIE_OPTS,
    maxAge: 60 * 60, // 1-hour impersonation window
  });

  // Replace active session with the target customer's session
  jar.set(SESSION_COOKIE, encodeSession(targetSession), SESSION_COOKIE_OPTS);

  return NextResponse.json({
    ok: true,
    name: targetSession.name,
    email: targetSession.email,
    company: targetSession.companyName,
  });
}

// GET returns the impersonation target details for the banner
export async function GET() {
  const session = await getSession();
  if (!session?.isImpersonated) {
    return NextResponse.json({ impersonating: false });
  }
  return NextResponse.json({
    impersonating: true,
    name: session.name,
    email: session.email,
    company: session.companyName,
  });
}
