"use client";

// Header search autocomplete — native Shopify.
//
// A self-contained typeahead over /api/shopify/search (Storefront
// predictiveSearch). Replaces the former @algolia/autocomplete-js build. Reuses
// the existing `.aa-*` styles in globals.css so the look is unchanged: 36px
// bordered form + "Search" button, dropdown panel with product rows, a
// "Need help?" empty state, a "see all results" footer, and a no-results note.

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useLocation } from "@/components/location-provider";
import { getSearchPhrases } from "@/lib/search-phrases";
import type { SearchProduct } from "@/lib/shopify/queries/search";

const TYPED_KEY = "acme_search_typed";

async function runTypewriter(inputEl: HTMLInputElement, phrases: string[]) {
  if (!phrases.length) return;
  if (sessionStorage.getItem(TYPED_KEY)) return;
  sessionStorage.setItem(TYPED_KEY, "1");

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const alive = () => document.contains(inputEl) && !inputEl.value;

  inputEl.placeholder = "";
  await sleep(700);

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    for (let j = 1; j <= phrase.length; j++) {
      if (!alive()) return;
      inputEl.placeholder = phrase.slice(0, j);
      await sleep(52);
    }
    if (i === phrases.length - 1) break;
    await sleep(1800);
    for (let j = phrase.length - 1; j >= 0; j--) {
      if (!alive()) return;
      inputEl.placeholder = phrase.slice(0, j);
      await sleep(26);
    }
    await sleep(400);
  }
}

// Bold the matched query substring in a product title.
function highlight(text: string, q: string) {
  const query = q.trim();
  if (!query) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <Fragment>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </Fragment>
  );
}

function productUrl(p: SearchProduct): string {
  const path = (p.path ?? "").trim();
  if (path && path !== "#" && path !== "/") return path;
  const sku = (p.sku ?? "").trim();
  return sku ? `/search?q=${encodeURIComponent(sku)}` : "/search";
}

export function SearchBox({
  placeholder = "Search by SKU, MPN, UPC, or keyword…",
}: {
  placeholder?: string;
}) {
  const router = useRouter();
  const { activeContact } = useLocation();

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const reqRef = useRef(0);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const trimmed = query.trim();

  // Debounced native predictive search.
  useEffect(() => {
    setActiveIndex(-1);
    if (!trimmed) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const reqId = ++reqRef.current;
      try {
        const res = await fetch(`/api/shopify/search?q=${encodeURIComponent(trimmed)}&limit=8`);
        const data: { products?: SearchProduct[] } = await res.json();
        if (reqRef.current === reqId) { setResults(data.products ?? []); setLoading(false); }
      } catch {
        if (reqRef.current === reqId) { setResults([]); setLoading(false); }
      }
    }, 200);
    return () => clearTimeout(t);
  }, [trimmed]);

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Typewriter placeholder — once per session.
  useEffect(() => {
    if (inputRef.current) {
      const phrases = [placeholder, ...getSearchPhrases()].filter(Boolean);
      runTypewriter(inputRef.current, phrases);
    }
  }, [placeholder]);

  const submit = useCallback((q: string) => {
    const v = q.trim();
    if (!v) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(v)}`);
  }, [router]);

  const go = useCallback((p: SearchProduct) => {
    setOpen(false);
    router.push(productUrl(p));
  }, [router]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && results[activeIndex]) go(results[activeIndex]);
      else submit(query);
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showPanel = open;
  const showHelp = showPanel && !trimmed;
  const showResults = showPanel && !!trimmed;

  return (
    <div ref={wrapperRef} className="aa-wrapper">
      <form
        className="aa-Form"
        role="search"
        onSubmit={(e) => { e.preventDefault(); submit(query); }}
      >
        <input
          ref={inputRef}
          className="aa-Input"
          type="search"
          autoComplete="off"
          spellCheck={false}
          placeholder={placeholder}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          aria-label="Search products"
        />
        <button type="submit" className="aa-SubmitButton" aria-label="Search">
          <span className="aa-search-label">
            <Icon name="search" size={14} />
            <span className="aa-search-text">Search</span>
          </span>
        </button>
      </form>

      {showPanel && (
        <div className="aa-Panel">
          <div className="aa-PanelLayout">
            {showHelp && <HelpCard contact={activeContact} />}

            {showResults && results.length > 0 && (
              <>
                <ul className="aa-List" role="listbox" aria-label="Search results">
                  {results.map((p, i) => (
                    <li
                      key={p.handle + i}
                      className="aa-Item"
                      role="option"
                      aria-selected={i === activeIndex}
                      onMouseEnter={() => setActiveIndex(i)}
                      onMouseDown={(e) => { e.preventDefault(); go(p); }}
                    >
                      <div className="aa-product-item">
                        <div className="aa-product-thumb">
                          {p.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <Icon name="pkg" size={14} />
                          )}
                        </div>
                        <div className="aa-product-info">
                          <div className="aa-product-meta">
                            {p.sku}{p.vendor ? ` · ${p.vendor}` : ""}
                          </div>
                          <div className="aa-product-name">{highlight(p.title, trimmed)}</div>
                        </div>
                        <div className="aa-product-price">
                          {p.price > 0 && <div className="aa-price-value">${p.price.toFixed(2)}</div>}
                          <div className={`aa-stock-badge ${p.inStock ? "in-stock" : "backorder"}`}>
                            {p.inStock ? `${p.stockQty.toLocaleString()} in stock` : "Backorder"}
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <a
                  href={`/search?q=${encodeURIComponent(trimmed)}`}
                  className="aa-footer-link"
                  onMouseDown={(e) => { e.preventDefault(); submit(query); }}
                >
                  <Icon name="search" size={13} />
                  See all results for &ldquo;{trimmed}&rdquo;
                  <Icon name="arrow" size={13} />
                </a>
              </>
            )}

            {showResults && results.length === 0 && !loading && (
              <div className="aa-no-results">
                No products found — try a different keyword or SKU.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function HelpCard({ contact }: { contact: ReturnType<typeof useLocation>["activeContact"] }) {
  const hasContact = Boolean(contact.phone || contact.email);
  return (
    <div className="aa-help-card">
      <p className="aa-help-title">Need help?</p>
      <p className="aa-help-sub">Questions about specs, availability, or pricing?</p>
      {hasContact && (
        <div className="aa-help-actions">
          {contact.phone && (
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn btn-ghost btn-sm btn-block" style={{ textDecoration: "none" }}>
              <Icon name="headset" size={13} />
              Chat with our team
            </a>
          )}
          {contact.email && (
            <a href={`mailto:${contact.email}`} className="btn btn-ghost btn-sm btn-block" style={{ textDecoration: "none" }}>
              <Icon name="quote" size={13} />
              Email our team
            </a>
          )}
        </div>
      )}
      {(contact.locationName || contact.hours) && (
        <p className="aa-help-meta">
          {contact.locationName && (
            <span className="aa-help-meta-row">
              <Icon name="pin" size={12} />
              {contact.locationName}
            </span>
          )}
          {contact.hours && (
            <span className="aa-help-meta-row">
              <Icon name="info" size={12} />
              {contact.hours}
            </span>
          )}
        </p>
      )}
    </div>
  );
}
