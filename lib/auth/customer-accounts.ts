import { randomBytes, createHash } from "crypto";
import { adminQuery } from "@/lib/shopify/admin-client";
import type { Session } from "@/lib/auth/session";
import { permissionsForRole } from "@/lib/auth/permissions";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;
const CLIENT_ID = process.env.SHOPIFY_CUSTOMER_ACCOUNT_CLIENT_ID!;

// Shopify Customer Accounts API OAuth2 endpoints
// The path identifier must be the numeric shop ID (not the myshopify.com domain name).
// Set SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL to override if needed.
const SHOP_ID = process.env.SHOPIFY_SHOP_ID!;
const CUSTOMER_ACCOUNTS_BASE =
  process.env.SHOPIFY_CUSTOMER_ACCOUNTS_BASE_URL ??
  `https://shopify.com/authentication/${SHOP_ID}`;

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = randomBytes(48).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
}

export function getLoginUrl(state: string, nonce: string, codeChallenge: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: `${APP_URL}/api/auth/callback`,
    scope: "openid email customer-account-api:full",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  return `${CUSTOMER_ACCOUNTS_BASE}/oauth/authorize?${params}`;
}

export async function exchangeCodeForTokens(code: string, codeVerifier: string): Promise<{
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
      code,
      redirect_uri: `${APP_URL}/api/auth/callback`,
      code_verifier: codeVerifier,
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

  // Step 1: basic customer lookup (always works with read_customers scope)
  const basicData = await adminQuery<{ customer: { id: string; email: string; firstName: string; lastName: string } | null }>(`
    query GetCustomer($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
      }
    }
  `, { id: gid });

  if (!basicData.customer) return null;

  // Step 2: try to fetch B2B company contacts (requires read_companies scope)
  // If this fails due to missing scopes or non-B2B store, log and continue with empty contacts.
  let companyContacts: CustomerInfo["companyContacts"] = [];
  try {
    type B2BData = {
      customer: {
        companyContacts: {
          edges: Array<{
            node: {
              id: string;
              company: { id: string; name: string };
              roleAssignments: { edges: Array<{ node: { companyLocation: { id: string; name: string }; role: { name: string } } }> };
            };
          }>;
        };
      } | null;
    };
    const b2bData = await adminQuery<B2BData>(`
      query GetCustomerCompany($id: ID!) {
        customer(id: $id) {
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

    if (b2bData.customer) {
      companyContacts = b2bData.customer.companyContacts.edges.map((e) => ({
        id: e.node.id,
        company: e.node.company,
        roleAssignments: e.node.roleAssignments.edges.map((ra) => ({
          companyLocation: ra.node.companyLocation,
          role: ra.node.role,
        })),
      }));
    }
  } catch (e) {
    console.warn("[customer-accounts] B2B company query failed (token may lack read_companies scope):", String(e));
  }

  return {
    ...basicData.customer,
    companyContacts,
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
