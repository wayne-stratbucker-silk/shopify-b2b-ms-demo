// Shared client helper: detect a write blocked by the impersonation guard and
// surface a friendly toast. The guard (lib/auth/impersonation.ts#guardImpersonatedWrite)
// answers blocked writes with HTTP 403 + JSON { error: "Not allowed while impersonating" }.
//
// NOTE: this is wired into only a couple of write paths (add-to-cart and
// invoice-pay) as a best-effort demo — it is NOT wired into every write endpoint.

const BLOCKED_ERROR = "Not allowed while impersonating";
const BLOCKED_TOAST = "This action is blocked while impersonating.";

/**
 * If `res` is a 403 whose JSON body is the impersonation-guard error, show the
 * blocked toast and return true (caller should stop / not treat as a generic
 * error). Otherwise returns false and leaves `res` untouched.
 *
 * Accepts an already-parsed body to avoid double-reading the Response stream in
 * callers that also need `res.json()`.
 */
export function handleImpersonationBlock(
  res: Response,
  toast: (message: string, variant?: "success" | "error") => void,
  body?: { error?: string } | null,
): boolean {
  if (res.status !== 403) return false;
  if (body?.error === BLOCKED_ERROR) {
    toast(BLOCKED_TOAST, "error");
    return true;
  }
  return false;
}

export { BLOCKED_ERROR, BLOCKED_TOAST };
