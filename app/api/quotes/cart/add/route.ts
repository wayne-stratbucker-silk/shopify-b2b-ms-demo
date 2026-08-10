import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { getQuoteCartDraftOrderId, setQuoteCartDraftOrderId } from "@/lib/quotes/quote-cart";
import { getQuote, createCartDraftOrder, updateCartDraftOrder } from "@/lib/quotes/client";
import { getProductBySku } from "@/lib/shopify/queries/products";
import { adminQuery } from "@/lib/shopify/admin-client";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const guard = await guardImpersonatedWrite("quote");
  if (guard) return guard;

  const body = await req.json() as {
    sku?: string;
    qty?: number;
    quantity?: number;
    productName?: string;
    name?: string;
    unitPrice?: number;
    imageUrl?: string;
  };

  const sku = body.sku?.trim();
  const qty = body.qty ?? body.quantity ?? 1;
  const productName = body.productName ?? body.name ?? "";
  const unitPrice = body.unitPrice ?? 0;

  if (!sku) return NextResponse.json({ error: "sku required" }, { status: 400 });

  const product = await getProductBySku(sku);
  if (!product) return NextResponse.json({ error: `Product not found: ${sku}` }, { status: 404 });

  const matchingVariant = product.variants.edges
    .map((e) => e.node)
    .find((v) => v.sku === sku) ?? product.variants.edges[0]?.node;
  if (!matchingVariant) return NextResponse.json({ error: "No variant found" }, { status: 404 });

  const newItem = {
    variantId: matchingVariant.id,
    quantity: qty,
    originalUnitPrice: String(unitPrice || parseFloat(matchingVariant.price.amount)),
    title: productName || product.title,
  };

  try {
    let draftOrderId = await getQuoteCartDraftOrderId();
    let existingQuote = draftOrderId ? await getQuote(draftOrderId).catch(() => null) : null;

    // Stale cookie (status is no longer "draft") — treat as empty cart
    if (existingQuote && existingQuote.status !== "draft") {
      existingQuote = null;
      draftOrderId = null;
    }

    if (!existingQuote || !draftOrderId) {
      let companyContactId: string | undefined;
      if (session.customerId) {
        const data = await adminQuery<{
          customer: { companyContactProfiles: Array<{ id: string }> } | null;
        }>(
          `query { customer(id: "${session.customerId}") { companyContactProfiles { id } } }`
        ).catch(() => ({ customer: null }));
        companyContactId = data.customer?.companyContactProfiles?.[0]?.id;
      }

      const created = await createCartDraftOrder(session.customerId, [newItem], {
        companyId: session.companyId,
        companyLocationId: session.companyLocationId,
        companyContactId,
      });
      await setQuoteCartDraftOrderId(created.id);
      return NextResponse.json({ ok: true, count: 1 });
    }

    // Merge into existing cart
    const current = existingQuote.quoteItems ?? [];
    const existingIdx = current.findIndex((i) => i.sku === sku);
    const updatedItems = current.map((item, idx) =>
      idx === existingIdx
        ? { variantId: item.variantId!, quantity: item.qty + qty, originalUnitPrice: String(item.listPrice), title: item.name }
        : { variantId: item.variantId!, quantity: item.qty, originalUnitPrice: String(item.listPrice), title: item.name }
    ).filter((i) => i.variantId);

    if (existingIdx === -1) {
      updatedItems.push(newItem);
    }

    await updateCartDraftOrder(draftOrderId, updatedItems);
    return NextResponse.json({ ok: true, count: updatedItems.length });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
