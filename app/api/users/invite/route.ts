import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { hasPermission } from "@/lib/auth/permissions";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("user");
  if (guard) return guard;
  if (!hasPermission(session.permissions, "company.users.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!session.companyId) {
    return NextResponse.json({ error: "No company associated with account" }, { status: 400 });
  }

  const { email, firstName, lastName, role } = await req.json() as {
    email?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  };

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
  }

  // Resolve or create the Shopify customer
  const customerData = await adminQuery<{
    customers: { edges: Array<{ node: { id: string } }> };
  }>(
    `query FindCustomer($query: String!) {
      customers(first: 1, query: $query) {
        edges { node { id } }
      }
    }`,
    { query: `email:${email}` },
  ).catch(() => ({ customers: { edges: [] } }));

  let customerId: string | undefined = customerData.customers.edges[0]?.node?.id;

  if (!customerId) {
    const createData = await adminQuery<{
      customerCreate: {
        customer: { id: string } | null;
        userErrors: Array<{ message: string }>;
      };
    }>(
      `mutation CreateCustomer($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer { id }
          userErrors { message }
        }
      }`,
      {
        input: {
          email,
          firstName: firstName ?? "",
          lastName: lastName ?? "",
          emailMarketingConsent: { marketingState: "NOT_SUBSCRIBED" },
        },
      },
    );
    const errs = createData.customerCreate.userErrors;
    if (errs.length) {
      return NextResponse.json({ error: errs.map((e) => e.message).join("; ") }, { status: 422 });
    }
    customerId = createData.customerCreate.customer?.id ?? undefined;
  }

  if (!customerId) {
    return NextResponse.json({ error: "Failed to resolve customer" }, { status: 500 });
  }

  // Resolve the company location for this company
  const locationData = await adminQuery<{
    company: { locations: { edges: Array<{ node: { id: string } }> } } | null;
  }>(
    `query GetCompanyLocations($id: ID!) {
      company(id: $id) {
        locations(first: 1) { edges { node { id } } }
      }
    }`,
    { id: session.companyId },
  ).catch(() => ({ company: null }));

  const locationId = session.companyLocationId
    ?? locationData.company?.locations?.edges[0]?.node?.id;

  if (!locationId) {
    return NextResponse.json({ error: "Company has no locations" }, { status: 400 });
  }

  // Resolve role ID by name (buyer / admin)
  const roleName = (role === "admin" ? "Admin" : "Buyer");
  const roleData = await adminQuery<{
    company: {
      contactRoles: { edges: Array<{ node: { id: string; name: string } }> };
    } | null;
  }>(
    `query GetCompanyRoles($id: ID!) {
      company(id: $id) {
        contactRoles(first: 10) { edges { node { id name } } }
      }
    }`,
    { id: session.companyId },
  ).catch(() => ({ company: null }));

  const roleId = roleData.company?.contactRoles?.edges
    ?.find((e) => e.node.name.toLowerCase() === roleName.toLowerCase())
    ?.node?.id;

  // Create company contact
  const contactData = await adminQuery<{
    companyContactCreate: {
      companyContact: { id: string } | null;
      userErrors: Array<{ message: string }>;
    };
  }>(
    `mutation CreateCompanyContact($companyId: ID!, $input: CompanyContactInput!) {
      companyContactCreate(companyId: $companyId, input: $input) {
        companyContact { id }
        userErrors { message }
      }
    }`,
    {
      companyId: session.companyId,
      input: { customerId },
    },
  );

  const contactErrs = contactData.companyContactCreate.userErrors;
  if (contactErrs.length) {
    return NextResponse.json({ error: contactErrs.map((e) => e.message).join("; ") }, { status: 422 });
  }

  const contactId = contactData.companyContactCreate.companyContact?.id;

  // Assign role at location if we have both
  if (contactId && roleId) {
    await adminQuery(
      `mutation AssignRole($contactId: ID!, $roleAssignments: [CompanyContactRoleAssignment!]!) {
        companyContactAssignRoles(companyContactId: $contactId, roleAssignments: $roleAssignments) {
          userErrors { message }
        }
      }`,
      {
        contactId,
        roleAssignments: [{ companyLocationId: locationId, roleId }],
      },
    ).catch(() => null);
  }

  return NextResponse.json({ ok: true, contactId }, { status: 201 });
}
