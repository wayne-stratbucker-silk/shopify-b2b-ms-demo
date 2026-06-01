"use client";

// Mobile navigation drawer — ported from the Navigation Mobile design
// (design/bigcommerce-b2b-accelerator/project/navigation-mobile.jsx).
//
// A tabbed drawer: Shop (category drill-down fed LIVE from BigCommerce via
// /api/bc/categories/tree, any depth 1–4), Account, and Resources. Replaces
// the previous header quick-links drawer AND the category drawer with a single
// unified surface. Triggered by the header hamburger.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavNode } from "@/components/mega-nav";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Drawer header label (company / brand). */
  title?: string;
  /** Override the tree (defaults to the live BC tree). */
  tree?: NavNode[];
}

function hrefFor(node: NavNode): string {
  return node.url || `/${node.slug}`;
}

// ─── Icons (inline, matching the design) ────────────────────────────────────
const I = {
  close: <path d="m6 6 12 12M18 6 6 18" />,
  chevR: <path d="m9 6 6 6-6 6" />,
  chevL: <path d="m15 6-6 6 6 6" />,
  arrowR: <path d="M5 12h14M13 6l6 6-6 6" />,
  shop: <path d="M3 9h18M3 9l1.5-5h15L21 9M3 9v10a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9" />,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>,
  book: <><path d="M4 19.5V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-1.5z" /><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H19" /></>,
};

function Svg({ children, size = 20 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" width={size} height={size} aria-hidden>
      {children}
    </svg>
  );
}

// ─── Account links (real storefront routes) ─────────────────────────────────
const ACCOUNT_LINKS: { href: string; label: string; ic: React.ReactNode }[] = [
  { href: "/account", label: "Dashboard", ic: <><path d="M3 12 12 4l9 8" /><path d="M5 11v9h5v-5h4v5h5v-9" /></> },
  { href: "/account/orders", label: "Orders", ic: <><path d="m12 3 9 5v8l-9 5-9-5V8z" /><path d="m3 8 9 5 9-5M12 13v10" /></> },
  { href: "/account/quotes", label: "Quotes", ic: <><path d="M5 3h11l3 3v15H5z" /><path d="M16 3v3h3" /><path d="M8 11h8M8 15h5" /></> },
  { href: "/account/invoices", label: "Invoices", ic: <><path d="M5 3v18l3-2 2 2 2-2 2 2 2-2 3 2V3z" /><path d="M8 8h8M8 12h8M8 16h5" /></> },
  { href: "/account/lists", label: "Saved lists", ic: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="5" cy="18" r="1" fill="currentColor" stroke="none" /></> },
  { href: "/account/quick-order", label: "Quick order", ic: <path d="M13 2 4 14h7l-1 8 9-12h-7z" /> },
  { href: "/account/users", label: "Users & roles", ic: <><circle cx="9" cy="8" r="3.5" /><path d="M2 20c.8-3 3.5-5 7-5s6.2 2 7 5" /><circle cx="17" cy="7" r="2.5" /><path d="M16 13c2.5 0 4.5 1.5 5 4" /></> },
  { href: "/account/addresses", label: "Addresses", ic: <><path d="M12 22s7-7 7-13a7 7 0 1 0-14 0c0 6 7 13 7 13z" /><circle cx="12" cy="9" r="2.5" /></> },
];

