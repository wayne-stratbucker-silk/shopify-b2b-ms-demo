// Express checkout on terms (pay-by-PO) — Shopify-native.
//
// Places a B2B order on payment terms WITHOUT the interactive hosted checkout,
// using the company location's default addresses, the buyer's PO number and
// the location's payment-terms template. This is the Shopify equivalent of
// catalyst's BigCommerce "express checkout" — but instead of Checkout V3 + V2
// order hacks + staff_notes PO stashing, it's just:
//   draftOrderCalculate (review) → draftOrderCreate + draftOrderComplete(paymentPending)
// PO number and payment terms are first-class fields on the draft order, so
// nothing needs to be stashed or reconciled afterward.

import { cache } from "react";
import { cookies } from "next/headers";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getCart } from "@/lib/shopify/queries/cart";
import { completeDraftOrder } from "@/lib/quotes/client";
import { getCreditLine, exceedsCredit, isOnCreditHold, type CreditLine } from "@/lib/b2b/credit";
import type { Session } from "@/lib/auth/session";

const CART_COOKIE = "shopify_cart_id";
const EXPRESS_TAG = "b2b-express";

export type ExpressFailReason =
  | "not_b2b"
  | "no_permission"
  | "credit_disabled"
  | "credit_hold"
  | "no_address"
  | "empty_cart"
  | "credit_exceeded"
  | "error";

export interface ExpressEligibility {
  eligible: boolean;
  reason?: ExpressFailReason;
  /** Human-friendly net terms label, when known (e.g. "Net 30"). */
  netTerms?: string;
}

export interface ExpressAddress {
  name: string;
  company?: string;
  lines: string[];
}

export interface ExpressLine {
  variantId: string;
  quantity: number;
  originalUnitPrice: string;
  title: string;
  sku?: string;
}

export interface ExpressSummary {
  lines: Array<{ title: string; sku?: string; quantity: number; unitPrice: number; total: number }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
  netTerms?: string;
  billingAddress?: ExpressAddress;
  shippingAddress?: ExpressAddress;
  poNumber?: string;
  /** Set when a hard credit limit would be exceeded by this order. */
  creditExceeded?: boolean;
  availableCredit?: number;
}

interface MailingAddressInput {
  firstName?: string; lastName?: string; company?: string;
  address1?: string; address2?: string; city?: string;
  province?: string; zip?: string; country?: string; phone?: string;
}

interface LocationContext {
  shipping?: MailingAddressInput;
  billing?: MailingAddressInput;
  paymentTermsTemplateId?: string;
  netTerms?: string;
}

type CompanyAddress = {
  firstName?: string | null; lastName?: string | null; companyName?: string | null;
  recipient?: string | null; address1?: string | null; address2?: string | null;
  city?: string | null; province?: string | null; zip?: string | null;
  country?: string | null; phone?: string | null;
} | null;

function toMailingAddress(a: CompanyAddress): MailingAddressInput | undefined {
  if (!a?.address1) return undefined;
  return {
    firstName: a.firstName ?? undefined,
    lastName: a.lastName ?? undefined,
    company: a.companyName ?? undefined,
    address1: a.address1,
    address2: a.address2 ?? undefined,
    city: a.city ?? undefined,
    province: a.province ?? undefined,
    zip: a.zip ?? undefined,
    country: a.country ?? undefined,
    phone: a.phone ?? undefined,
  };
}

function toDisplayAddress(a: MailingAddressInput | undefined): ExpressAddress | undefined {
  if (!a) return undefined;
  return {
    name: [a.firstName, a.lastName].filter(Boolean).join(" "),
    company: a.company,
    lines: [
      a.address1,
      a.address2,
      [a.city, a.province, a.zip].filter(Boolean).join(", "),
      a.country,
    ].filter((l): l is string => !!l),
  };
}

/** Company location default addresses + payment-terms template. Per-request cached. */
const getLocationContext = cache(async (companyLocationId: string): Promise<LocationContext | null> => {
  const data = await adminQuery<{
    companyLocation: {
      shippingAddress: CompanyAddress;
      billingAddress: CompanyAddress;
      buyerExperienceConfiguration: { paymentTermsTemplate: { id: string; name: string; dueInDays?: number | null } | null } | null;
    } | null;
  }>(
    `query ExpressLocationCtx($locationId: ID!) {
      companyLocation(id: $locationId) {
        shippingAddress { firstName lastName companyName recipient address1 address2 city province zip country phone }
        billingAddress { firstName lastName companyName recipient address1 address2 city province zip country phone }
        buyerExperienceConfiguration { paymentTermsTemplate { id name dueInDays } }
      }
    }`,
    { locationId: companyLocationId },
  ).catch(() => ({ companyLocation: null }));

  const loc = data.companyLocation;
  if (!loc) return null;
  const template = loc.buyerExperienceConfiguration?.paymentTermsTemplate;
  return {
    shipping: toMailingAddress(loc.shippingAddress),
    billing: toMailingAddress(loc.billingAddress),
    paymentTermsTemplateId: template?.id,
    netTerms: template?.name,
  };
});

