import { NextResponse } from "next/server";
import { getSession, encodeSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getCustomerWithCompany, getCustomerByEmail, buildSession } from "@/lib/auth/customer-accounts";

const COMPANY_NAME = "Acme Electric Supply";

export async function GET(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));

  // Ensure we have the real customer GID
  const idNumeric = session.customerId.replace(/.*Customer\//, "");
  const customerId = idNumeric && /^\d+$/.test(idNumeric)
    ? session.customerId
    : null;

  if (!customerId) {
    return NextResponse.json({ error: "Could not resolve customer ID" }, { status: 400 });
  }

  // 1. Fetch current tags
  const current = await adminQuery<{ customer: { tags: string[] } | null }>(
    `query($id: ID!) { customer(id: $id) { tags } }`,
    { id: customerId }
  ).catch(() => ({ customer: null }));

  const existingTags: string[] = current.customer?.tags ?? [];
  const companyTag = `company:${COMPANY_NAME}`;

  // Remove any existing company: tag, add the new one
  const newTags = [...existingTags.filter(t => !t.toLowerCase().startsWith("company:")), companyTag];

  // 2. Mutate
  const mutResult = await adminQuery<{ customerUpdate: { userErrors: Array<{ message: string }> } }>(
    `mutation UpdateTags($input: CustomerInput!) {
      customerUpdate(input: $input) {
        customer { id tags }
        userErrors { field message }
      }
    }`,
    { input: { id: customerId, tags: newTags } }
  ).catch((e) => ({ customerUpdate: { userErrors: [{ message: String(e) }] } }));

  const errors = mutResult.customerUpdate?.userErrors ?? [];
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0].message }, { status: 500 });
  }

  // 3. Refresh the session with the new company name
  try {
    const fresh = await getCustomerWithCompany(customerId).catch(() => null)
      ?? await getCustomerByEmail(session.email).catch(() => null);

    if (fresh) {
      const updated = buildSession(fresh);
      const response = NextResponse.json({ ok: true, companyName: updated.companyName, name: updated.name });
      response.cookies.set(SESSION_COOKIE, encodeSession({ ...session, ...updated }), SESSION_COOKIE_OPTS);
      return response;
    }
  } catch { /* ignore */ }

  return NextResponse.json({ ok: true, note: "tag set, session refresh needed" });
}
