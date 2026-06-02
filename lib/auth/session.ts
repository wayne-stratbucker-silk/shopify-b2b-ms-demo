import { cache } from "react";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { permissionsForRole, type Permission } from "@/lib/auth/permissions";

const COOKIE = "acme_session";
const ACTIVE_LOCATION_COOKIE = "acme_active_location";

function getSessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s === "dev-secret") {
      throw new Error(
        "SESSION_SECRET must be set in production. Generate with: openssl rand -base64 64",
      );
    }
    return s;
  }
  return s || "dev-secret";
}

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
  isImpersonated?: boolean;
}

function sign(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const sig = sign(payload);
  return `${payload}.${sig}`;
}

export function decodeSession(token: string): Session | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(payload);
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as Session;
  } catch {
    return null;
  }
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
