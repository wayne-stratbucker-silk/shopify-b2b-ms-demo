import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteList } from "@/lib/lists/client";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteList(decodeURIComponent(id));
  return NextResponse.json({ ok: true });
}
