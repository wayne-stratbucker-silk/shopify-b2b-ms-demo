"use client";

// Desktop mega-navigation.
//
// The collection list is pulled LIVE from Shopify via /api/shopify/collections.
// Collections are flat (no hierarchy), so all items render as plain links.
// Nothing here is editable from Makeswift — the taxonomy is the backend's
// source of truth. Items with children open the mega-panel (or compact
// dropdown when they have no L3 nesting).

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NavNode {
  id: string;
  name: string;
  slug: string;
  url?: string;
  /** Anchor target — set for authored content links that opt into a new tab. */
  target?: "_blank" | "_self";
  /** "content" items render as compact dropdowns and sit right of the divider. */
  type?: "content";
  badge?: string;
  count?: number;
  children?: NavNode[];
}

interface FeatureCard {
  eyebrow?: string;
  title: string;
  sub?: string;
  cta?: string;
  href: string;
}

interface Props {
  /** Override the tree (defaults to the live BC tree fetched on mount). */
  tree?: NavNode[];
  /**
   * When non-empty, only these category node ids render as bar items, in this
   * order (resolved against the live tree at any depth). The "All Categories"
   * launcher and panel always reflect the FULL live tree regardless. Empty →
   * every top-level category is shown (backwards-compatible default).
   */
  pinnedIds?: string[];
  /**
   * Content pages rendered right of the divider (authored marketing/info
   * pages, not BC categories). Always visible — never folded into "More". A
   * node with children opens a two-level dropdown; one without is a plain link.
   */
  contentPages?: NavNode[];
  /** Optional featured cards keyed by top-level node id (right rail). */
  featured?: Record<string, FeatureCard>;
  /** Right-aligned trailing content (freight pill, store-pickup link, etc). */
  tail?: React.ReactNode;
  compact?: boolean;
  /** Shopify menu handle to fetch hierarchy from (default "main-menu"). */
  menuHandle?: string;
  /** Show the "All Categories" launcher on the left (default true). */
  showAnchor?: boolean;
  /** Extra class on the bar root (e.g. Makeswift Style positioning). */
  className?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const ChevDown = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m6 9 6 6 6-6" />
  </svg>
);
const ChevRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

// Resolve the storefront href for a node — prefer BC's real custom_url path.
function hrefFor(node: NavNode): string {
  return node.url || `/${node.slug}`;
}

// Find a node anywhere in the tree by id. Pinned categories may reference a
// top-level department or a deeper subcategory — both resolve to a real node
// (with its children) so the mega-panel still works.
function findNode(nodes: NavNode[], id: string): NavNode | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    const found = n.children ? findNode(n.children, id) : null;
    if (found) return found;
  }
  return null;
}

// An item opens a compact dropdown (vs the full mega-panel) when it is a
// content item, or when it has L2 children but none of them nest further.
function isFlat(item: NavNode | null | undefined): boolean {
  if (!item) return false;
  const kids = item.children ?? [];
  return (
    item.type === "content" ||
    (kids.length > 0 && kids.every((c) => !(c.children ?? []).length))
  );
}

// ─── MegaNav ────────────────────────────────────────────────────────────────

