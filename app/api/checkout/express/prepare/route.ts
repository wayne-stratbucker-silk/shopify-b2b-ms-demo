import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { hasPermission } from "@/lib/auth/permissions";
import { calculateExpress } from "@/lib/checkout/express";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("order_prepare");
  if (guard) return guard;
  if (!hasPermission(session.permissions, "company.orders.create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { poNumber?: string } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  const { summary, error } = await calculateExpress(session, body.poNumber?.trim() || undefined);
  if (error) return NextResponse.json({ error }, { status: error === "error" ? 502 : 409 });
  return NextResponse.json({ summary });
}
