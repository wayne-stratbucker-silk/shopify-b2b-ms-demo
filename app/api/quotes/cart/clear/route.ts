import { NextResponse } from "next/server";
import { guardImpersonatedWrite } from "@/lib/auth/impersonation";
import { getQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { deleteCartDraftOrder } from "@/lib/quotes/client";

export async function POST() {
  const guard = await guardImpersonatedWrite("quote");
  if (guard) return guard;

  const draftOrderId = await getQuoteCartDraftOrderId();
  if (draftOrderId) {
    await deleteCartDraftOrder(draftOrderId);
  }
  await clearQuoteCart();
  return NextResponse.redirect(new URL("/account/quotes", process.env.NEXT_PUBLIC_APP_URL!));
}
