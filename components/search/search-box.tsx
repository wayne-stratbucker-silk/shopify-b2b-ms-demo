"use client";

import { createElement, Fragment, useEffect, useRef } from "react";
import type { Root } from "react-dom/client";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icons";
import { useLocation } from "@/components/location-provider";
import { getSearchPhrases } from "@/lib/search-phrases";
import { normalizeHit, type RawConnectorHit } from "@/lib/algolia/connector-hit";

const TYPED_KEY = "acme_search_typed";

async function runTypewriter(inputEl: HTMLInputElement, phrases: string[]) {
  if (!phrases.length) return;
  if (sessionStorage.getItem(TYPED_KEY)) return;
  sessionStorage.setItem(TYPED_KEY, "1");

  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const alive = () => document.contains(inputEl);

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

const APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
const SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
const INDEX = "catalyst B2B demo";

interface ProductHit {
  objectID: string;
  sku: string;
  parentSku?: string;
  name: string;
  price?: number;
  stockQty?: number;
  brand?: string;
  path?: string;
  image?: string | null;
  // Required by @algolia/autocomplete-js BaseItem constraint
  [key: string]: unknown;
}

// Resolve a search hit to its product URL. Uses the indexed path; if missing,
// falls back to a SKU search so the click never dead-ends on bare /search.
function itemUrl(item: ProductHit): string {
  const path = (item.path ?? "").trim();
  if (path && path !== "#" && path !== "/") return path;
  const sku = (item.sku ?? "").trim();
  return sku ? `/search?q=${encodeURIComponent(sku)}` : "/search";
}

export function SearchBox({
  placeholder = "Search by SKU, MPN, UPC, or keyword…",
}: {
  placeholder?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRootRef = useRef<Root | null>(null);
  const rootRef = useRef<Element | null>(null);
  const router = useRouter();
  const { activeContact } = useLocation();
  const activeContactRef = useRef(activeContact);
  useEffect(() => { activeContactRef.current = activeContact; }, [activeContact]);

  useEffect(() => {
    if (!containerRef.current || !APP_ID || !SEARCH_KEY) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let instance: any = null;
    let cancelled = false;

    // Lazily load the heavy Algolia autocomplete bundle (and its theme) only
    // after mount, so it stays out of the shared client bundle and off the
    // initial main-thread / TTI critical path on every page.
    Promise.all([
      import("@algolia/autocomplete-js"),
      import("algoliasearch/lite"),
      import("react-dom/client"),
      // @ts-expect-error — CSS side-effect import has no type
      import("@algolia/autocomplete-theme-classic"),
    ]).then(([aa, algolia, rdc]) => {
      if (cancelled || !containerRef.current) return;
      const { autocomplete, getAlgoliaResults } = aa;
      const { createRoot } = rdc;
      const searchClient = algolia.liteClient(APP_ID, SEARCH_KEY);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      instance = (autocomplete as any)({
        container: containerRef.current,
        panelContainer: document.body,
        placeholder,
        openOnFocus: true,
        insights: false,
        renderer: { createElement, Fragment, render: () => {} },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        render({ children }: any, root: any) {
          if (!panelRootRef.current || rootRef.current !== root) {
            rootRef.current = root;
            panelRootRef.current?.unmount();
            panelRootRef.current = createRoot(root);
          }
          panelRootRef.current.render(children);
        },
        // Submit → navigate to SERP
        onSubmit({ state }: { state: { query: string } }) {
          const q = state.query.trim();
          if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
        },
        // Custom submit button: render "Search" label + icon
        submitButtonIconComponent: (() => (
          <span className="aa-search-label">
            <Icon name="search" size={14} />
            <span className="aa-search-text">Search</span>
          </span>
        )) as unknown as undefined,
        getSources({ query }: { query: string }) {
          if (!query.trim() || !searchClient) {
            const contact = activeContactRef.current;
            return [{
              sourceId: "help",
              getItems: () => [],
              templates: {
                header() {
                  // Mirror the PDP "Need help?" contact card (components/pdp-contact-card.tsx).
                  // Same data source: useLocation().activeContact. Render only the
                  // values that are actually present — never fabricate contact info.
                  const hasContact = Boolean(contact.phone || contact.email);
                  return (
                    <div className="aa-help-card">
                      <p className="aa-help-title">Need help?</p>
                      <p className="aa-help-sub">
                        Questions about specs, availability, or pricing?
                      </p>
                      {hasContact && (
                        <div className="aa-help-actions">
                          {contact.phone && (
                            <a
                              href={`tel:${contact.phone.replace(/\s/g, "")}`}
                              className="btn btn-ghost btn-sm btn-block"
                              style={{ textDecoration: "none" }}
                            >
                              <Icon name="headset" size={13} />
                              Chat with our team
                            </a>
                          )}
                          {contact.email && (
                            <a
                              href={`mailto:${contact.email}`}
                              className="btn btn-ghost btn-sm btn-block"
                              style={{ textDecoration: "none" }}
                            >
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
                },
              },
            }];
          }
          return [
            {
              sourceId: "products",
              getItems() {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return (getAlgoliaResults as any)({
                  searchClient,
                  queries: [
                    {
                      indexName: INDEX,
                      params: { query, hitsPerPage: 12 },
                    },
                  ],
                });
              },
              transformItems(items: RawConnectorHit[]) {
                // Normalize connector records (brand_name/image_url/…) into the
                // canonical fields ProductItem reads, preserving _highlightResult
                // for <Highlight>. Show all matches (cards fall back to a
                // placeholder thumb); don't drop image-less products.
                return items.slice(0, 6).map((h) => normalizeHit(h) as unknown as ProductHit);
              },
              getItemUrl({ item }: { item: ProductHit }) {
                return itemUrl(item);
              },
              onSelect({ item }: { item: ProductHit }) {
                router.push(itemUrl(item));
              },
              templates: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                item({ item, components }: any) {
                  return <ProductItem hit={item} components={components} />;
                },
                footer({ state }: { state: { query: string } }) {
                  return (
                    <a
                      href={`/search?q=${encodeURIComponent(state.query)}`}
                      className="aa-footer-link"
                    >
                      <Icon name="search" size={13} />
                      See all results for &ldquo;{state.query}&rdquo;
                      <Icon name="arrow" size={13} />
                    </a>
                  );
                },
                noResults() {
                  return (
                    <div className="aa-no-results">
                      No products found — try a different keyword or SKU.
                    </div>
                  );
                },
              },
            },
          ];
        },
      });

      // Typewriter: run once per session on the real input (skipped in detached/mobile mode)
      const inputEl = containerRef.current?.querySelector<HTMLInputElement>("input.aa-Input");
      if (inputEl) {
        const allPhrases = [placeholder, ...getSearchPhrases()].filter(Boolean);
        runTypewriter(inputEl, allPhrases);
      }
    });

    return () => {
      cancelled = true;
      instance?.destroy();
      panelRootRef.current?.unmount();
      panelRootRef.current = null;
    };
  // router is stable in Next.js App Router; placeholder rarely changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="aa-wrapper" />;
}

function ProductItem({
  hit,
  components,
}: {
  hit: ProductHit;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  components: any;
}) {
  return (
    <div className="aa-product-item">
      <div className="aa-product-thumb">
        {hit.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hit.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Icon name="pkg" size={14} />
        )}
      </div>
      <div className="aa-product-info">
        <div className="aa-product-meta">
          {hit.sku}
          {hit.brand ? ` · ${hit.brand}` : ""}
        </div>
        <div className="aa-product-name">
          <components.Highlight hit={hit} attribute="name" />
        </div>
      </div>
      <div className="aa-product-price">
        {hit.price != null && (
          <div className="aa-price-value">${hit.price.toFixed(2)}</div>
        )}
        <div
          className={`aa-stock-badge ${
            (hit.stockQty ?? 0) > 0 ? "in-stock" : "backorder"
          }`}
        >
          {(hit.stockQty ?? 0) > 0
            ? `${(hit.stockQty ?? 0).toLocaleString()} in stock`
            : "Backorder"}
        </div>
      </div>
    </div>
  );
}
