import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getCompanyFileById } from "@/lib/b2b/company-files";

export const dynamic = "force-dynamic";

/**
 * Entitlement proxy for company-file downloads. Verifies the file's metaobject
 * belongs to the caller's active company, then redirects to the (public) CDN
 * url — so the enumerable url is never handed to a client that isn't scoped to
 * that company. Returns 404 (never 403) for missing or unentitled files.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.companyId) return new NextResponse("Not found", { status: 404 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return new NextResponse("Not found", { status: 404 });

  const file = await getCompanyFileById(id);
  if (!file || file.company !== session.companyId) {
    return new NextResponse("Not found", { status: 404 });
  }
  return NextResponse.redirect(file.url, 302);
}
