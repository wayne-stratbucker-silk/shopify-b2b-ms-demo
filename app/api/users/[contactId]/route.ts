import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ contactId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasPermission(session.permissions, "company.users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { contactId } = await params;
  const decodedId = decodeURIComponent(contactId);

  const data = await adminQuery<{
    companyContactDelete: {
      deletedCompanyContactId: string | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation DeleteCompanyContact($contactId: ID!) {
      companyContactDelete(companyContactId: $contactId) {
        deletedCompanyContactId
        userErrors { message }
      }
    }`,
    { contactId: decodedId },
  );

  const errs = data.companyContactDelete.userErrors;
  if (errs.length) {
    return NextResponse.json({ error: errs.map((e) => e.message).join("; ") }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
