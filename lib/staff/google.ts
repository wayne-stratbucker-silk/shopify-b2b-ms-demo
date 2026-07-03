// Google OAuth (authorization-code flow) for staff sign-in.
// Client id/secret come from env (GOOGLE_OAUTH_CLIENT_ID / _SECRET). The
// redirect URI is derived from the request origin so it works on localhost and
// production — register `${origin}/api/staff/auth/google/callback` in the
// Google Cloud console. Access is restricted by an email/domain allowlist.

const CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "";

export function googleConfigured(): boolean {
  return !!CLIENT_ID && !!CLIENT_SECRET;
}

export function googleAuthUrl(state: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface GoogleUser {
  email: string;
  name: string;
  picture?: string;
}

export async function exchangeGoogleCode(code: string, redirectUri: string): Promise<GoogleUser | null> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  }).catch(() => null);
  if (!tokenRes || !tokenRes.ok) return null;

  const tokens = (await tokenRes.json().catch(() => null)) as { access_token?: string } | null;
  if (!tokens?.access_token) return null;

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  }).catch(() => null);
  if (!infoRes || !infoRes.ok) return null;

  const info = (await infoRes.json().catch(() => null)) as
    | { email?: string; email_verified?: boolean; name?: string; picture?: string }
    | null;
  if (!info?.email || info.email_verified === false) return null;

  return { email: info.email, name: info.name ?? info.email, picture: info.picture };
}

/** Allowlist check. Denies by default when no allowlist is configured. */
export function isAllowedStaff(email: string): boolean {
  const e = email.toLowerCase();
  const emails = (process.env.STAFF_ALLOWED_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const domains = (process.env.STAFF_ALLOWED_DOMAINS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (emails.length === 0 && domains.length === 0) return false;
  if (emails.includes(e)) return true;
  return domains.includes(e.split("@")[1] ?? "");
}
