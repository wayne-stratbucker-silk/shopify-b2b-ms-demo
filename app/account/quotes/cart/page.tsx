import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { QuoteCartReview } from "@/components/quote-cart-review";

export const dynamic = "force-dynamic";

export default async function QuoteCartPage() {
  const session = await getSession();
  if (!session) redirect("/login?returnTo=/account/quotes/cart");

  return (
    <div>
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Quote Cart</h1>
      <QuoteCartReview />
    </div>
  );
}
