import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { checkExpressEligibility } from "@/lib/checkout/express";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  const eligibility = await checkExpressEligibility(session);
  return NextResponse.json(eligibility);
}
