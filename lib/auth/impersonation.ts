// Structured staff-impersonation session (Phase 3).
//
// A staff masquerade is represented by a SEPARATE HMAC-signed grant cookie
// (`acme_imp`) that lives alongside the buyer session cookie (`acme_session`).
// The grant is bound to the staff session (liveness), the buyer session
// (`impSid`), the company, and a hard expiry, and is re-authorized against the
// rep→company scoping on every read. This is deliberately NOT a boolean flag on
// the buyer session: the grant can be revoked, expired, and enforced
// independently of the buyer cookie.
//
// Import discipline: this module MUST NOT import getSession from
// lib/auth/session.ts (session.ts imports THIS module to validate impSid, so the
// reverse edge would be a cycle). It only depends on the staff session + rep
// authorization.

import { cache } from "react";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { encodeSigned, decodeSigned } from "@/lib/auth/hmac";
import { getStaffSession } from "@/lib/staff/session";
import { resolveRep, repCanImpersonate, type Rep } from "@/lib/staff/rep";

export type ImpersonationMode = "read_only" | "assist";

export interface ImpersonationGrant {
  /** Staff (rep) email that launched the masquerade — bound to the acme_staff session. */
  actorEmail: string;
  /** sales_rep metaobject GID of the acting rep. */
  actorRepId: string;
  /** Company GID the masquerade is pinned to. */
  companyId: string;
  /** Random session id, mirrored onto the buyer session as `impSid`. */
  sid: string;
  /** Epoch ms the grant was minted. */
  startedAt: number;
  /** Epoch ms hard expiry (start + IMP_MAX_AGE). */
  expiresAt: number;
  /** read_only (view) or assist (may prepare orders / edit cart / draft quotes). */
  mode: ImpersonationMode;
  /** Optional free-text reason (audit-lite). */
  reason?: string;
}

export interface ImpersonationContext {
  grant: ImpersonationGrant;
  rep: Rep;
}

/** Impersonation grant cookie name. Distinct from the buyer session cookie. */
export const IMP_COOKIE = "acme_imp";

/** Hard cap on a masquerade: 8 hours, matching a staff shift. */
export const IMP_MAX_AGE = 60 * 60 * 8;

/**
 * Cookie options for the grant. Intentionally NOT reusing SESSION_COOKIE_OPTS —
 * the grant has its own (shorter) lifetime and must not drift with the buyer
 * session's 14-day default.
 */
export const IMP_COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: IMP_MAX_AGE,
};

/** Sign a grant into the `acme_imp` cookie value. */
export function encodeGrant(grant: ImpersonationGrant): string {
  return encodeSigned(grant);
}

/** Verify + decode an `acme_imp` cookie value. Returns null if tampered/malformed. */
export function decodeGrant(token: string): ImpersonationGrant | null {
  return decodeSigned<ImpersonationGrant>(token);
}

// ─── Re-auth TTL cache ───
//
// repCanImpersonate hits the Admin API (company rep assignment). A grant is
// re-authorized on every getImpersonationContext call, so cache the predicate
// for 60s per (rep, company). FAIL CLOSED: any error resolves to not-authorized.

const REAUTH_TTL_MS = 60 * 1000;
const reauthCache = new Map<string, { ok: boolean; exp: number }>();

async function cachedRepCanImpersonate(rep: Rep, companyId: string): Promise<boolean> {
  const key = `${rep.id}:${companyId}`;
  const now = Date.now();
  const hit = reauthCache.get(key);
  if (hit && hit.exp > now) return hit.ok;
  let ok = false;
  try {
    ok = await repCanImpersonate(rep, companyId);
  } catch {
    ok = false; // fail closed
  }
  reauthCache.set(key, { ok, exp: now + REAUTH_TTL_MS });
  return ok;
}

/**
 * Resolve the current impersonation context, or null when not impersonating (or
 * when the grant is invalid/expired/revoked). Every layer FAILS CLOSED.
 *
 * Deliberately does NOT call getSession — session.ts calls THIS to validate its
 * own impSid, so calling back would recurse.
 */
export const getImpersonationContext = cache(
  async (): Promise<ImpersonationContext | null> => {
    const jar = await cookies();
    const token = jar.get(IMP_COOKIE)?.value;
    if (!token) return null;

    const grant = decodeGrant(token);
    if (!grant) return null;

    // Hard expiry.
    if (Date.now() > grant.expiresAt) return null;

    // Liveness: the staff session that launched this must still be live and match.
    const staff = await getStaffSession();
    if (!staff || staff.email.toLowerCase() !== grant.actorEmail.toLowerCase()) {
      return null;
    }

    // Re-auth: the rep must still resolve and still be authorized for the company.
    const rep = await resolveRep(grant.actorEmail);
    if (!rep) return null;
    const authorized = await cachedRepCanImpersonate(rep, grant.companyId);
    if (!authorized) return null;

    return { grant, rep };
  },
);

// ─── Write guard ───

export type WriteAction =
  | "payment"
  | "order_place"
  | "order_prepare"
  | "user"
  | "settings"
  | "address"
  | "cart"
  | "quote";

// Always denied under ANY impersonation mode — high-consequence writes a rep
// must never perform on a buyer's behalf.
const ALWAYS_DENIED: ReadonlySet<WriteAction> = new Set([
  "payment",
  "order_place",
  "user",
  "settings",
  "address",
]);

// Allowed only in "assist" mode; denied in "read_only". Rep-assisted authoring
// (prepare an order, edit the cart, draft a quote) — reversible, pre-checkout.
const ASSIST_ONLY: ReadonlySet<WriteAction> = new Set([
  "order_prepare",
  "cart",
  "quote",
]);

function blocked(action: WriteAction): Response {
  return NextResponse.json(
    { error: "Not allowed while impersonating", action },
    { status: 403 },
  );
}

/**
 * Per-route write guard. Returns null when the caller may proceed (not
 * impersonating, or an assist-permitted action in assist mode), or a 403
 * Response that the route should return immediately.
 *
 * Audit-lite: blocked attempts are logged with console.info (no metaobject
 * store this phase).
 */
export async function guardImpersonatedWrite(
  action: WriteAction,
): Promise<Response | null> {
  const ctx = await getImpersonationContext();
  if (!ctx) return null; // not impersonating → normal buyer, allowed

  if (ALWAYS_DENIED.has(action)) {
    console.info("[impersonation] blocked", { actor: ctx.grant.actorEmail, action });
    return blocked(action);
  }

  if (ASSIST_ONLY.has(action)) {
    if (ctx.grant.mode === "assist") return null;
    console.info("[impersonation] blocked", { actor: ctx.grant.actorEmail, action });
    return blocked(action);
  }

  // Unknown action — default closed.
  console.info("[impersonation] blocked", { actor: ctx.grant.actorEmail, action });
  return blocked(action);
}
