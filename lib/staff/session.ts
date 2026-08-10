// Staff (internal) session — separate from the buyer Customer-Accounts session.
// Signed HMAC cookie, mirroring lib/auth/session.ts. Staff authenticate via
// Google OAuth (see lib/staff/google.ts) and can masquerade into a company.

import { cache } from "react";
import { cookies } from "next/headers";
import { encodeSigned, decodeSigned } from "@/lib/auth/hmac";

const COOKIE = "acme_staff";

export interface StaffSession {
  email: string;
  name: string;
  picture?: string;
}

export function encodeStaff(session: StaffSession): string {
  return encodeSigned(session);
}

export function decodeStaff(token: string): StaffSession | null {
  return decodeSigned<StaffSession>(token);
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
