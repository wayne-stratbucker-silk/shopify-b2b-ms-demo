// Shared HMAC helper for the app's signed cookies (buyer session + impersonation
// grant). Both cookies use the SAME SESSION_SECRET so a single secret rotation
// invalidates every signed artifact at once. Format is `base64url(payload).hexSig`
// with a timing-safe signature comparison.

import { createHmac, timingSafeEqual } from "crypto";

/**
 * The signing secret for all HMAC cookies. In production a real secret is
 * required; in development it falls back to a well-known dev value.
 */
export function getSessionSecret(): string {
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

/** HMAC-SHA256 of `payload`, hex-encoded, keyed by the session secret. */
export function signPayload(payload: string): string {
  return createHmac("sha256", getSessionSecret()).update(payload).digest("hex");
}

/**
 * Encode an arbitrary JSON-serializable value into a signed token:
 * `base64url(JSON).hexSig`.
 */
export function encodeSigned<T>(value: T): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

/**
 * Verify + decode a signed token produced by encodeSigned. Returns null on any
 * malformed input or signature mismatch. Comparison is constant-time.
 */
export function decodeSigned<T>(token: string): T | null {
  try {
    const dot = token.lastIndexOf(".");
    if (dot === -1) return null;
    const payload = token.slice(0, dot);
    const sig = token.slice(dot + 1);
    const expected = signPayload(payload);
    if (expected.length !== sig.length) return null;
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as T;
  } catch {
    return null;
  }
}