const RESOURCE_SECTIONS: {
  label: string;
  links: { label: string; href: string; meta?: string; ic?: React.ReactNode }[];
}[] = [
  {
    label: "Talk to us",
    links: [
      { label: "Call customer care", meta: "M–F 6a–7p PT · (800) 555-0182", href: "tel:+18005550182", ic: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.95.37 1.87.72 2.75a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.33-1.33a2 2 0 0 1 2.11-.45c.88.35 1.8.59 2.75.72A2 2 0 0 1 22 16.92z" /> },
      { label: "Email our team", meta: "We are here to help", href: "mailto:support@acmecorp.com", ic: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></> },
    ],
  },
  {
    label: "Reference & tools",
    links: [
      { label: "Spec sheet library", href: "#" },
      { label: "Code & compliance guides", href: "#" },
      { label: "Rebate look-up", href: "#" },
      { label: "Apply for trade credit", href: "#" },
      { label: "Returns & warranty", href: "#" },
    ],
  },
];

// ─── MobileMegaNav ──────────────────────────────────────────────────────────

export default function MobileMegaNav({ open, onClose, title = "Browse", tree: treeProp }: Props) {
  const [fetched, setFetched] = useState<NavNode[]>([]);
  const tree = treeProp ?? fetched;
  const [tab, setTab] = useState<"shop" | "account" | "resources">("shop");
  const [stack, setStack] = useState<string[]>([]);
  const [animDepth, setAnimDepth] = useState(0);
  const pathname = usePathname();

  // Close the drawer once navigation actually lands, NOT in each link's
  // onClick. Calling onClose() during the click re-renders the drawer
  // mid-transition and Next drops the in-flight client navigation — the
  // links would close the drawer but never navigate. Reacting to the
  // resulting pathname change sidesteps that entirely.
  useEffect(() => {
    if (open) onClose();
    // Only react to route changes; `open`/`onClose` are intentionally omitted
    // so opening the drawer doesn't immediately close it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (treeProp) return;
    fetch("/api/bc/categories/tree")
      .then((r) => r.json())
      .then((data: NavNode[]) => {
        if (Array.isArray(data)) setFetched(data);
      })
      .catch(() => {});
  }, [treeProp]);

  // Resolve the node path from the id stack.
  const path = useMemo(() => {
    const nodes: NavNode[] = [];
    let pool = tree;
    for (const id of stack) {
      const n = pool.find((c) => c.id === id);
      if (!n) break;
      nodes.push(n);
      pool = n.children ?? [];
    }
    return nodes;
  }, [stack, tree]);

  const push = (id: string) => { setStack((s) => [...s, id]); setAnimDepth((d) => d + 1); };
  const pop = () => { setStack((s) => s.slice(0, -1)); setAnimDepth((d) => Math.max(0, d - 1)); };
  const reset = () => { setStack([]); setAnimDepth(0); };

  // Build the levels to render: root + each pushed level.
  const levels: {
    depth: number;
    parent: NavNode | null;
    items: NavNode[];
    crumb?: string[];
  }[] = [{ depth: 0, parent: null, items: tree }];
  for (let i = 0; i < path.length; i++) {
    const node = path[i];
    levels.push({
      depth: i + 1,
      parent: node,
      crumb: path.slice(0, i + 1).map((p) => p.name),
      items: node.children ?? [],
    });
  }

  return (
    <>
      <div className={`drawer-overlay ${open ? "open" : ""}`} onClick={onClose} aria-hidden="true" />
      <div className={`drawer mnv ${open ? "open" : ""}`} aria-label="Mobile navigation" role="navigation">
        <div className="drawer-head">
          <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)", flex: 1 }}>{title}</div>
          <button className="close" onClick={onClose} aria-label="Close"><span className="ic"><Svg>{I.close}</Svg></span></button>
        </div>

        <div className="mnv-tabs">
          <button className={tab === "shop" ? "on" : ""} onClick={() => { setTab("shop"); reset(); }}>
            <span className="ic"><Svg size={16}>{I.shop}</Svg></span>Shop
          </button>
          <button className={tab === "account" ? "on" : ""} onClick={() => setTab("account")}>
            <span className="ic"><Svg size={16}>{I.user}</Svg></span>Account
          </button>
          <button className={tab === "resources" ? "on" : ""} onClick={() => setTab("resources")}>
            <span className="ic"><Svg size={16}>{I.book}</Svg></span>Resources
          </button>
        </div>

        {tab === "shop" && (
          <>
            <div className="mnv-stack">
              {levels.map((lvl, i) => {
                const isCurrent = i === animDepth;
                const isBehind = i < animDepth;
                const cls = lvl.depth === 0 ? "depth-0" : isCurrent ? "entering" : isBehind ? "behind" : "";
                return <LevelView key={i} level={lvl} cls={cls} onPush={push} onPop={pop} onClose={onClose} />;
              })}
            </div>
          </>
        )}

        {tab === "account" && (
          <div className="mnv-level-body" style={{ flex: 1, overflowY: "auto" }}>
            <div className="mnv-l-title"><h2>Account</h2></div>
            <ul className="mnv-acct">
              {ACCOUNT_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="ic"><Svg>{l.ic}</Svg></span>
                    <span className="name">{l.label}</span>
                    <span style={{ color: "var(--muted-2)", marginLeft: 6 }}><Svg size={16}>{I.chevR}</Svg></span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === "resources" && (
          <div className="mnv-level-body" style={{ flex: 1, overflowY: "auto" }}>
            <div className="mnv-l-title"><h2>Resources</h2></div>
            {RESOURCE_SECTIONS.map((sec) => (
              <div key={sec.label}>
                <div className="mnv-list-lbl">{sec.label}</div>
                <ul className="mnv-acct">
                  {sec.links.map((l) => (
                    <li key={l.label}>
                      <a href={l.href} onClick={onClose}>
                        {l.ic && <span className="ic"><Svg>{l.ic}</Svg></span>}
                        {l.meta ? (
                          <span className="name" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span>{l.label}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)", fontWeight: 400 }}>{l.meta}</span>
                          </span>
                        ) : (
                          <span className="name">{l.label}</span>
                        )}
                        <span style={{ color: "var(--muted-2)", marginLeft: 6 }}><Svg size={16}>{I.chevR}</Svg></span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Single drill level ─────────────────────────────────────────────────────

function LevelView({
  level,
  cls,
  onPush,
  onPop,
  onClose,
}: {
  level: { depth: number; parent: NavNode | null; items: NavNode[]; crumb?: string[] };
  cls: string;
  onPush: (id: string) => void;
  onPop: () => void;
  onClose: () => void;
}) {
  const { depth, parent, items, crumb } = level;
  const isRoot = depth === 0;

  if (isRoot) {
    return (
      <div className={`mnv-level ${cls}`}>
        <div className="mnv-l-title"><h2>Shop</h2></div>
        <div className="mnv-level-body">
          <ul className="mnv-list">
            {items.map((t) => {
              const hasKids = (t.children ?? []).length > 0;
              return (
                <li key={t.id}>
                  {hasKids ? (
                    <button onClick={() => onPush(t.id)}>
                      <span className="info"><span className="name">{t.name}</span></span>
                      <span className="arr"><Svg size={18}>{I.chevR}</Svg></span>
                    </button>
                  ) : (
                    <Link href={hrefFor(t)}>
                      <span className="info"><span className="name">{t.name}</span></span>
                      <span className="arr"><Svg size={18}>{I.chevR}</Svg></span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className={`mnv-level ${cls}`}>
      <div className="mnv-l-head">
        <button className="mnv-back" onClick={onPop} aria-label="Back"><span className="ic"><Svg size={20}>{I.chevL}</Svg></span></button>
        <div className="crumb">{crumb?.slice(0, -1).join(" · ") || "All departments"}</div>
        <button className="close" onClick={onClose} aria-label="Close"><span className="ic"><Svg size={18}>{I.close}</Svg></span></button>
      </div>
      <div className="mnv-l-title"><h2>{parent?.name}</h2></div>
      <div className="mnv-level-body">
        {parent && (
          <Link href={hrefFor(parent)} className="mnv-shop-all">
            <span className="body"><span>Shop all {parent.name}</span></span>
            <span className="arr"><Svg size={16}>{I.arrowR}</Svg></span>
          </Link>
        )}
        {items.length > 0 && (
          <ul className="mnv-list">
            {items.map((c) => {
              const hasKids = (c.children ?? []).length > 0;
              return (
                <li key={c.id}>
                  {hasKids ? (
                    <button onClick={() => onPush(c.id)}>
                      <span className="info"><span className="name">{c.name}</span></span>
                      <span className="arr"><Svg size={18}>{I.chevR}</Svg></span>
                    </button>
                  ) : (
                    <Link href={hrefFor(c)}>
                      <span className="leaf" />
                      <span className="info"><span className="name">{c.name}</span></span>
                      <span className="arr"><Svg size={14}>{I.arrowR}</Svg></span>
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
