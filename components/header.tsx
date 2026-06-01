"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef } from "react";
import { Icon } from "./ui/icons";
import { useLocation } from "./location-provider";

// Lazy-load the search box (Algolia autocomplete + its theme CSS) so its
// bundle doesn't sit on the critical path of every page. The placeholder
// reserves the 36px-tall search bar's footprint to avoid layout shift.
const SearchBox = dynamic(
  () => import("./search/search-box").then((m) => m.SearchBox),
  {
    ssr: false,
    loading: () => <div className="aa-wrapper" style={{ height: 36 }} />,
  },
);
import { CompanySwitcher } from "./company-location-switcher";
import MobileMegaNav from "./mobile-nav";
export interface HeaderAccountInfo {
  company: string;
  accountNumber: string;
  repName: string;
}

export function Header({
  accountInfo,
}: {
  accountInfo?: HeaderAccountInfo | null;
}) {
  const [cartCount, setCartCount] = useState(0);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchCollapsed, setSearchCollapsed] = useState(false);
  const lastScrollY = useRef(0);
  const { locations, selectedId, setSelectedId, activeContact } = useLocation();

  useEffect(() => {
    async function fetchCount() {
      try {
        const res = await fetch("/api/cart/count");
        if (res.ok) {
          const data = await res.json() as { count: number };
          setCartCount(data.count ?? 0);
        }
      } catch { /* ignore fetch errors — cart count stays at last known value */ }
    }
    fetchCount();
    window.addEventListener("storage", fetchCount);
    return () => window.removeEventListener("storage", fetchCount);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    // Hysteresis: ignore small scroll jitter so the collapsing search bar
    // doesn't flicker on momentum/elastic scrolling (esp. mobile). The bar
    // only toggles after the user has moved past DELTA in one direction.
    const DELTA = 12;        // min movement before we react
    const COLLAPSE_AT = 80;  // don't collapse until scrolled past the header
    let ticking = false;

    function update() {
      ticking = false;
      const y = window.scrollY;
      const diff = y - lastScrollY.current;

      // Always show near the top.
      if (y <= COLLAPSE_AT) {
        setSearchCollapsed(false);
        lastScrollY.current = y;
        return;
      }

      // Only act once movement exceeds the threshold, then reset the anchor.
      if (Math.abs(diff) < DELTA) return;

      setSearchCollapsed(diff > 0); // scrolling down → hide, up → show
      lastScrollY.current = y;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Utility bar */}
      <div className="utility-bar">
        <div className="container">
          <div className="inner">
            {/* Left: location picker (above the logo) + contact info */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {locations.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-2)" }}>
                  Location:
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) =>
                      setSelectedId(e.target.value ? parseInt(e.target.value, 10) : null)
                    }
                    style={{
                      fontSize: 12,
                      color: "var(--ink-2)",
                      background: "transparent",
                      border: "1px solid var(--line-2)",
                      borderRadius: "var(--radius)",
                      padding: "2px 6px",
                      cursor: "pointer",
                      maxWidth: 180,
                    }}
                  >
                    <option value="">All locations</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <span>
                Need help?{" "}
                <a href={`tel:${activeContact.phone.replace(/\s/g, "")}`} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "none" }}>
                  {activeContact.phone}
                </a>
                {activeContact.email && (
                  <>
                    {" · "}
                    <a href={`mailto:${activeContact.email}`} style={{ color: "var(--ink)", fontWeight: 700, textDecoration: "none" }}>
                      {activeContact.email}
                    </a>
                  </>
                )}
                {activeContact.hours && <> · {activeContact.hours}</>}
              </span>
            </div>

            {/* Right: account info */}
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              {accountInfo && (
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <CompanySwitcher compact />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--ink-2)", fontWeight: 500 }}>
                    <Icon name="building" size={13} />
                    {accountInfo.company}
                    {accountInfo.accountNumber && (
                      <span className="muted" style={{ fontWeight: 400 }}>
                        · {accountInfo.accountNumber}
                      </span>
                    )}
                  </span>
                  {accountInfo.repName && (
                    <span>
                      Rep: <b style={{ color: "var(--ink)" }}>{accountInfo.repName}</b>
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className={`site-header${searchCollapsed ? " search-collapsed" : ""}`}>
        <div className="container">
          <div className="inner">
            {/* Brand */}
            <Link href="/" className="brand" style={{ textDecoration: "none" }}>
              <span className="brand-mark">A</span>
              ACME
              <sup>B2B</sup>
            </Link>

            {/* Search */}
            <SearchBox placeholder="Search by SKU, MPN, or keyword…" />

            {/* Actions */}
            <div className="header-actions">
              <Link href="/account/quick-order" className="iconbtn iconbtn-quickorder" aria-label="Quick Order">
                <Icon name="bolt" size={18} />
                <span className="nav-label">Quick Order</span>
              </Link>
              <Link href="/account/lists" className="iconbtn iconbtn-lists" aria-label="Lists">
                <Icon name="list" size={18} />
                <span className="nav-label">Lists</span>
              </Link>
              <Link href="/account" className="iconbtn iconbtn-account" aria-label="Account">
                <Icon name="user" size={18} />
                <span className="nav-label">Account</span>
              </Link>
              <Link href="/cart" className="iconbtn" aria-label="Cart">
                <Icon name="cart" size={18} />
                {cartCount > 0 && <span className="count">{cartCount}</span>}
                <span className="nav-label">Cart</span>
              </Link>
              {/* Hamburger — mobile only */}
              <button
                className="iconbtn show-mobile"
                aria-label="Open menu"
                onClick={() => setMobileNavOpen(true)}
              >
                <Icon name="menu" size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Unified mobile navigation — Shop (BC categories) / Account / Resources.
          Replaces the former quick-links drawer and the category drawer. */}
      <MobileMegaNav
        open={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        title={accountInfo?.company || "ACME"}
      />
    </>
  );
}
