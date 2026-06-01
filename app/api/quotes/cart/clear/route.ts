import { NextResponse } from "next/server";
import { clearQuoteCart } from "@/lib/quotes/quote-cart";

export async function POST() {
  await clearQuoteCart();
  return NextResponse.redirect(new URL("/account/quotes", process.env.NEXT_PUBLIC_APP_URL!));
}
