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
    company: { id: string; name: string; externalId?: string | null };
    roleAssignments: Array<{
      companyLocation: { id: string; name: string };
      role: { name: string };
    }>;
  }>;
}

export async function getCustomerByEmail(email: string): Promise<CustomerInfo | null> {
  const data = await adminQuery<{
    customers: { edges: Array<{ node: { id: string; email: string; firstName: string; lastName: string; defaultAddress?: { company?: string } } }> }
  }>(
    `query GetCustomerByEmail($q: String!) {
      customers(first: 1, query: $q) {
        edges { node { id email firstName lastName defaultAddress { company } } }
      }
    }`,
    { q: `email:${email}` }
  );
  const node = data.customers?.edges?.[0]?.node;
  if (!node) return null;
  const { defaultAddress, ...rest } = node;
  return { ...rest, companyContacts: defaultAddress?.company ? [{
    id: "default",
    company: { id: "default", name: defaultAddress.company, externalId: null },
    roleAssignments: [],
  }] : [] };
}

export async function getCustomerWithCompany(customerId: string): Promise<CustomerInfo | null> {
  // Normalize to Admin API format: gid://shopify/Customer/{id}
  // The JWT sub uses gid://shopify/CustomerAccount/... — strip to numeric ID and rebuild.
  let gid: string;
  if (customerId.startsWith("gid://shopify/Customer/") && !customerId.includes("Account")) {
    gid = customerId;
  } else {
    const numericId = customerId.split("/").pop() ?? customerId;
    gid = `gid://shopify/Customer/${numericId}`;
  }

  // Guard: if the GID has no numeric ID, fall back to email-based lookup upstream
  const numericPart = gid.replace("gid://shopify/Customer/", "");
  if (!numericPart || !/^\d+$/.test(numericPart)) {
    throw new Error(`Invalid customer GID (no numeric ID): ${gid}`);
  }

  // Step 1: basic customer lookup (always works with read_customers scope)
  const basicData = await adminQuery<{ customer: { id: string; email: string; firstName: string; lastName: string; defaultAddress?: { company?: string } } | null }>(`
    query GetCustomer($id: ID!) {
      customer(id: $id) {
        id
        email
        firstName
        lastName
        defaultAddress { company }
      }
    }
  `, { id: gid });

  if (!basicData.customer) return null;
  const addressCompany = basicData.customer.defaultAddress?.company;

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
              company: { id: string; name: string; externalId?: string | null };
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
                company { id name externalId }
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
    const msg = String(e);
    if (msg.includes("doesn't exist on type") || msg.includes("undefinedField")) {
      console.warn("[customer-accounts] B2B companyContacts field not available (store not on B2B plan) — using address company fallback");
    } else {
      console.warn("[customer-accounts] B2B company query failed:", msg);
    }
  }

  // Fall back to address company when B2B contacts are unavailable
  if (companyContacts.length === 0 && addressCompany) {
    companyContacts = [{
      id: "default",
      company: { id: "default", name: addressCompany, externalId: null },
      roleAssignments: [],
    }];
  }

  const { defaultAddress: _addr, ...customerFields } = basicData.customer;
  return {
    ...customerFields,
    companyContacts,
  };
}

export function buildSession(customer: CustomerInfo): Session {
  const contact = customer.companyContacts[0];
  const firstAssignment = contact?.roleAssignments[0];
  const roleName = firstAssignment?.role?.name?.toLowerCase() ?? "buyer";
  const role: "admin" | "buyer" = roleName === "admin" ? "admin" : "buyer";

  const displayName = `${customer.firstName} ${customer.lastName}`.trim();

  return {
    customerId: customer.id,
    email: customer.email,
    name: displayName,
    companyId: contact?.company?.id,
    companyName: contact?.company?.name,
    companyExternalId: contact?.company?.externalId ?? undefined,
    companyLocationId: firstAssignment?.companyLocation?.id,
    role,
    permissions: permissionsForRole(role),
  };
}
