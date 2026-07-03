// Lightweight in-memory rate limiter (fixed window per key). Per-instance —
// good enough to blunt abuse of sensitive endpoints in a demo/single-region
// deployment. Swap the store for Redis/Upstash for multi-instance production.

interface Bucket { count: number; resetAt: number }

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

function prune(now: number) {
  if (buckets.size < MAX_KEYS) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    prune(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }
  b.count += 1;
  if (b.count > limit) {
    return { ok: false, remaining: 0, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
  }
  return { ok: true, remaining: limit - b.count, retryAfterSec: 0 };
}

/** Best-effort client IP from proxy headers. */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/**
 * Enforce a per-IP limit for a named action. Returns a 429 Response when the
 * limit is exceeded, otherwise null (caller proceeds).
 */
export function enforceRateLimit(req: Request, name: string, limit: number, windowMs: number): Response | null {
  const { ok, retryAfterSec } = rateLimit(`${name}:${clientIp(req)}`, limit, windowMs);
  if (ok) return null;
  return new Response(JSON.stringify({ error: "Too many requests — please slow down and try again." }), {
    status: 429,
    headers: { "Content-Type": "application/json", "Retry-After": String(retryAfterSec) },
  });
}
