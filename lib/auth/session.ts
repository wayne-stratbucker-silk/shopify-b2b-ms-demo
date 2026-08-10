import { cache } from "react";
import { cookies } from "next/headers";
import { permissionsForRole, type Permission } from "@/lib/auth/permissions";
import { encodeSigned, decodeSigned } from "@/lib/auth/hmac";
import { getImpersonationContext } from "@/lib/auth/impersonation";

const COOKIE = "acme_session";
const ACTIVE_LOCATION_COOKIE = "acme_active_location";

export interface Session {
  customerId: string;           // Shopify Customer GID: gid://shopify/Customer/...
  email: string;
  name: string;
  companyId?: string;           // Shopify Company GID
  companyName?: string;
  companyExternalId?: string;   // Company externalId (ERP / account number reference)
  companyLocationId?: string;   // Active CompanyLocation GID (set at login, switchable)
  role: "admin" | "buyer";     // From CompanyContactRole at active location
  permissions: Permission[];
  // Set only on staff-masquerade buyer sessions: the impersonation grant's `sid`.
  // getSession requires a matching valid `acme_imp` grant when this is present.
  impSid?: string;
}

export function encodeSession(session: Session): string {
  return encodeSigned(session);
}

export function decodeSession(token: string): Session | null {
  return decodeSigned<Session>(token);
}

export const getSession = cache(async (): Promise<Session | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const session = decodeSession(token);
  if (!session) return null;

  // Apply active location override from its dedicated cookie
  const activeLocation = jar.get(ACTIVE_LOCATION_COOKIE)?.value;
  if (activeLocation) {
    session.companyLocationId = activeLocation;
  }

  // Ensure permissions are always populated from role
  if (!session.permissions?.length) {
    session.permissions = permissionsForRole(session.role);
  }

  // Impersonation sessions (those minted by a staff masquerade) carry an
  // `impSid` and REQUIRE a live, matching grant. If the grant is missing,
  // expired, revoked, or bound to a different sid, the buyer session is invalid
  // — fail closed. Normal (non-impersonated) sessions skip this entirely and
  // incur no extra work / network.
  if (session.impSid) {
    const ctx = await getImpersonationContext();
    if (!ctx || ctx.grant.sid !== session.impSid) return null;
  }

  return session;
});

export const SESSION_COOKIE = COOKIE;
export const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days

export const ACTIVE_LOCATION_COOKIE_NAME = ACTIVE_LOCATION_COOKIE;
export const ACTIVE_LOCATION_MAX_AGE = 60 * 60 * 24 * 14;

const baseCookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const SESSION_COOKIE_OPTS = { ...baseCookieOpts, maxAge: SESSION_MAX_AGE };
export const ACTIVE_LOCATION_COOKIE_OPTS = { ...baseCookieOpts, maxAge: ACTIVE_LOCATION_MAX_AGE };
