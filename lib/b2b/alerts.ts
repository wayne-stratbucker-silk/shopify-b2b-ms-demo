// Account alerts — derived notifications for the B2B buyer.
//
// Ports catalyst's account-alerts feature. Alerts are DERIVED from existing
// data (credit line, invoices on terms, quotes) rather than stored, so they're
// always current. Each has a stable id so per-user read-state (a cookie of read
// ids) can track what's been seen. No new backend storage.

import { cache } from "react";
import { adminQuery } from "@/lib/shopify/admin-client";
import { getCreditLine, creditUtilization } from "@/lib/b2b/credit";
import { getQuotesForCustomer, getQuotesForCompany } from "@/lib/quotes/client";
import type { Session } from "@/lib/auth/session";

export interface AccountAlert {
  id: string;
  severity: "err" | "warn" | "info";
  title: string;
  body?: string;
  href?: string;
  /** ISO date for sorting (most recent / most urgent first). */
  date?: string;
}

const SEVERITY_RANK: Record<AccountAlert["severity"], number> = { err: 0, warn: 1, info: 2 };
const DUE_SOON_DAYS = 7;

interface TermOrder {
  id: string;
  name: string;
  displayFinancialStatus: string;
  paymentTerms?: { paymentSchedules: { edges: Array<{ node: { dueAt?: string | null } }> } } | null;
}

async function fetchTermOrders(companyId: string): Promise<TermOrder[]> {
  const id = companyId.replace("gid://shopify/Company/", "");
  const data = await adminQuery<{ orders: { edges: Array<{ node: TermOrder }> } }>(
    `query AlertInvoices($query: String!) {
      orders(first: 50, query: $query, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name displayFinancialStatus
          paymentTerms { paymentSchedules(first: 1) { edges { node { dueAt } } } }
        } }
      }
    }`,
    { query: `company_id:${id} payment_terms:true` },
  ).catch(() => ({ orders: { edges: [] } }));
  return data.orders.edges.map((e) => e.node);
}

/** Derive the current alert list for the session (most urgent first). Request-cached. */
export const getAccountAlerts = cache(async (session: Session | null): Promise<AccountAlert[]> => {
  if (!session?.companyId) return [];

  const [credit, orders, quotes] = await Promise.all([
    getCreditLine(session),
    fetchTermOrders(session.companyId),
    (session.permissions?.includes("company.quotes.view_all")
      ? getQuotesForCompany(session.companyId)
      : getQuotesForCustomer(session.customerId)
    ).catch(() => []),
  ]);

  const alerts: AccountAlert[] = [];
  const now = Date.now();

  // Credit
  if (credit?.creditEnabled) {
    if (credit.creditHold) {
      alerts.push({ id: "credit-hold", severity: "err", title: "Account on credit hold", body: "New orders can't be placed on terms until your balance is resolved.", href: "/account/invoices" });
    } else if (creditUtilization(credit) >= 0.9) {
      alerts.push({ id: "credit-near-limit", severity: "warn", title: "Credit line nearly used", body: `${Math.round(creditUtilization(credit) * 100)}% of your credit limit is in use.`, href: "/account/invoices" });
    }
  }

  // Invoices
  for (const o of orders) {
    if (o.displayFinancialStatus === "PAID" || o.displayFinancialStatus === "REFUNDED") continue;
    const dueAt = o.paymentTerms?.paymentSchedules?.edges?.[0]?.node?.dueAt;
    if (!dueAt) continue;
    const days = Math.ceil((new Date(dueAt).getTime() - now) / 86_400_000);
    const numeric = o.id.split("/").pop();
    if (days < 0) {
      alerts.push({ id: `invoice-overdue-${numeric}`, severity: "err", title: `Invoice ${o.name} is overdue`, body: `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} past due.`, href: `/account/invoices/${numeric}`, date: dueAt });
    } else if (days <= DUE_SOON_DAYS) {
      alerts.push({ id: `invoice-due-${numeric}`, severity: "warn", title: `Invoice ${o.name} due soon`, body: `Due in ${days} day${days === 1 ? "" : "s"}.`, href: `/account/invoices/${numeric}`, date: dueAt });
    }
  }

  // Quotes
  for (const q of quotes) {
    if (q.status !== "in_process") continue;
    const numeric = encodeURIComponent(q.id);
    const expMs = q.expires ? new Date(q.expires).getTime() - now : null;
    if (expMs != null && expMs > 0 && expMs / 86_400_000 <= DUE_SOON_DAYS) {
      alerts.push({ id: `quote-expiring-${q.id}`, severity: "warn", title: `Quote ${q.draftOrderName} expiring soon`, body: "Accept it before it lapses.", href: `/account/quotes/${numeric}`, date: q.expires });
    } else {
      alerts.push({ id: `quote-ready-${q.id}`, severity: "info", title: `Quote ${q.draftOrderName} is ready`, body: "Your quote has been priced and is ready to order.", href: `/account/quotes/${numeric}`, date: q.date });
    }
  }

  alerts.sort((a, b) => {
    if (SEVERITY_RANK[a.severity] !== SEVERITY_RANK[b.severity]) return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity];
    return (b.date ?? "").localeCompare(a.date ?? "");
  });
  return alerts;
});
