import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getAccountAlerts } from "@/lib/b2b/alerts";
import { getReadAlertIds, setReadAlertIds } from "@/lib/b2b/alert-state";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ alerts: [], unreadCount: 0 });

  const [alerts, read] = await Promise.all([
    getAccountAlerts(session),
    getReadAlertIds(session.customerId),
  ]);
  const withRead = alerts.map((a) => ({ ...a, read: read.has(a.id) }));
  const unreadCount = withRead.filter((a) => !a.read).length;
  return NextResponse.json({ alerts: withRead, unreadCount });
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { ids?: string[] } = {};
  try { body = await req.json(); } catch { /* no body → mark all */ }

  const read = await getReadAlertIds(session.customerId);
  const ids = Array.isArray(body.ids)
    ? body.ids
    : (await getAccountAlerts(session)).map((a) => a.id); // no ids → mark all current read
  ids.forEach((id) => read.add(String(id)));
  await setReadAlertIds(session.customerId, read);

  return NextResponse.json({ ok: true });
}
