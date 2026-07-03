import { cookies } from "next/headers";
import { getCart } from "@/lib/shopify/queries/cart";
import Link from "next/link";
import Image from "next/image";
import { CartActions } from "./cart-actions";
import { ExpressCheckout } from "@/components/express-checkout";
import { DiscountCode } from "@/components/cart/discount-code";
import { getSession } from "@/lib/auth/session";
import { checkExpressEligibility } from "@/lib/checkout/express";

const CART_COOKIE = "shopify_cart_id";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;

  if (!cartId) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h1 className="text-h1" style={{ marginBottom: 16 }}>Your cart is empty</h1>
        <Link href="/" className="btn btn-primary">Continue shopping</Link>
      </div>
    );
  }

  const cart = await getCart(cartId).catch(() => null) as {
    id: string;
    checkoutUrl: string;
    totalQuantity: number;
    lines: { edges: Array<{ node: { id: string; quantity: number; merchandise: { id: string; sku: string; title: string; product: { title: string; handle: string; featuredImage?: { url: string; altText?: string } }; price: { amount: string; currencyCode: string } }; cost: { totalAmount: { amount: string; currencyCode: string } } } }> };
    cost: { subtotalAmount: { amount: string; currencyCode: string }; totalAmount: { amount: string; currencyCode: string } };
    discountCodes?: Array<{ code: string; applicable: boolean }>;
    discountAllocations?: Array<{ discountedAmount: { amount: string; currencyCode: string } }>;
  } | null;

  if (!cart || cart.totalQuantity === 0) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h1 className="text-h1" style={{ marginBottom: 16 }}>Your cart is empty</h1>
        <Link href="/" className="btn btn-primary">Continue shopping</Link>
      </div>
    );
  }

  const subtotal = parseFloat(cart.cost.subtotalAmount.amount);
  const currency = cart.cost.subtotalAmount.currencyCode;
  const appliedCode = cart.discountCodes?.find((d) => d.applicable)?.code;
  const savings = (cart.discountAllocations ?? []).reduce((s, d) => s + parseFloat(d.discountedAmount.amount), 0);
  const money = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  // B2B buyers on payment terms can place the order on account (express checkout)
  // instead of the hosted card checkout. Structural eligibility only — the
  // credit-limit check happens when the order is prepared/placed.
  const session = await getSession();
  const expressEligibility = await checkExpressEligibility(session);

  return (
    <div className="container section">
      <h1 className="text-h1" style={{ marginBottom: 32 }}>Shopping Cart</h1>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
        {/* Line items */}
        <div>
          {cart.lines.edges.map(({ node: line }) => (
            <div key={line.id} className="card" style={{ display: "flex", gap: 16, marginBottom: 12, padding: 16, alignItems: "center" }}>
              {line.merchandise.product.featuredImage && (
                <Image src={line.merchandise.product.featuredImage.url} alt={line.merchandise.product.featuredImage.altText ?? ""} width={80} height={80} style={{ objectFit: "contain", borderRadius: 4 }} />
              )}
              <div style={{ flex: 1 }}>
                <div className="text-h4" style={{ fontWeight: 600 }}>{line.merchandise.product.title}</div>
                {line.merchandise.title !== "Default Title" && (
                  <div className="text-sm" style={{ color: "var(--muted)" }}>{line.merchandise.title}</div>
                )}
                {line.merchandise.sku && (
                  <div className="text-xs" style={{ color: "var(--muted-2)" }}>SKU: {line.merchandise.sku}</div>
                )}
                <div className="text-sm" style={{ marginTop: 4 }}>Qty: {line.quantity}</div>
              </div>
              <div className="text-h4" style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                {new Intl.NumberFormat("en-US", { style: "currency", currency }).format(parseFloat(line.cost.totalAmount.amount))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="card" style={{ padding: 24, alignSelf: "start" }}>
          <div className="text-h3" style={{ fontWeight: 700, marginBottom: 16 }}>Order Summary</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ color: "var(--muted)" }}>Subtotal</span>
            <span style={{ fontWeight: 600 }}>{new Intl.NumberFormat("en-US", { style: "currency", currency }).format(subtotal)}</span>
          </div>
          {savings > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, color: "var(--success, #16a34a)" }}>
              <span>Discount{appliedCode ? ` (${appliedCode})` : ""}</span>
              <span style={{ fontWeight: 600 }}>−{money(savings)}</span>
            </div>
          )}
          <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>Shipping &amp; taxes calculated at checkout</div>
          <DiscountCode appliedCode={appliedCode} />
          <CartActions
            checkoutUrl={cart.checkoutUrl}
            lines={cart.lines.edges.map(({ node }) => node)}
          />
          <ExpressCheckout
            eligible={expressEligibility.eligible}
            reason={expressEligibility.reason}
            netTerms={expressEligibility.netTerms}
          />
          <Link href="/" className="btn btn-ghost btn-block" style={{ textAlign: "center", display: "block", marginTop: 8 }}>
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
