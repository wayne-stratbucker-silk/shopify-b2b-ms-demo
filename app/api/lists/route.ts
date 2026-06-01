import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLists, createList } from "@/lib/lists/client";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const lists = await getLists(session.companyId ?? "");
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { name, description } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const result = await createList(name, session.customerId, session.companyId, description);
  return NextResponse.json(result, { status: 201 });
}
