import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth/session";
import { getAccountAlerts } from "@/lib/b2b/alerts";

export const dynamic = "force-dynamic";

const READ_COOKIE = "acme_alerts_read";
const MAX_READ_IDS = 200;

async function readSet(): Promise<Set<string>> {
  const jar = await cookies();
  const raw = jar.get(READ_COOKIE)?.value;
  if (!raw) return new Set();
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

async function writeSet(ids: Set<string>) {
  const jar = await cookies();
  // Keep the cookie bounded — retain the most recently added ids.
  const arr = Array.from(ids).slice(-MAX_READ_IDS);
  jar.set(READ_COOKIE, JSON.stringify(arr), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ alerts: [], unreadCount: 0 });

  const [alerts, read] = await Promise.all([getAccountAlerts(session), readSet()]);
  const withRead = alerts.map((a) => ({ ...a, read: read.has(a.id) }));
  const unreadCount = withRead.filter((a) => !a.read).length;
  return NextResponse.json({ alerts: withRead, unreadCount });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[] } = {};
  try { body = await req.json(); } catch { /* no body → mark all */ }

  const read = await readSet();
  const ids = Array.isArray(body.ids)
    ? body.ids
    : (await getAccountAlerts(session)).map((a) => a.id); // no ids → mark all current read
  ids.forEach((id) => read.add(String(id)));
  await writeSet(read);

  return NextResponse.json({ ok: true });
}
