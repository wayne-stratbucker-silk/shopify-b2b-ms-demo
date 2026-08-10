import { NextResponse } from "next/server";
import { getStaffSession } from "@/lib/staff/session";
import { listCompanyContacts } from "@/lib/staff/companies";

export const dynamic = "force-dynamic";

/**
 * Staff-only: list a company's contacts (masquerade-target picker). Guarded by
 * the acme_staff session — not by rep→company scoping, which the masquerade POST
 * enforces at the point of actually assuming a buyer session.
 */
export async function GET(req: Request) {
  const staff = await getStaffSession();
  if (!staff) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const companyId = new URL(req.url).searchParams.get("companyId");
  if (!companyId) return NextResponse.json({ error: "companyId required" }, { status: 400 });

  const contacts = await listCompanyContacts(companyId).catch(() => []);
  return NextResponse.json({ contacts });
}
