// Invoices, Shopify-native.
//
// In Shopify B2B there is no separate "invoice" object — a B2B invoice is an
// Order placed on payment terms. This module fetches an order as an invoice
// (line items, balances, payment schedule, transactions) and enforces that
// the order belongs to the viewer's company (IDOR guard). "Paying" an invoice
// is `orderMarkAsPaid` (see /api/account/invoices/pay), the native equivalent
// of BigCommerce's invoiceCreateBcCart flow.

import { adminQuery } from "@/lib/shopify/admin-client";
import type { Session } from "@/lib/auth/session";

interface Money {
  shopMoney: { amount: string; currencyCode?: string };
}

export interface InvoiceLineItem {
  id: string;
  title: string;
  quantity: number;
  sku?: string | null;
  originalUnitPriceSet: Money;
}

export interface InvoiceTransaction {
  id: string;
  kind: string;
  status: string;
  processedAt?: string | null;
  amountSet: Money;
}

export interface InvoiceAddress {
  name?: string | null;
  address1?: string | null;
  city?: string | null;
  province?: string | null;
  zip?: string | null;
  country?: string | null;
}

export interface InvoiceOrder {
  id: string;
  name: string;
  createdAt: string;
  processedAt?: string | null;
  displayFinancialStatus: string;
  poNumber?: string | null;
  note?: string | null;
  purchasingEntity?: {
    __typename: string;
    company?: { id: string; name: string } | null;
    location?: { id: string; name: string } | null;
    contact?: { id: string } | null;
  } | null;
  totalPriceSet: Money;
  subtotalPriceSet: Money;
  totalTaxSet: Money;
  totalShippingPriceSet: Money;
  totalOutstandingSet: Money;
  totalReceivedSet: Money;
  billingAddress?: InvoiceAddress | null;
  shippingAddress?: InvoiceAddress | null;
  lineItems: { edges: Array<{ node: InvoiceLineItem }> };
  paymentTerms?: {
    paymentTermsName?: string | null;
    paymentTermsType?: string | null;
    overdue?: boolean | null;
    paymentSchedules: { edges: Array<{ node: { dueAt?: string | null; issuedAt?: string | null; completedAt?: string | null } }> };
  } | null;
  transactions: InvoiceTransaction[];
  customer?: { firstName?: string | null; lastName?: string | null } | null;
}

/** `123` or a GID → a canonical Order GID. */
export function toOrderGid(idOrGid: string): string {
  return idOrGid.startsWith("gid://")
    ? decodeURIComponent(idOrGid)
    : `gid://shopify/Order/${idOrGid}`;
}

const INVOICE_QUERY = `query GetInvoice($id: ID!) {
  order(id: $id) {
    id name createdAt processedAt displayFinancialStatus poNumber note
    purchasingEntity {
      __typename
      ... on PurchasingCompany {
        company { id name }
        location { id name }
        contact { id }
      }
    }
    totalPriceSet { shopMoney { amount currencyCode } }
    subtotalPriceSet { shopMoney { amount } }
    totalTaxSet { shopMoney { amount } }
    totalShippingPriceSet { shopMoney { amount } }
    totalOutstandingSet { shopMoney { amount } }
    totalReceivedSet { shopMoney { amount } }
    billingAddress { name address1 city province zip country }
    shippingAddress { name address1 city province zip country }
    lineItems(first: 100) { edges { node { id title quantity sku originalUnitPriceSet { shopMoney { amount } } } } }
    paymentTerms {
      paymentTermsName paymentTermsType overdue
      paymentSchedules(first: 5) { edges { node { dueAt issuedAt completedAt } } }
    }
    transactions(first: 20) { id kind status processedAt amountSet { shopMoney { amount currencyCode } } }
    customer { firstName lastName }
  }
}`;

export async function fetchInvoiceOrder(idOrGid: string): Promise<InvoiceOrder | null> {
  const data = await adminQuery<{ order: InvoiceOrder | null }>(INVOICE_QUERY, {
    id: toOrderGid(idOrGid),
  }).catch(() => ({ order: null }));
  return data.order;
}

/** The invoice's purchasing company id, or undefined for non-company orders. */
export function invoiceCompanyId(order: InvoiceOrder): string | undefined {
  return order.purchasingEntity?.__typename === "PurchasingCompany"
    ? order.purchasingEntity.company?.id ?? undefined
    : undefined;
}

/**
 * IDOR guard: the invoice's purchasing company must match the viewer's active
 * company. Orders with no company (or a mismatched one) are not visible.
 */
export function invoiceBelongsToSession(order: InvoiceOrder, session: Session): boolean {
  const companyId = invoiceCompanyId(order);
  return !!companyId && !!session.companyId && companyId === session.companyId;
}

/** Outstanding balance still owed on the invoice. */
export function invoiceOutstanding(order: InvoiceOrder): number {
  return parseFloat(order.totalOutstandingSet.shopMoney.amount || "0");
}

/** Whether the invoice is fully settled. */
export function invoiceIsPaid(order: InvoiceOrder): boolean {
  return order.displayFinancialStatus === "PAID" || invoiceOutstanding(order) <= 0;
}
