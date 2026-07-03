// Staff (internal) session — separate from the buyer Customer-Accounts session.
// Signed HMAC cookie, mirroring lib/auth/session.ts. Staff authenticate via
// Google OAuth (see lib/staff/google.ts) and can masquerade into a company.

import { cache } from "react";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE = "acme_staff";

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!s || s === "dev-secret") {
      throw new Error("SESSION_SECRET must be set in production.");
    }
    return s;
  }
  return s || "dev-secret";
}

export interface StaffSession {
  email: string;
  name: string;
  picture?: string;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function encodeStaff(session: StaffSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeStaff(token: string): StaffSession | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = sign(payload);
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as StaffSession;
  } catch {
    return null;
  }
}

export const getStaffSession = cache(async (): Promise<StaffSession | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  return decodeStaff(token);
});

export const STAFF_COOKIE = COOKIE;
export const STAFF_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 8, // 8-hour staff shift
};

/** Cookie flag marking that the current buyer session is a staff masquerade. */
export const STAFF_MASQ_COOKIE = "acme_staff_masq";
