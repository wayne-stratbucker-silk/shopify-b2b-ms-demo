import { NextResponse } from "next/server";

// Stub for the BC B2B companies endpoint — returns empty list so the
// CompanySwitcher component renders nothing (it hides itself when < 2 companies).
export function GET() {
  return NextResponse.json({ companies: [], activeCompanyId: null });
}
