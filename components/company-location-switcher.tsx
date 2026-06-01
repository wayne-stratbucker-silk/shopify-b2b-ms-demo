"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "./ui/icons";

interface CompanyOption {
  companyId: number;
  companyName: string;
  parentCompanyId?: number | null;
}

interface ApiResponse {
  companies: CompanyOption[];
  activeCompanyId?: number;
}

/**
 * Renders ONLY when the signed-in user belongs to a parent Company with
 * at least one subsidiary (or otherwise has multiple Companies). Single-
 * Company users never see this control.
 *
 * Switching writes the choice to a server cookie (acme_active_company)
 * and refreshes the page so server components re-read activeCompanyId
 * from the session and re-fetch data scoped to the new Company.
 */
export function CompanySwitcher({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [switching, setSwitching] = useState<number | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/b2b/companies")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ApiResponse | null) => {
        if (!d) return;
        setCompanies(d.companies ?? []);
        if (d.activeCompanyId) setActiveId(d.activeCompanyId);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!popoverRef.current) return;
      if (!popoverRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  // Hide when there's only one (or zero) Company — single-Company users
  // don't need a switcher.
  if (companies.length < 2) return null;

  const active = companies.find((c) => c.companyId === activeId) ?? companies[0];

  async function handleSwitch(companyId: number) {
    if (companyId === activeId) {
      setOpen(false);
      return;
    }
    setSwitching(companyId);
    try {
      const res = await fetch("/api/b2b/active-company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      if (res.ok) {
        setActiveId(companyId);
        setOpen(false);
        router.refresh();
      }
    } finally {
      setSwitching(null);
    }
  }

  return (
    <div ref={popoverRef} style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: compact ? "4px 8px" : "6px 10px",
          fontSize: compact ? 12 : 13,
          border: "1px solid var(--line-2)",
          borderRadius: "var(--radius)",
          background: "var(--surface)",
          color: "var(--ink-2)",
          cursor: "pointer",
          maxWidth: 220,
          textAlign: "left",
        }}
      >
        <Icon name="building" size={compact ? 12 : 14} />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 500,
          }}
        >
          {active?.companyName ?? "Company"}
        </span>
        <Icon name="chev" size={compact ? 11 : 13} />
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: 240,
            background: "var(--surface)",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            boxShadow: "0 6px 24px rgba(0,0,0,.08)",
            zIndex: 800,
            padding: 4,
          }}
        >
          <div
            style={{
              fontSize: 10,
              letterSpacing: ".06em",
              textTransform: "uppercase",
              color: "var(--muted)",
              padding: "8px 10px 4px",
            }}
          >
            Switch company
          </div>
          {companies.map((c) => {
            const isActive = c.companyId === activeId;
            const isChild = !!c.parentCompanyId;
            return (
              <button
                key={c.companyId}
                role="option"
                aria-selected={isActive}
                onClick={() => handleSwitch(c.companyId)}
                disabled={switching !== null}
                style={{
                  display: "flex",
                  alignItems: "center",
                  width: "100%",
                  textAlign: "left",
                  gap: 8,
                  padding: "8px 10px",
                  border: "none",
                  background: isActive ? "var(--surface-2)" : "transparent",
                  borderRadius: "var(--radius)",
                  cursor: switching === null ? "pointer" : "wait",
                  fontSize: 13,
                  color: "var(--ink-2)",
                }}
              >
                <span style={{ flex: 1 }}>
                  {isChild && <span style={{ color: "var(--muted)", marginRight: 4 }}>↳</span>}
                  {c.companyName}
                </span>
                {isActive && <Icon name="check" size={13} />}
                {switching === c.companyId && (
                  <span className="muted" style={{ fontSize: 11 }}>switching…</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
