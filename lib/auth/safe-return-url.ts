const SAFE_PATHS = /^\/[a-zA-Z0-9\-_/.?=&%]+$/;

export function safeReturnUrl(returnTo: string | null | undefined, fallback = "/account"): string {
  if (!returnTo) return fallback;
  if (!SAFE_PATHS.test(returnTo)) return fallback;
  if (returnTo.startsWith("//") || returnTo.startsWith("/\\")) return fallback;
  return returnTo;
}
