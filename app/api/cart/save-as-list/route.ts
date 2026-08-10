import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { createList, addItemToList } from "@/lib/lists/client";

interface CartLine {
  variantId: string;
  sku: string;
  quantity: number;
  productHandle: string;
  productName?: string;
}

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("cart");
  if (guard) return guard;

  const { name, lines } = await req.json() as { name?: string; lines?: CartLine[] };

  if (!name?.trim()) {
    return NextResponse.json({ error: "List name is required" }, { status: 400 });
  }
  if (!lines?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  const { id } = await createList(name.trim(), session.customerId, session.companyId);

  await Promise.all(
    lines.map((line) =>
      addItemToList(id, {
        productId: "",
        variantId: line.variantId,
        sku: line.sku,
        quantity: line.quantity,
        productHandle: line.productHandle,
        productName: line.productName,
      }),
    ),
  );

  return NextResponse.json({ ok: true, id }, { status: 201 });
}
