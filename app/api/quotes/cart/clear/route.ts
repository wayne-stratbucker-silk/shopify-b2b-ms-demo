import { NextResponse } from "next/server";
import { getQuoteCartDraftOrderId, clearQuoteCart } from "@/lib/quotes/quote-cart";
import { deleteCartDraftOrder } from "@/lib/quotes/client";

export async function POST() {
  const draftOrderId = await getQuoteCartDraftOrderId();
  if (draftOrderId) {
    await deleteCartDraftOrder(draftOrderId);
  }
  await clearQuoteCart();
  return NextResponse.redirect(new URL("/account/quotes", process.env.NEXT_PUBLIC_APP_URL!));
}