/** Company-contact id for the signed-in customer. Matches the quotes flow (Admin API 2026-07). */
const getCompanyContactId = cache(async (customerId: string): Promise<string | undefined> => {
  const data = await adminQuery<{ customer: { companyContactProfiles: Array<{ id: string }> } | null }>(
    `query GetContactId($customerId: ID!) {
      customer(id: $customerId) { companyContactProfiles { id } }
    }`,
    { customerId },
  ).catch(() => ({ customer: null }));
  return data.customer?.companyContactProfiles?.[0]?.id;
});

/** Read the storefront cart (B2B-contextual prices) as express line items. */
const readCartLines = cache(async (session: Session): Promise<{ lines: ExpressLine[]; currency: string } | null> => {
  const jar = await cookies();
  const cartId = jar.get(CART_COOKIE)?.value;
  if (!cartId) return null;

  const cart = await getCart(cartId, session.companyLocationId ? { companyLocationId: session.companyLocationId } : undefined)
    .catch(() => null) as {
      lines: { edges: Array<{ node: {
        quantity: number;
        merchandise: { id: string; sku?: string; title: string };
        cost: { amountPerQuantity: { amount: string; currencyCode: string } };
      } }> };
    } | null;

  const edges = cart?.lines?.edges ?? [];
  if (edges.length === 0) return null;

  const lines: ExpressLine[] = edges.map(({ node }) => ({
    variantId: node.merchandise.id,
    quantity: node.quantity,
    originalUnitPrice: node.cost.amountPerQuantity.amount,
    title: node.merchandise.title,
    sku: node.merchandise.sku || undefined,
  }));
  const currency = edges[0].node.cost.amountPerQuantity.currencyCode;
  return { lines, currency };
});

function buildDraftInput(
  session: Session,
  ctx: LocationContext,
  contactId: string | undefined,
  lines: ExpressLine[],
  poNumber: string | undefined,
) {
  const nowIso = new Date().toISOString();
  return {
    lineItems: lines.map((l) => ({
      variantId: l.variantId,
      quantity: l.quantity,
      originalUnitPrice: l.originalUnitPrice,
      title: l.title,
    })),
    customerId: session.customerId,
    purchasingEntity: session.companyLocationId
      ? {
          purchasingCompany: {
            companyId: session.companyId,
            companyLocationId: session.companyLocationId,
            companyContactId: contactId,
          },
        }
      : undefined,
    poNumber: poNumber || undefined,
    shippingAddress: ctx.shipping,
    billingAddress: ctx.billing,
    paymentTerms: ctx.paymentTermsTemplateId
      ? { paymentTermsTemplateId: ctx.paymentTermsTemplateId, paymentSchedules: [{ issuedAt: nowIso }] }
      : undefined,
    tags: [EXPRESS_TAG],
  };
}

/** Structural eligibility for the express button (credit-limit check happens at prepare/place). */
export async function checkExpressEligibility(session: Session | null): Promise<ExpressEligibility> {
  if (!session?.companyId || !session.companyLocationId) return { eligible: false, reason: "not_b2b" };
  if (!session.permissions?.includes("company.orders.create")) return { eligible: false, reason: "no_permission" };

  const credit = await getCreditLine(session);
  if (credit && !credit.creditEnabled) return { eligible: false, reason: "credit_disabled" };
  if (isOnCreditHold(credit)) return { eligible: false, reason: "credit_hold" };

  const ctx = await getLocationContext(session.companyLocationId);
  if (!ctx?.shipping || !ctx.billing) return { eligible: false, reason: "no_address" };

  return { eligible: true, netTerms: ctx.netTerms ?? credit?.netTerms };
}

