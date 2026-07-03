import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { getCreditLine } from "@/lib/b2b/credit";

export const dynamic = "force-dynamic";

// A disabled payload (never an error) so client widgets can degrade gracefully
// and we never block the buyer on a credit lookup.
const DISABLED = { creditEnabled: false } as const;

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json(DISABLED);
  if (!hasPermission(session.permissions, "company.invoices.view")) {
    return NextResponse.json(DISABLED);
  }
  const credit = await getCreditLine(session);
  return NextResponse.json(credit ?? DISABLED);
}
