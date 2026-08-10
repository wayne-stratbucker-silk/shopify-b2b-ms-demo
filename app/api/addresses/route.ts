import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await adminQuery<{
    customer: {
      addresses: Array<{
        id: string;
        address1?: string;
        address2?: string;
        city?: string;
        province?: string;
        zip?: string;
        country?: string;
        firstName?: string;
        lastName?: string;
        company?: string;
        phone?: string;
      }>;
    } | null;
  }>(
    `query GetCustomerAddresses($id: ID!) {
      customer(id: $id) {
        addresses(first: 20) {
          id address1 address2 city province zip country firstName lastName company phone
        }
      }
    }`,
    { id: session.customerId }
  ).catch(() => ({ customer: null }));

  return NextResponse.json(data.customer?.addresses ?? []);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("address");
  if (guard) return guard;

  const body = await req.json() as {
    firstName?: string;
    lastName?: string;
    company?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    zip?: string;
    country?: string;
    phone?: string;
  };

  if (!body.address1 || !body.city || !body.zip) {
    return NextResponse.json({ error: "Address, city, and zip are required" }, { status: 400 });
  }

  // Whitelist only valid MailingAddressInput fields — extra keys (e.g. attn,
  // address_type) would fail GraphQL validation.
  const address = {
    firstName: body.firstName,
    lastName: body.lastName,
    company: body.company,
    address1: body.address1,
    address2: body.address2,
    city: body.city,
    province: body.province,
    zip: body.zip,
    country: body.country,
    phone: body.phone,
  };

  const result = await adminQuery<{
    customerAddressCreate: {
      customerAddress: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation AddCustomerAddress($customerId: ID!, $address: MailingAddressInput!) {
      customerAddressCreate(customerId: $customerId, address: $address) {
        customerAddress { id }
        userErrors { message }
      }
    }`,
    { customerId: session.customerId, address }
  );

  const errs = result.customerAddressCreate.userErrors;
  if (errs.length) {
    return NextResponse.json({ error: errs.map(e => e.message).join("; ") }, { status: 422 });
  }

  return NextResponse.json({ ok: true, id: result.customerAddressCreate.customerAddress?.id }, { status: 201 });
}
