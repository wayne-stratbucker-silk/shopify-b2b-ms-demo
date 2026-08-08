"use client";

// "Account / Company Info" — a compact snapshot of the buyer's company:
// company name, account number, and payment terms. Company name + account
// number come from the signed-in session (/api/auth/me); payment terms come
// from the Shopify-native credit line (/api/b2b/credit → netTerms). Each field
// has a show/hide checkbox so a merchandiser can trim the card. Drop it into
// any account dashboard region.

import { useEffect, useState } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Checkbox } from "@makeswift/runtime/controls";

// Shape of the session as returned by GET /api/auth/me → { user }.
interface MeUser {
  companyName?: string;
  companyExternalId?: string;
}

// Relevant slice of GET /api/b2b/credit (CreditLine | { creditEnabled:false }).
interface CreditPayload {
  creditEnabled?: boolean;
  netTerms?: string;
  accountNumber?: string;
}

interface Summary {
  companyName: string;
  accountNumber: string;
  netTerms: string;
}

interface CompanyInfoProps {
  className?: string;
  heading?: string;
  emptyText?: string;
  showCompanyName?: boolean;
  showAccountNumber?: boolean;
  showNetTerms?: boolean;
}

type LoadState = "loading" | "ready";

function visibleRows(summary: Summary, p: CompanyInfoProps): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  if (p.showCompanyName !== false && summary.companyName) rows.push({ label: "Company", value: summary.companyName });
  if (p.showAccountNumber !== false && summary.accountNumber) rows.push({ label: "Account #", value: summary.accountNumber });
  if (p.showNetTerms !== false && summary.netTerms) rows.push({ label: "Payment terms", value: summary.netTerms });
  return rows;
}

function AccountCompanyInfo(p: CompanyInfoProps) {
  const { className, heading, emptyText } = p;
  const [summary, setSummary] = useState<Summary | null>(null);
  const [state, setState] = useState<LoadState>("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [meRes, creditRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/b2b/credit"),
        ]);
        const me = (await meRes.json().catch(() => ({}))) as { user?: MeUser | null };
        const credit = (await creditRes.json().catch(() => ({}))) as CreditPayload;
        if (cancelled) return;
        const user = me.user ?? null;
        setSummary({
          companyName: user?.companyName ?? "",
          // Prefer the session account number; fall back to the credit payload.
          accountNumber: user?.companyExternalId || credit.accountNumber || "",
          netTerms: credit.creditEnabled ? credit.netTerms ?? "" : "",
        });
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = summary ? visibleRows(summary, p) : [];

  return (
    <div className={`card ${className ?? ""}`}>
      <div className="card-h">
        <h3>{heading || "Company info"}</h3>
      </div>
      {state === "loading" ? (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Loading…
        </div>
      ) : rows.length > 0 ? (
        <div className="card-b" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rows.map((r) => (
            <div key={r.label} style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "baseline" }}>
              <span className="muted" style={{ fontSize: 12 }}>{r.label}</span>
              <span style={{ fontSize: 14, fontWeight: 500, textAlign: "right" }}>{r.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          {emptyText || "No company details to show yet."}
        </div>
      )}
    </div>
  );
}

runtime.registerComponent(AccountCompanyInfo, {
  type: "acme-account-company-info",
  label: "Account / Company Info — account number, terms & company",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Company info" }),
    showCompanyName: Checkbox({ label: "Show company name", defaultValue: true }),
    showAccountNumber: Checkbox({ label: "Show account number", defaultValue: true }),
    showNetTerms: Checkbox({ label: "Show payment terms", defaultValue: true }),
    emptyText: TextInput({ label: "Empty text", defaultValue: "No company details to show yet." }),
  },
});

export default AccountCompanyInfo;
