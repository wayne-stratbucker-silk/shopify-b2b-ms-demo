import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const addressId = decodeURIComponent(id);

  const result = await adminQuery<{
    customerAddressDelete: {
      deletedCustomerAddressId: string | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation DeleteCustomerAddress($customerAddressId: ID!) {
      customerAddressDelete(customerAddressId: $customerAddressId) {
        deletedCustomerAddressId
        userErrors { message }
      }
    }`,
    { customerAddressId: addressId }
  );

  const errs = result.customerAddressDelete.userErrors;
  if (errs.length) {
    return NextResponse.json({ error: errs.map(e => e.message).join("; ") }, { status: 422 });
  }

  return NextResponse.json({ ok: true });
}
