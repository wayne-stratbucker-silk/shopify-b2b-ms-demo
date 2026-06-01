"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "./ui/icons";
import type { IconName } from "./ui/icons";
import type { Session } from "@/lib/auth/session";

import { CompanySwitcher } from "./company-location-switcher";

interface NavItem {
  href: string;
  label: string;
  ic: IconName;
  ct?: number;
  matches: string[];
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Buying",
    items: [
      { href: "/account",             label: "Dashboard",      ic: "dashboard", matches: ["/account"] },
      { href: "/account/orders",      label: "Orders", ic: "pkg",       matches: ["/account/orders"] },
      { href: "/account/quotes",      label: "Quotes",         ic: "quote",     matches: ["/account/quotes"] },
      { href: "/account/lists",       label: "Saved lists",    ic: "list",      matches: ["/account/lists"] },
      { href: "/account/quick-order", label: "Quick order",    ic: "bolt",      matches: ["/account/quick-order"] },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/account/invoices",    label: "Invoices",       ic: "receipt",   matches: ["/account/invoices"] },
    ],
  },
  {
    label: "Organization",
    items: [
      { href: "/account/users",       label: "Users & roles",  ic: "users",     matches: ["/account/users"] },
      { href: "/account/addresses",   label: "Addresses",      ic: "pin",       matches: ["/account/addresses"] },
    ],
  },
];

export function AccountNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [accountInfo, setAccountInfo] = useState<unknown | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setAccountInfo(d); })
      .catch(() => {});
  }, []);

  // Close the drawer once navigation actually lands — NOT inside each link's
  // onClick. Calling setDrawerOpen(false) during the click re-renders the
  // drawer mid-transition and Next drops the in-flight client navigation.
  // Reacting to the pathname change sidesteps that entirely. (Same pattern
  // as components/mobile-nav.tsx.)
  useEffect(() => {
    if (drawerOpen) setDrawerOpen(false);
    // Only react to route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Escape closes the drawer while it's open.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  // Find best matching nav item
  let bestLen = -1;
  let activeHref = "";
  for (const g of NAV_GROUPS) {
    for (const item of g.items) {
      for (const m of item.matches) {
        const isExact = pathname === m;
        const isPrefix = m !== "/" && pathname.startsWith(m + "/");
        if ((isExact || isPrefix) && m.length > bestLen) {
          bestLen = m.length;
          activeHref = item.href;
        }
      }
    }
  }

  const companyName = session?.companyName || "Your company";
  const rep = (accountInfo as { salesRep?: { initials: string; name: string; title: string; phone?: string; email?: string } } | null)?.salesRep;

  // The active item powers the mobile trigger button label + icon. Default
  // to the first item (Dashboard) if nothing matches yet.
  const activeItem =
    NAV_GROUPS.flatMap((g) => g.items).find((i) => i.href === activeHref) ??
    NAV_GROUPS[0].items[0];

  // Shared between the desktop sidebar and the mobile drawer body so they
  // never drift apart. Includes the trailing Sign out group.
  function renderNavGroups() {
    return (
      <ul className="account-nav">
        {NAV_GROUPS.map((g, gi) => {
          // Hide Finance group entirely for users without invoice access
          if (g.label === "Finance") {
            if (session !== null && !session.permissions?.includes("company.invoices.view")) return null;
          }
          const visibleItems = g.items.filter((item) => {
            // Gate Users & roles by the manage permission (B2B Edition dynamic).
            // Pre-session: render optimistically so the link doesn't flicker
            // for admins on first paint.
            if (item.href === "/account/users") {
              if (session === null) return true;
              return session.permissions?.includes("company.users.manage") ?? false;
            }
            return true;
          });
          if (visibleItems.length === 0) return null;
          return (
          <li key={`grp-${gi}`} style={{ listStyle: "none", padding: 0 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              <li className="group-lbl">{g.label}</li>
              {visibleItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={item.href === activeHref ? "active" : ""}
                  >
                    <Icon name={item.ic} size={15} className="ic" />
                    {item.label}
                    {item.ct != null && <span className="ct">{item.ct}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </li>
          );
        })}

        {/* Sign out */}
        <li style={{ listStyle: "none", padding: 0 }}>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            <li className="group-lbl">Account</li>
            <li>
              <button
                onClick={handleSignOut}
                style={{ width: "100%", textAlign: "left", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", fontSize: 13, color: "var(--muted)", borderRadius: "var(--radius)" }}
              >
                <Icon name="x" size={15} className="ic" />
                Sign out
              </button>
            </li>
          </ul>
        </li>
      </ul>
    );
  }

  return (
    <aside className="account-side">
      {/* Org card */}
      <div className="org-card">
        <p className="org-name">{companyName}</p>
        {session && (
          <p className="org-meta" style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
            {session.name} · {session.role}
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          <CompanySwitcher />
        </div>
        {rep && (
          <div className="account-rep" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
            <div style={{ fontSize: 10, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>
              Your rep
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <div className="av" style={{ width: 28, height: 28, fontSize: 11, flexShrink: 0 }}>{rep.initials}</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 12 }}>{rep.name}</div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>{rep.title}</div>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {rep.phone && (
                <a href={`tel:${rep.phone.replace(/\s/g, "")}`} style={{ fontSize: 11, color: "var(--ink-2)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="phone" size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  {rep.phone}
                </a>
              )}
              {rep.email && (
                <a href={`mailto:${rep.email}`} style={{ fontSize: 11, color: "var(--primary)", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="mail" size={12} style={{ color: "var(--muted)", flexShrink: 0 }} />
                  {rep.email}
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile trigger — shows the active section and opens the drawer.
          Hidden on desktop via CSS; the sidebar nav below takes its place. */}
      <button
        type="button"
        className="account-mobile-trigger"
        aria-haspopup="dialog"
        aria-expanded={drawerOpen}
        aria-controls="account-mobile-drawer"
        onClick={() => setDrawerOpen(true)}
      >
        <Icon name={activeItem.ic} size={16} className="ic" />
        <span className="lbl">{activeItem.label}</span>
        <Icon name="chev" size={14} className="caret" />
      </button>

      {/* Desktop grouped sidebar (hidden on mobile via CSS). */}
      {renderNavGroups()}

      {/* Mobile drawer — reuses the global .drawer / .drawer-overlay
          primitives so it matches the main mobile-nav. */}
      <div
        className={`drawer-overlay ${drawerOpen ? "open" : ""}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />
      <div
        id="account-mobile-drawer"
        className={`drawer account-drawer ${drawerOpen ? "open" : ""}`}
        role="dialog"
        aria-label="Account navigation"
        aria-modal="true"
      >
        <div className="drawer-head">
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", flex: 1 }}>Account</div>
          <button
            className="close"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close"
          >
            <Icon name="x" size={18} />
          </button>
        </div>
        <div className="account-drawer-body">
          {renderNavGroups()}
        </div>
      </div>

    </aside>
  );
}