/** Compute the review summary via draftOrderCalculate (no persisted draft). */
export async function calculateExpress(
  session: Session,
  poNumber?: string,
): Promise<{ summary?: ExpressSummary; error?: ExpressFailReason }> {
  const elig = await checkExpressEligibility(session);
  if (!elig.eligible) return { error: elig.reason ?? "error" };

  const cart = await readCartLines(session);
  if (!cart) return { error: "empty_cart" };

  const ctx = (await getLocationContext(session.companyLocationId!))!;
  const contactId = await getCompanyContactId(session.customerId);
  const input = buildDraftInput(session, ctx, contactId, cart.lines, poNumber);

  const data = await adminQuery<{
    draftOrderCalculate: {
      calculatedDraftOrder: {
        subtotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
        totalTaxSet: { shopMoney: { amount: string } };
        totalShippingPriceSet: { shopMoney: { amount: string } };
        totalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
      } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation ExpressCalc($input: DraftOrderInput!) {
      draftOrderCalculate(input: $input) {
        calculatedDraftOrder {
          subtotalPriceSet { shopMoney { amount currencyCode } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalPriceSet { shopMoney { amount currencyCode } }
        }
        userErrors { field message }
      }
    }`,
    { input },
  ).catch((e: unknown) => {
    console.error("[express] draftOrderCalculate failed", e);
    return null;
  });

  const calc = data?.draftOrderCalculate?.calculatedDraftOrder;
  if (!calc) return { error: "error" };

  const total = parseFloat(calc.totalPriceSet.shopMoney.amount);
  const credit: CreditLine | null = await getCreditLine(session);
  const creditExceeded = exceedsCredit(credit, total);

  return {
    summary: {
      lines: cart.lines.map((l) => ({
        title: l.title,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: parseFloat(l.originalUnitPrice),
        total: parseFloat(l.originalUnitPrice) * l.quantity,
      })),
      subtotal: parseFloat(calc.subtotalPriceSet.shopMoney.amount),
      tax: parseFloat(calc.totalTaxSet.shopMoney.amount),
      shipping: parseFloat(calc.totalShippingPriceSet.shopMoney.amount),
      total,
      currency: calc.totalPriceSet.shopMoney.currencyCode,
      netTerms: ctx.netTerms ?? credit?.netTerms,
      billingAddress: toDisplayAddress(ctx.billing),
      shippingAddress: toDisplayAddress(ctx.shipping),
      poNumber: poNumber || undefined,
      creditExceeded,
      availableCredit: credit?.availableCredit,
    },
  };
}

/** Place the order on terms: draftOrderCreate + draftOrderComplete(paymentPending). */
export async function placeExpress(
  session: Session,
  poNumber?: string,
): Promise<{ orderId?: string; orderName?: string; invoicePath?: string; error?: ExpressFailReason; message?: string }> {
  const elig = await checkExpressEligibility(session);
  if (!elig.eligible) return { error: elig.reason ?? "error" };

  const cart = await readCartLines(session);
  if (!cart) return { error: "empty_cart" };

  const ctx = (await getLocationContext(session.companyLocationId!))!;
  const contactId = await getCompanyContactId(session.customerId);
  const input = buildDraftInput(session, ctx, contactId, cart.lines, poNumber);

  // Re-check the hard credit limit against the true total before creating anything.
  const subtotal = cart.lines.reduce((s, l) => s + parseFloat(l.originalUnitPrice) * l.quantity, 0);
  const credit = await getCreditLine(session);
  if (exceedsCredit(credit, subtotal)) return { error: "credit_exceeded" };

  const created = await adminQuery<{
    draftOrderCreate: {
      draftOrder: { id: string } | null;
      userErrors: Array<{ field: string[]; message: string }>;
    };
  }>(
    `mutation ExpressCreate($input: DraftOrderInput!) {
      draftOrderCreate(input: $input) {
        draftOrder { id }
        userErrors { field message }
      }
    }`,
    { input },
  ).catch((e: unknown) => {
    console.error("[express] draftOrderCreate failed", e);
    return null;
  });

  const errs = created?.draftOrderCreate?.userErrors ?? [];
  const draftId = created?.draftOrderCreate?.draftOrder?.id;
  if (!draftId) return { error: "error", message: errs[0]?.message };

  try {
    const order = await completeDraftOrder(draftId, true);
    const numericId = order.orderId.split("/").pop();
    return { orderId: order.orderId, orderName: order.orderName, invoicePath: `/account/invoices/${numericId}` };
  } catch (e) {
    console.error("[express] draftOrderComplete failed", e);
    return { error: "error", message: e instanceof Error ? e.message : undefined };
  }
}
