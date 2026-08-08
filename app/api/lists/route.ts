import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getLists, createList } from "@/lib/lists/client";
import type { ListVisibility } from "@/types";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Scope by the current user so private/shared lists honor visibility.
  const lists = await getLists(session.companyId ?? "", session.customerId);
  return NextResponse.json(lists);
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const name: string | undefined = body.name;
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const visibility: ListVisibility =
    body.visibility === "private" || body.visibility === "shared" ? body.visibility : "company";
  const sharedWith: string[] = Array.isArray(body.sharedWith) ? body.sharedWith.map(String) : [];

  const result = await createList(
    name,
    session.customerId,
    session.companyId,
    body.description,
    visibility,
    sharedWith,
  );
  return NextResponse.json(result, { status: 201 });
}
