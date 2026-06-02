import { adminQuery } from "@/lib/shopify/admin-client";
import type { Session } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";

const STORE_DOMAIN = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_SECRET!;

// Shopify Customer Accounts API OAuth2 endpoints
// SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL can be set explicitly if the store uses a
// custom accounts URL or the default format needs overriding.
const CUSTOMER_ACCOUNTS_BASE =
  process.env.SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL ??
  `https://shopify.com/authentication/${STORE_DOMAIN.replace(/\.myshopify\.com$/, "")}`;

export function getLoginUrl(state: string, nonce: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: `${APP_URL}/api/auth/callback`,
    scope: "openid email customer-account-api:full",
    state,
    nonce,
  });
  return `${CUSTOMER_ACCOUNTS_BASE}/oauth/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}> {
  const res = await fetch(`${CUSTOMER_ACCOUNTS_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: `${APP_URL}/api/auth/callback`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Token exchange failed: ${await res.text()}`);
  }

  const data = await res.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

interface CustomerInfo {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyContacts: Array<{
    id: string;
    company: { id: string; name: string };
    roleAssignments: Array<{
      companyLocation: { id: string; name: string };
      role: { name: string };
    }>;
  }>;
}

export async function getCustomerWithCompany(customerId: string): Promise<CustomerInfo | null> {
  const gid = customerId.startsWith("gid://") ? customerId : `gid://shopify/Customer/${customerId}`;

  const data = await adminQuery<{ customer: CustomerInfo | null }>(`
    query GetCustomerWithCompany($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
        companyContacts(first: 1) {
          edges {
            node {
              id
              company { id name }
              roleAssignments(first: 10) {
                edges {
                  node {
                    companyLocation { id name }
                    role { name }
                  }
                }
              }
            }
          }
        }
      }
    }
  `, { id: gid });

  if (!data.customer) return null;

  // Flatten edges
  return {
    ...data.customer,
    companyContacts: (data.customer as unknown as {
      companyContacts: { edges: Array<{ node: unknown }> }
    }).companyContacts.edges.map((e: { node: unknown }) => {
      const contact = e.node as {
        id: string;
        company: { id: string; name: string };
        roleAssignments: { edges: Array<{ node: unknown }> };
      };
      return {
        id: contact.id,
        company: contact.company,
        roleAssignments: contact.roleAssignments.edges.map((ra: { node: unknown }) => {
          const assignment = ra.node as {
            companyLocation: { id: string; name: string };
            role: { name: string };
          };
          return {
            companyLocation: assignment.companyLocation,
            role: assignment.role,
          };
        }),
      };
    }),
  };
}

export function buildSession(customer: CustomerInfo): Session {
  const contact = customer.companyContacts[0];
  const firstAssignment = contact?.roleAssignments[0];
  const roleName = firstAssignment?.role?.name?.toLowerCase() ?? "buyer";
  const role: "admin" | "buyer" = roleName === "admin" ? "admin" : "buyer";

  return {
    customerId: customer.id,
    email: customer.email,
    name: `${customer.firstName} ${customer.lastName}`.trim(),
    companyId: contact?.company?.id,
    companyName: contact?.company?.name,
    companyLocationId: firstAssignment?.companyLocation?.id,
    role,
    permissions: permissionsForRole(role),
  };
}
