import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCustomerWithCompany } from "@/lib/auth/customer-accounts";
import { companyGidToNumber } from "@/lib/b2b/credit";

// The companies the signed-in customer belongs to, from Shopify's
// companyContactProfiles (Admin API). The CompanySwitcher hides itself when
// fewer than two are returned.
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ companies: [], activeCompanyId: null });

  const customer = await getCustomerWithCompany(session.customerId).catch(() => null);
  const companies = (customer?.companyContacts ?? [])
    // Drop the synthetic "default" contact used when the store isn't on B2B.
    .filter((c) => c.company?.id && c.company.id !== "default")
    .map((c) => ({
      companyId: companyGidToNumber(c.company.id),
      companyName: c.company.name,
    }))
    .filter((c) => c.companyId > 0);

  return NextResponse.json({
    companies,
    activeCompanyId: companyGidToNumber(session.companyId),
  });
}