export default function MegaNav({
  tree: treeProp,
  pinnedIds,
  contentPages,
  featured = {},
  tail,
  compact,
  menuHandle = "main-menu",
  showAnchor = true,
  className,
}: Props) {
  const [fetched, setFetched] = useState<NavNode[]>([]);
  const tree = treeProp ?? fetched;

  // openId: a node id, or "__all" / "__more", or null
  const [openId, setOpenId] = useState<string | null>(null);
  const [l2Id, setL2Id] = useState<string | null>(null);
  // How many leading category items render in the bar; the rest fold into
  // "More". Starts effectively unbounded so EVERY item renders on first paint —
  // measurement then trims it down. (The tree arrives async, so initialising
  // from tree.length would be 0 here, which would render nothing for measure()
  // to size and wedge every category into "More" permanently.)
  const [overflowAt, setOverflowAt] = useState(Number.MAX_SAFE_INTEGER);

  const barRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  // Natural width of each top-level item, cached the first time it's measured
  // while visible. Cached values survive after an item is hidden (its live
  // offsetWidth would read 0), so overflow can be recomputed — and can GROW
  // BACK — as the viewport widens. Without this the bar could only shrink.
  const itemWidths = useRef<number[]>([]);

  // Pull the live menu tree unless a tree was passed in.
  useEffect(() => {
    if (treeProp) return;
    fetch(`/api/shopify/menu?handle=${encodeURIComponent(menuHandle)}`)
      .then((r) => r.json())
      .then((data: NavNode[]) => {
        if (Array.isArray(data)) setFetched(data);
      })
      .catch(() => {});
  }, [treeProp, menuHandle]);

  // Bar items: the admin-pinned subset (resolved from the live tree, in order)
  // when configured, otherwise every top-level category.
  const allCategories = tree.filter((t) => t.type !== "content");
  const categories =
    pinnedIds && pinnedIds.length
      ? pinnedIds
          .map((id) => findNode(tree, id))
          .filter((n): n is NavNode => !!n && n.type !== "content")
      : allCategories;
  // Content items come from the authored `contentPages` prop, not the BC tree.
  // They always render (never overflow into "More") and sit right of the divider.
  const contentItems = contentPages ?? [];

  // ─── Overflow measurement ───
  const measure = useCallback(() => {
    // Nothing to size yet (tree still loading) — leave overflowAt unbounded so
    // every item renders once the tree arrives; otherwise we'd latch it to 0.
    if (categories.length === 0) return;
    const bar = barRef.current;
    if (!bar) return;
    const wrap = bar.querySelector<HTMLElement>(".nv-items");
    if (!wrap) return;
    const max = wrap.offsetWidth;
    if (max <= 0) return;

    // Cache the natural width of every item currently rendered with a real
    // width. Hidden (display:none) items read 0 — skip them so the last good
    // measurement is retained and the bar can grow back when space returns.
    for (let i = 0; i < itemRefs.current.length; i++) {
      const el = itemRefs.current[i];
      if (el && el.offsetWidth > 0) itemWidths.current[i] = el.offsetWidth;
    }

    // Count how many leading items fit within a width budget, using cached
    // widths so the calculation is independent of what's currently visible.
    const countFits = (budget: number) => {
      let used = 0;
      let fit = 0;
      for (let i = 0; i < categories.length; i++) {
        used += itemWidths.current[i] ?? 0;
        if (used <= budget) fit++;
        else break;
      }
      return fit;
    };

    const withMore = countFits(max - 70); // reserve room for the "More" button
    // If everything fits even after reserving for "More", re-check against the
    // full width so the "More" button disappears entirely.
    setOverflowAt(withMore >= categories.length ? countFits(max) : withMore);
  }, [categories.length]);

  useLayoutEffect(() => {
    if (!barRef.current) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(barRef.current);
    measure();
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => measure());
    }
    return () => ro.disconnect();
  }, [measure, tree]);

  // ─── Open/close behaviour ───
  const toggle = (id: string, l2: string | null = null) => {
    setOpenId((prev) => (prev === id ? null : id));
    setL2Id(l2);
  };
  const close = useCallback(() => {
    setOpenId(null);
    setL2Id(null);
  }, []);

  useEffect(() => {
    if (!openId) return;
    const onDoc = (e: MouseEvent) => {
      if (barRef.current && !barRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openId, close]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  // Close the open panel whenever the route changes — clicking any <Link>
  // inside a panel navigates client-side without unmounting this component,
  // so the panel would otherwise stay open over the new page.
  const pathname = usePathname();
  useEffect(() => {
    close();
  }, [pathname, close]);

  const hidden = categories.slice(overflowAt);
  const openItem =
    openId && openId !== "__all" && openId !== "__more"
      ? tree.find((t) => t.id === openId) ?? null
      : null;
  const openIsFlat = isFlat(openItem);

  return (
    <div className={`nv-bar ${openId ? "open" : ""} ${compact ? "compact" : ""}${className ? ` ${className}` : ""}`} ref={barRef}>
      <div className="nv-bar-inner">
        {showAnchor && (
          <button
            className={`nv-anchor ${openId === "__all" ? "on" : ""}`}
            onClick={() => toggle("__all")}
            aria-expanded={openId === "__all"}
          >
            <span className="ic-bars" aria-hidden="true">
              <span /><span /><span />
            </span>
            All Categories
            <span className="ic-chev"><ChevDown /></span>
          </button>
        )}

        <div className="nv-items">
          {categories.map((t, i) => {
            const hasKids = (t.children ?? []).length > 0;
            const isOpen = openId === t.id;
            // Every item is always rendered so its width stays measurable;
            // those past the fit threshold are hidden and surfaced in "More".
            const overflowed = i >= overflowAt;
            const style = overflowed ? { display: "none" } : undefined;
            // No children → plain link (graceful for a flat catalog).
            if (!hasKids) {
              return (
                <Link
                  key={t.id}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  className="nv-item"
                  href={hrefFor(t)}
                  style={style}
                  aria-hidden={overflowed || undefined}
                >
                  {t.name}
                  {t.badge && <span className={`nv-badge ${t.badge.toLowerCase()}`}>{t.badge}</span>}
                </Link>
              );
            }
            return (
              <button
                key={t.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                className={`nv-item ${isOpen ? "on" : ""}`}
                onClick={() => toggle(t.id, t.children?.[0]?.id ?? null)}
                aria-expanded={isOpen}
                style={style}
                aria-hidden={overflowed || undefined}
              >
                {t.name}
                {t.badge && <span className={`nv-badge ${t.badge.toLowerCase()}`}>{t.badge}</span>}
                <span className="nv-chev"><ChevDown /></span>
                {isOpen && isFlat(t) && <ContentDropdown item={t} />}
              </button>
            );
          })}

          {hidden.length > 0 && (
            <button
              className={`nv-more ${openId === "__more" ? "on" : ""}`}
              onClick={() => toggle("__more")}
              aria-expanded={openId === "__more"}
            >
              More
              <span className="nv-more-ct">+{hidden.length}</span>
              <span className="nv-chev"><ChevDown /></span>
            </button>
          )}
        </div>

        {contentItems.length > 0 && (
          <div className="nv-content-items">
            <span className="nv-sep" aria-hidden="true" />
            {contentItems.map((t) => {
              const hasKids = (t.children ?? []).length > 0;
              const isOpen = openId === t.id;
              // No sub-links → a plain link that navigates directly.
              if (!hasKids) {
                return (
                  <Link key={t.id} className="nv-item content" href={hrefFor(t)} target={t.target}>
                    {t.name}
                  </Link>
                );
              }
              // Has sub-links → toggle the two-level compact dropdown.
              return (
                <button
                  key={t.id}
                  className={`nv-item content ${isOpen ? "on" : ""}`}
                  onClick={() => toggle(t.id, t.children?.[0]?.id ?? null)}
                  aria-expanded={isOpen}
                >
                  {t.name}
                  <span className="nv-chev"><ChevDown /></span>
                  {isOpen && <ContentDropdown item={t} />}
                </button>
              );
            })}
          </div>
        )}

        {tail && <div className="nv-tail">{tail}</div>}
      </div>

      {/* Mega panel for a category with nested children */}
      {openItem && !openIsFlat && (
        <MegaPanel
          item={openItem}
          l2Id={l2Id}
          setL2Id={setL2Id}
          featured={featured[openItem.id]}
        />
      )}
      {openId === "__all" && <AllCategoriesPanel tree={tree} />}
      {openId === "__more" && hidden.length > 0 && (
        <MoreMegaPanel items={hidden} featured={featured} />
      )}
    </div>
  );
}

// ─── Mega panel for one top-level category ──────────────────────────────────

function MegaPanel({
  item,
  l2Id,
  setL2Id,
  featured,
}: {
  item: NavNode;
  l2Id: string | null;
  setL2Id: (id: string) => void;
  featured?: FeatureCard;
}) {
  const l2s = item.children ?? [];
  const l2sWithKids = l2s.filter((c) => (c.children ?? []).length > 0);
  const active = l2sWithKids.find((c) => c.id === l2Id) || l2sWithKids[0] || l2s[0];
  const l3s = active?.children ?? [];

  let cols = "cols-3";
  if (l3s.length <= 2) cols = "cols-2";
  else if (l3s.length >= 8) cols = "cols-4";

  const noRail = l3s.length >= 9 || !featured;

  return (
    <div className={`nv-mega ${noRail ? "no-rail" : ""}`}>
      <div className="nv-mega-inner">
        <ul className="nv-l2">
          {l2s.map((c) => {
            const hasKids = (c.children ?? []).length > 0;
            const isActive = hasKids && c.id === active?.id;
            return (
              <li key={c.id} className={isActive ? "on" : ""}>
                {hasKids ? (
                  <button onClick={() => setL2Id(c.id)}>
                    <span>{c.name}</span>
                    <span className="arr"><ChevRight /></span>
                  </button>
                ) : (
                  <Link href={hrefFor(c)}>
                    <span>{c.name}</span>
                  </Link>
                )}
              </li>
            );
          })}
          <li style={{ marginTop: 12 }}>
            <Link href={hrefFor(item)} style={{ color: "var(--primary)", fontWeight: 600 }}>
              <span>View all {item.name.toLowerCase()}</span>
              <span className="arr" style={{ color: "var(--primary)" }}><ArrowRight /></span>
            </Link>
          </li>
        </ul>

        <div className="nv-l3-wrap">
          {active && (
            <>
              <div className="nv-l3-head">
                <div><h3>{active.name}</h3></div>
                <Link className="all" href={hrefFor(active)}>
                  {item.type === "content" ? "Browse all" : "Shop all"}
                  <span className="arr"><ArrowRight /></span>
                </Link>
              </div>

              {l3s.length > 0 && (
                <div className={`nv-l3 ${cols}`}>
                  {l3s.map((g) => {
                    const l4 = g.children ?? [];
                    const shown = l4.slice(0, 5);
                    const overflow = l4.length - shown.length;
                    return (
                      <div className="group" key={g.id}>
                        <Link href={hrefFor(g)}><span>{g.name}</span></Link>
                        {shown.length > 0 && (
                          <ul>
                            {shown.map((s) => (
                              <li key={s.id}>
                                <Link href={hrefFor(s)}><span>{s.name}</span></Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {overflow > 0 && (
                          <Link className="more-link" href={hrefFor(g)}>
                            +{overflow} more
                            <span className="arr"><ArrowRight /></span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {!noRail && featured && (
          <div className="nv-rail">
            <Link className="nv-feature" href={featured.href}>
              <div className="nv-feature-img" data-label={`featured · ${item.name.toLowerCase()}`} />
              <div className="body">
                {featured.eyebrow && <div className="eyebrow">{featured.eyebrow}</div>}
                <h4>{featured.title}</h4>
                {featured.sub && <p>{featured.sub}</p>}
                {featured.cta && (
                  <span className="cta">
                    {featured.cta}
                    <span className="arr"><ArrowRight /></span>
                  </span>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── "All Categories" overview grid ─────────────────────────────────────────

function AllCategoriesPanel({ tree }: { tree: NavNode[] }) {
  const browseable = tree.filter((t) => (t.children ?? []).length > 0);
  // When the catalog is flat (no subcategories), fall back to listing the
  // top-level categories themselves so the panel is never empty.
  const cols = browseable.length > 0 ? browseable : tree;
  return (
    <div className="nv-mega all">
      <div className="nv-mega-inner">
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: 16,
              paddingBottom: 12,
              borderBottom: "1px solid var(--line)",
            }}
          >
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 600, margin: 0, letterSpacing: "-.005em" }}>
              All Categories
            </h3>
          </div>
          <div className="nv-all-grid">
            {cols.map((t) => (
              <div className="nv-all-col" key={t.id}>
                <h4>
                  <Link href={hrefFor(t)}>{t.name}</Link>
                </h4>
                <ul>
                  {(t.children ?? []).slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <Link href={hrefFor(c)}>{c.name}</Link>
                    </li>
                  ))}
                  {(t.children ?? []).length > 6 && (
                    <li>
                      <Link href={hrefFor(t)} style={{ color: "var(--muted)", fontWeight: 500 }}>
                        More {t.name.toLowerCase()} →
                      </Link>
                    </li>
                  )}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── "More" mega panel — L1 picker + cascade ────────────────────────────────

function MoreMegaPanel({
  items,
  featured,
}: {
  items: NavNode[];
  featured: Record<string, FeatureCard>;
}) {
  const [l1Id, setL1Id] = useState<string | undefined>(items[0]?.id);
  const [l2Id, setL2Id] = useState<string | null>(null);

  const activeL1 = items.find((i) => i.id === l1Id) || items[0];
  const l2s = activeL1?.children ?? [];
  const l2sWithKids = l2s.filter((c) => (c.children ?? []).length > 0);
  const activeL2 = l2sWithKids.find((c) => c.id === l2Id) || l2sWithKids[0] || l2s[0];
  const l3s = activeL2?.children ?? [];

  const prevL1 = useRef(activeL1?.id);
  useEffect(() => {
    if (prevL1.current !== activeL1?.id) {
      prevL1.current = activeL1?.id;
      setL2Id(null);
    }
  }, [activeL1?.id]);

  if (!activeL1) return null;

  let cols = "cols-3";
  if (l3s.length <= 2) cols = "cols-2";
  else if (l3s.length >= 8) cols = "cols-4";
  const feat = featured[activeL1.id];
  const noRail = l3s.length >= 9 || !feat;

  return (
    <div className={`nv-mega more ${noRail ? "no-rail" : ""}`}>
      <div className="nv-mega-inner more">
        <ul className="nv-l1">
          <li className="lbl">More departments</li>
          {items.map((t) => (
            <li key={t.id} className={t.id === activeL1.id ? "on" : ""}>
              <button onClick={() => setL1Id(t.id)}>
                <span>{t.name}</span>
                <span className="arr"><ChevRight /></span>
              </button>
            </li>
          ))}
        </ul>

        <ul className="nv-l2">
          {l2s.map((c) => {
            const hasKids = (c.children ?? []).length > 0;
            const isActive = hasKids && c.id === activeL2?.id;
            return (
              <li key={c.id} className={isActive ? "on" : ""}>
                {hasKids ? (
                  <button onClick={() => setL2Id(c.id)}>
                    <span>{c.name}</span>
                    <span className="arr"><ChevRight /></span>
                  </button>
                ) : (
                  <Link href={hrefFor(c)}><span>{c.name}</span></Link>
                )}
              </li>
            );
          })}
        </ul>

        <div className="nv-l3-wrap">
          {activeL2 && (
            <>
              <div className="nv-l3-head">
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 4 }}>
                    {activeL1.name}
                  </div>
                  <h3>{activeL2.name}</h3>
                </div>
                <Link className="all" href={hrefFor(activeL2)}>
                  Shop all
                  <span className="arr"><ArrowRight /></span>
                </Link>
              </div>
              {l3s.length > 0 && (
                <div className={`nv-l3 ${cols}`}>
                  {l3s.map((g) => {
                    const l4 = g.children ?? [];
                    const shown = l4.slice(0, 5);
                    const overflow = l4.length - shown.length;
                    return (
                      <div className="group" key={g.id}>
                        <Link href={hrefFor(g)}><span>{g.name}</span></Link>
                        {shown.length > 0 && (
                          <ul>
                            {shown.map((s) => (
                              <li key={s.id}>
                                <Link href={hrefFor(s)}><span>{s.name}</span></Link>
                              </li>
                            ))}
                          </ul>
                        )}
                        {overflow > 0 && (
                          <Link className="more-link" href={hrefFor(g)}>
                            +{overflow} more
                            <span className="arr"><ArrowRight /></span>
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {!noRail && feat && (
          <div className="nv-rail">
            <Link className="nv-feature" href={feat.href}>
              <div className="nv-feature-img" data-label={`featured · ${activeL1.name.toLowerCase()}`} />
              <div className="body">
                {feat.eyebrow && <div className="eyebrow">{feat.eyebrow}</div>}
                <h4>{feat.title}</h4>
                {feat.sub && <p>{feat.sub}</p>}
                {feat.cta && (
                  <span className="cta">
                    {feat.cta}
                    <span className="arr"><ArrowRight /></span>
                  </span>
                )}
              </div>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Compact dropdown for flat / content items ──────────────────────────────

function ContentDropdown({ item }: { item: NavNode }) {
  const [openSubId, setOpenSubId] = useState<string | null>(null);
  const [flipAll, setFlipAll] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!openSubId) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpenSubId(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [openSubId]);

  useLayoutEffect(() => {
    if (!rootRef.current) return;
    const measure = () => {
      const r = rootRef.current!.getBoundingClientRect();
      const assumedSubWidth = 260;
      const overflowRight = r.right + assumedSubWidth + 16 > window.innerWidth - 8;
      const inRightHalf = r.left > window.innerWidth / 2;
      setFlipAll(overflowRight || inRightHalf);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const toggleSub = (id: string) => setOpenSubId((prev) => (prev === id ? null : id));

  // Collapse the open sub-menu on navigation (clicking a leaf <Link>).
  const pathname = usePathname();
  useEffect(() => {
    setOpenSubId(null);
  }, [pathname]);

  return (
    <span
      className={`nv-content-dropdown ${flipAll ? "flip-subs" : ""}`}
      ref={rootRef}
      onClick={(e) => e.stopPropagation()}
    >
      {(item.children ?? []).map((c) => {
        const hasSub = (c.children ?? []).length > 0;
        if (hasSub) {
          return (
            <span
              key={c.id}
              className={`item has-sub ${openSubId === c.id ? "sub-open" : ""}`}
              onClick={(e) => { e.preventDefault(); toggleSub(c.id); }}
            >
              <span className="label-link">{c.name}</span>
              <span className="arr"><ChevRight /></span>
              <span className="nv-content-sub" onClick={(e) => e.stopPropagation()}>
                {(c.children ?? []).map((s) => (
                  <Link key={s.id} href={hrefFor(s)} target={s.target}>
                    <span>{s.name}</span>
                    <span className="arr"><ChevRight /></span>
                  </Link>
                ))}
              </span>
            </span>
          );
        }
        return (
          <Link key={c.id} href={hrefFor(c)} target={c.target}>
            <span>{c.name}</span>
            <span className="arr"><ChevRight /></span>
          </Link>
        );
      })}
    </span>
  );
}
