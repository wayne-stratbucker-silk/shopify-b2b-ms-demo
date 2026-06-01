"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, List, Shape, Number as NumberCtrl } from "@makeswift/runtime/controls";
import { Icon } from "@/components/ui/icons";
import { FinishedSkuNotice, type UnfinishedSkuInfo } from "@/components/makeswift/finished-sku-notice";

interface JobItem {
  sku?: string;
  quantity?: number;
}

interface JobDef {
  jobName?: string;
  icon?: string;
  items?: JobItem[];
}

interface ProductInfo {
  sku: string;
  name: string;
  price: number;
  imageUrl?: string;
}

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

function useJobProducts(jobs: JobDef[]) {
  const [productMap, setProductMap] = useState<Record<string, ProductInfo>>({});
  // SKUs the admin entered that are parent products with variants (not finished).
  const [unfinished, setUnfinished] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const allSkus = [...new Set(
    jobs.flatMap((j) => (j.items ?? []).map((i) => i.sku).filter(Boolean) as string[])
  )];

  const skuKey = allSkus.join(",");

  useEffect(() => {
    if (!allSkus.length) return;
    setLoading(true);
    fetch(`/api/bc/products?skus=${encodeURIComponent(skuKey)}`)
      .then((r) => r.json())
      .then((data: { products?: Array<{ sku: string; name: string; price: string; imageUrl?: string; variants?: Array<{ sku: string }> }> }) => {
        const map: Record<string, ProductInfo> = {};
        const unfin: Record<string, string[]> = {};
        for (const p of data.products ?? []) {
          // Parent SKU of a variant product → not a finished SKU. Don't add it
          // to the BOM map; record it so the builder can prompt for a variant.
          if (p.variants && p.variants.length > 0) {
            unfin[p.sku] = p.variants.map((v) => v.sku).filter(Boolean);
            continue;
          }
          map[p.sku] = {
            sku: p.sku,
            name: p.name,
            price: parseFloat(p.price.replace(/[^0-9.]/g, "")) || 0,
            imageUrl: p.imageUrl,
          };
        }
        setProductMap(map);
        setUnfinished(unfin);
        if (Object.keys(unfin).length) {
          console.warn(
            "[shop-by-job] Ignoring parent SKUs with variants (enter a variant SKU):",
            Object.keys(unfin).join(", "),
          );
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skuKey]);

  return { productMap, unfinished, loading };
}

function jobTotal(job: JobDef, productMap: Record<string, ProductInfo>): number {
  return (job.items ?? []).reduce((sum, item) => {
    const price = productMap[item.sku ?? ""]?.price ?? 0;
    return sum + price * (item.quantity ?? 1);
  }, 0);
}

function jobSkuCount(job: JobDef): number {
  return (job.items ?? []).filter((i) => i.sku).length;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ShopByJob(props: any) {
  const {
    className,
    eyebrow,
    heading,
    copy,
    jobs: jobsProp,
  } = props as {
    className?: string;
    eyebrow?: string;
    heading?: string;
    copy?: string;
    jobs?: JobDef[];
  };

  const jobsRaw: JobDef[] = useMemo(() => jobsProp ?? [], [jobsProp]);
  const { productMap, unfinished, loading } = useJobProducts(jobsRaw);

  // Only finished SKUs are shoppable. Strip parent-of-variant SKUs from every
  // job's BOM so they never render, get added to cart, or count toward totals.
  const jobs: JobDef[] = useMemo(
    () => jobsRaw.map((j) => ({
      ...j,
      items: (j.items ?? []).filter((i) => !(i.sku && unfinished[i.sku])),
    })),
    [jobsRaw, unfinished],
  );
  const unfinishedItems: UnfinishedSkuInfo[] = useMemo(
    () => Object.entries(unfinished).map(([sku, variantSkus]) => ({ sku, variantSkus })),
    [unfinished],
  );

  // ── Session / permissions state ──
  const [session, setSession] = useState<{ b2bCompanyId?: number; permissions?: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);
  // Non-B2B users can always order. B2B users need company.orders.create permission
  // (configured per role in BC admin — not hardcoded by role number).
  const canPlaceOrders = !session?.b2bCompanyId
    || session?.permissions?.includes("company.orders.create") === true;

  const [adding, setAdding] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [errored, setErrored] = useState<string | null>(null);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [addedItem, setAddedItem] = useState<string | null>(null);
  const [erroredItem, setErroredItem] = useState<string | null>(null);

  const handleAddBOM = useCallback(async (job: JobDef) => {
    const validItems = (job.items ?? []).filter((i) => i.sku);
    if (!validItems.length) return;

    const jobKey = job.jobName ?? "job";
    setAdding(jobKey);

    try {
      const body = {
        items: validItems.map((i) => ({ sku: i.sku!, quantity: i.quantity ?? 1 })),
      };
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setAdded(jobKey);
        setTimeout(() => setAdded(null), 3000);
        window.dispatchEvent(new Event("storage"));
      } else {
        setErrored(jobKey);
        setTimeout(() => setErrored(null), 3000);
      }
    } catch {
      setErrored(jobKey);
      setTimeout(() => setErrored(null), 3000);
    } finally {
      setAdding(null);
    }
  }, []);

  const handleAddItem = useCallback(async (sku: string, quantity: number) => {
    setAddingItem(sku);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ sku, quantity }] }),
      });
      if (res.ok) {
        setAddedItem(sku);
        setTimeout(() => setAddedItem(null), 2000);
        window.dispatchEvent(new Event("storage"));
      } else {
        setErroredItem(sku);
        setTimeout(() => setErroredItem(null), 2500);
      }
    } catch {
      setErroredItem(sku);
      setTimeout(() => setErroredItem(null), 2500);
    } finally {
      setAddingItem(null);
    }
  }, []);

  // ── Add whole BOM to quote cart ───────────────────────────────────────────
  const handleAddBOMToQuote = useCallback(async (job: JobDef) => {
    const validItems = (job.items ?? []).filter((i) => i.sku);
    if (!validItems.length) return;
    const jobKey = job.jobName ?? "job";
    setAdding(jobKey);
    try {
      for (const item of validItems) {
        const info = productMap[item.sku!];
        await fetch("/api/quotes/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sku: item.sku!,
            qty: item.quantity ?? 1,
            productName: info?.name ?? item.sku!,
            unitPrice: info?.price ?? 0,
          }),
        });
      }
      window.dispatchEvent(new Event("quoteCartUpdate"));
      setAdded(jobKey);
      setTimeout(() => setAdded(null), 3000);
    } catch {
      setErrored(jobKey);
      setTimeout(() => setErrored(null), 3000);
    } finally {
      setAdding(null);
    }
  }, [productMap]);

  // ── Add single item to quote cart ─────────────────────────────────────────
  const handleAddItemToQuote = useCallback(async (sku: string, quantity: number) => {
    const info = productMap[sku];
    setAddingItem(sku);
    try {
      await fetch("/api/quotes/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku,
          qty: quantity,
          productName: info?.name ?? sku,
          unitPrice: info?.price ?? 0,
        }),
      });
      window.dispatchEvent(new Event("quoteCartUpdate"));
      setAddedItem(sku);
      setTimeout(() => setAddedItem(null), 2000);
    } catch {
      setErroredItem(sku);
      setTimeout(() => setErroredItem(null), 2500);
    } finally {
      setAddingItem(null);
    }
  }, [productMap]);

  if (!jobs.length) {
    return (
      <section className={className ?? ""} style={{ padding: 0 }}>
        <div className="container" style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
          Add jobs in the Makeswift editor to get started.
        </div>
      </section>
    );
  }

  return (
    <section className={className ?? ""} style={{ padding: 0 }}>
      <div className="container">
        {/* Section header */}
        <div style={{ marginBottom: 36 }}>
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          {heading && (
            <h2 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-.025em", margin: "6px 0 0" }}>
              {heading}
            </h2>
          )}
          {copy && (
            <p style={{ color: "var(--muted)", margin: "10px 0 0", fontSize: 14, maxWidth: 620 }}>
              {copy}
            </p>
          )}
        </div>

        <FinishedSkuNotice items={unfinishedItems} />

        {/* Job list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {jobs.map((job, idx) => {
            const key = job.jobName ?? `job-${idx}`;
            const skuCount = jobSkuCount(job);
            const total = jobTotal(job, productMap);
            const isAdding = adding === key;
            const isAdded = added === key;
            const isErrored = errored === key;
            const validItems = (job.items ?? []).filter((i) => i.sku);
            const isExpanded = expandedJob === key;

            return (
              <div key={key} className="card" style={{ overflow: "hidden" }}>
                {/* Summary row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "18px 24px",
                    gap: 16,
                    cursor: validItems.length > 0 ? "pointer" : "default",
                  }}
                  onClick={(e) => {
                    // Don't toggle if clicking the ATC button
                    if ((e.target as HTMLElement).closest("button")) return;
                    if (validItems.length > 0) {
                      setExpandedJob(isExpanded ? null : key);
                    }
                  }}
                >
                  {/* Left: name + meta */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    {/* Expand chevron */}
                    <span
                      style={{
                        fontSize: 26,
                        fontWeight: 600,
                        color: "var(--muted)",
                        transition: "transform .2s",
                        transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        flexShrink: 0,
                        display: "inline-block",
                        lineHeight: 1,
                        width: 18,
                        textAlign: "center",
                      }}
                    >
                      ›
                    </span>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>
                        {job.jobName || "Untitled job"}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: ".03em" }}>
                        {skuCount} SKU{skuCount !== 1 ? "s" : ""}&nbsp;·&nbsp;BOM ready
                      </div>
                    </div>
                  </div>

                  {/* Right: price + add-all button */}
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                    <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                      {loading ? "—" : fmt(total)}
                    </div>
                    {/* Summary row action — swapped based on role */}
                    {canPlaceOrders ? (
                      // Default: icon button adds to cart
                      <button
                        disabled={isAdding || validItems.length === 0}
                        onClick={(e) => { e.stopPropagation(); handleAddBOM(job); }}
                        title={`Add all ${skuCount} item${skuCount !== 1 ? "s" : ""} to cart`}
                        style={{
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: isAdded ? "var(--success)" : isErrored ? "var(--danger)" : "transparent",
                          color: isAdded || isErrored ? "#fff" : "var(--muted)",
                          cursor: validItems.length === 0 ? "not-allowed" : "pointer",
                          transition: "all .15s",
                          padding: 0,
                        }}
                      >
                        <Icon name={isAdding ? "refresh" : isAdded ? "check" : "cart"} size={15} />
                      </button>
                    ) : (
                      // Buyer: icon button adds to quote
                      <button
                        disabled={isAdding || validItems.length === 0}
                        onClick={(e) => { e.stopPropagation(); handleAddBOMToQuote(job); }}
                        title={`Add all ${skuCount} item${skuCount !== 1 ? "s" : ""} to quote`}
                        style={{
                          width: 32,
                          height: 32,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 6,
                          border: "1px solid var(--line)",
                          background: isAdded ? "var(--success)" : isErrored ? "var(--danger)" : "transparent",
                          color: isAdded || isErrored ? "#fff" : "var(--muted)",
                          cursor: validItems.length === 0 ? "not-allowed" : "pointer",
                          transition: "all .15s",
                          padding: 0,
                        }}
                      >
                        <Icon name={isAdding ? "refresh" : isAdded ? "check" : "quote"} size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* BOM item dropdown */}
                {isExpanded && validItems.length > 0 && (
                  <div
                    style={{
                      borderTop: "1px solid var(--line)",
                      background: "var(--surface, #fafafa)",
                    }}
                  >
                    {validItems.map((item, iIdx) => {
                      const sku = item.sku!;
                      const qty = item.quantity ?? 1;
                      const info = productMap[sku];
                      const linePrice = (info?.price ?? 0) * qty;
                      const isItemAdding = addingItem === sku;
                      const isItemAdded = addedItem === sku;
                      const isItemErrored = erroredItem === sku;

                      return (
                        <div
                          key={`${key}-item-${iIdx}`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 12,
                            padding: "12px 24px",
                            borderBottom: iIdx < validItems.length - 1 ? "1px solid var(--line)" : "none",
                          }}
                        >
                          {/* Thumbnail */}
                          {info?.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={info.imageUrl}
                              alt={info.name}
                              width={40}
                              height={40}
                              loading="lazy"
                              decoding="async"
                              style={{ width: 40, height: 40, objectFit: "contain", borderRadius: 4, flexShrink: 0, border: "1px solid var(--line)" }}
                            />
                          ) : (
                            <div
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 4,
                                border: "1px solid var(--line)",
                                background: "var(--line)",
                                flexShrink: 0,
                              }}
                            />
                          )}

                          {/* Name + SKU */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {info?.name ?? sku}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "monospace" }}>
                              {sku}&nbsp;·&nbsp;qty&nbsp;{qty}
                            </div>
                          </div>

                          {/* Price */}
                          <div style={{ fontSize: 13, fontWeight: 600, fontVariantNumeric: "tabular-nums", flexShrink: 0, minWidth: 64, textAlign: "right" }}>
                            {loading || !info ? "—" : fmt(linePrice)}
                          </div>

                          {/* Mini ATC / Add to quote — swapped based on role */}
                          {canPlaceOrders ? (
                            // Default: adds to cart
                            <button
                              disabled={isItemAdding}
                              onClick={() => handleAddItem(sku, qty)}
                              title={`Add ${sku} to cart`}
                              style={{
                                height: 28,
                                paddingInline: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                borderRadius: 5,
                                border: "1px solid var(--line)",
                                background: isItemAdded ? "var(--success)" : isItemErrored ? "var(--danger)" : "transparent",
                                color: isItemAdded || isItemErrored ? "#fff" : "var(--foreground)",
                                cursor: isItemAdding ? "not-allowed" : "pointer",
                                fontSize: 11,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                transition: "all .15s",
                              }}
                            >
                              <Icon name={isItemAdded ? "check" : "cart"} size={12} />
                              {isItemAdding ? "Adding…" : isItemAdded ? "Added" : isItemErrored ? "Failed" : "Add"}
                            </button>
                          ) : (
                            // Buyer: adds to quote
                            <button
                              disabled={isItemAdding}
                              onClick={() => handleAddItemToQuote(sku, qty)}
                              title={`Add ${sku} to quote`}
                              style={{
                                height: 28,
                                paddingInline: 10,
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                borderRadius: 5,
                                border: "1px solid var(--line)",
                                background: isItemAdded ? "var(--success)" : isItemErrored ? "var(--danger)" : "transparent",
                                color: isItemAdded || isItemErrored ? "#fff" : "var(--foreground)",
                                cursor: isItemAdding ? "not-allowed" : "pointer",
                                fontSize: 11,
                                fontWeight: 500,
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                transition: "all .15s",
                              }}
                            >
                              <Icon name={isItemAdded ? "check" : "quote"} size={12} />
                              {isItemAdding ? "Adding…" : isItemAdded ? "Quoted" : isItemErrored ? "Failed" : "Quote"}
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {/* Footer: add all — swapped based on role */}
                    <div
                      style={{
                        padding: "10px 24px",
                        display: "flex",
                        justifyContent: "flex-end",
                        borderTop: "1px solid var(--line)",
                      }}
                    >
                      {canPlaceOrders ? (
                        // Default: adds all to cart
                        <button
                          disabled={isAdding || validItems.length === 0}
                          onClick={() => handleAddBOM(job)}
                          style={{
                            height: 32,
                            paddingInline: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 6,
                            border: "1px solid var(--line)",
                            background: isAdded ? "var(--success)" : isErrored ? "var(--danger)" : "var(--foreground)",
                            color: "#fff",
                            cursor: validItems.length === 0 ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            transition: "all .15s",
                          }}
                        >
                          <Icon name={isAdded ? "check" : "cart"} size={13} />
                          {isAdding ? "Adding…" : isAdded ? "All Added" : isErrored ? "Failed — try again" : `Add all ${skuCount} items`}
                        </button>
                      ) : (
                        // Buyer: quotes all items
                        <button
                          disabled={isAdding || validItems.length === 0}
                          onClick={() => handleAddBOMToQuote(job)}
                          style={{
                            height: 32,
                            paddingInline: 16,
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            borderRadius: 6,
                            border: "1px solid var(--line)",
                            background: isAdded ? "var(--success)" : isErrored ? "var(--danger)" : "var(--foreground)",
                            color: "#fff",
                            cursor: validItems.length === 0 ? "not-allowed" : "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            transition: "all .15s",
                          }}
                        >
                          <Icon name={isAdded ? "check" : "quote"} size={13} />
                          {isAdding ? "Adding…" : isAdded ? "All Quoted" : isErrored ? "Failed — try again" : `Quote all ${skuCount} items`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

runtime.registerComponent(ShopByJob, {
  type: "acme-shop-by-job",
  label: "Products & Ordering / Shop by Job Type",
  props: {
    className: Style(),
    eyebrow: TextInput({ label: "Eyebrow", defaultValue: "Build your material list" }),
    heading: TextInput({ label: "Heading", defaultValue: "Shop by Job Type" }),
    copy: TextInput({ label: "Subtext", defaultValue: "Select a job type to add the full material list to your cart instantly." }),
    jobs: List({
      label: "Jobs",
      type: Shape({
        type: {
          jobName: TextInput({ label: "Job name", defaultValue: "New job" }),
          items: List({
            label: "BOM items",
            type: Shape({
              type: {
                sku: TextInput({ label: "Product SKU" }),
                quantity: NumberCtrl({ label: "Quantity", defaultValue: 1 }),
              },
            }),
            getItemLabel: (item) => {
              const i = item as { sku?: string; quantity?: number };
              return i?.sku ? `${i.sku} × ${i.quantity ?? 1}` : "Item";
            },
          }),
        },
      }),
      getItemLabel: (item) => (item as { jobName?: string })?.jobName ?? "Job",
    }),
  },
});
