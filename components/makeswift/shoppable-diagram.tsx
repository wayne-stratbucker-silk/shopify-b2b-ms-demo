"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { useToast } from "@/components/ui/toast";
import { Icon } from "@/components/ui/icons";
import { FinishedSkuNotice, type UnfinishedSkuInfo } from "@/components/makeswift/finished-sku-notice";
import {
  Style,
  TextInput,
  TextArea,
  List,
  Shape,
  Image,
  Number as NumberCtrl,
} from "@makeswift/runtime/controls";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HotspotDef {
  // Position is a 0–100 percentage of the stage image's width/height.
  x?: number;
  y?: number;
  sku?: string;
  defaultQuantity?: number;
}

interface JobDef {
  eyebrow?: string;
  title?: string;
  copy?: string;
  jobId?: string;
  mainImage?: unknown;
  hotspots?: HotspotDef[];
}

interface ProductInfo {
  sku: string;
  name: string;
  brand?: string;
  price: number;
  listPrice?: number;
  stock?: number;
  imageUrl?: string;
}

// Makeswift Image control returns either a URL string or an `{ url, ... }` object.
function toUrl(v: unknown): string | undefined {
  if (!v) return undefined;
  if (typeof v === "string") return v;
  if (typeof v === "object" && v !== null && "url" in v) {
    return (v as { url?: string }).url;
  }
  return undefined;
}

const fmtUSD = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

// ─── Data: batch-fetch all SKUs across all jobs (abort-safe) ────────────────

interface ProductsApiResponse {
  products?: Array<{
    sku: string;
    name: string;
    brand?: string;
    unitPriceRaw?: number;
    listPriceRaw?: number;
    stock?: number;
    imageUrl?: string;
    variants?: Array<{ sku: string }>;
  }>;
}

function useJobProducts(jobs: JobDef[]) {
  const [productMap, setProductMap] = useState<Record<string, ProductInfo>>({});
  // Entered SKUs that are parent products with variants (not finished SKUs).
  const [unfinished, setUnfinished] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);

  const skuKey = useMemo(
    () =>
      [
        ...new Set(
          jobs.flatMap((j) =>
            (j.hotspots ?? [])
              .map((h) => h.sku?.trim())
              .filter((s): s is string => Boolean(s)),
          ),
        ),
      ]
        .sort()
        .join(","),
    [jobs],
  );

  useEffect(() => {
    if (!skuKey) {
      setProductMap({});
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    fetch(`/api/shopify/products?skus=${encodeURIComponent(skuKey)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json() as Promise<ProductsApiResponse>)
      .then((data) => {
        if (ctrl.signal.aborted) return;
        const map: Record<string, ProductInfo> = {};
        const unfin: Record<string, string[]> = {};
        for (const p of data.products ?? []) {
          // Parent SKU of a variant product → not finished. Skip it and record
          // it so the builder can prompt for a specific variant SKU.
          if (p.variants && p.variants.length > 0) {
            unfin[p.sku] = p.variants.map((v) => v.sku).filter(Boolean);
            continue;
          }
          map[p.sku] = {
            sku: p.sku,
            name: p.name,
            brand: p.brand,
            price: p.unitPriceRaw ?? 0,
            listPrice: p.listPriceRaw,
            stock: p.stock,
            imageUrl: p.imageUrl,
          };
        }
        setProductMap(map);
        setUnfinished(unfin);
        if (Object.keys(unfin).length) {
          console.warn(
            "[shoppable-diagram] Ignoring parent SKUs with variants (enter a variant SKU):",
            Object.keys(unfin).join(", "),
          );
        }
      })
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name === "AbortError") return;
        setProductMap({});
        setUnfinished({});
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });
    return () => ctrl.abort();
  }, [skuKey]);

  return { productMap, unfinished, loading };
}

// ─── Media query hook ────────────────────────────────────────────────────────

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const update = () => setMatches(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return matches;
}

// ─── Hotspot resolution (de-duplicate pin numbers by SKU) ────────────────────

interface ResolvedHotspot {
  hotspotIdx: number;       // original index in the job's hotspots[]
  pinNumber: number;        // 1-based display number — same SKU shares the same number
  x: number;
  y: number;
  sku: string;
  qty: number;
  info?: ProductInfo;
}

function resolveHotspots(
  job: JobDef | undefined,
  productMap: Record<string, ProductInfo>,
  qtyOverrides: Record<number, number>,
): { resolved: ResolvedHotspot[]; pinNumberMap: Record<string, number> } {
  if (!job?.hotspots?.length) return { resolved: [], pinNumberMap: {} };

  // Assign a unique pin number per unique SKU, in order of first appearance.
  const pinNumberMap: Record<string, number> = {};
  let next = 1;
  for (const h of job.hotspots) {
    const sku = h.sku?.trim();
    if (!sku) continue;
    if (!(sku in pinNumberMap)) {
      pinNumberMap[sku] = next++;
    }
  }

  const resolved: ResolvedHotspot[] = job.hotspots
    .map((h, idx): ResolvedHotspot | null => {
      const sku = h.sku?.trim();
      if (!sku) return null;
      return {
        hotspotIdx: idx,
        pinNumber: pinNumberMap[sku],
        x: Math.max(0, Math.min(100, h.x ?? 50)),
        y: Math.max(0, Math.min(100, h.y ?? 50)),
        sku,
        qty: qtyOverrides[idx] ?? h.defaultQuantity ?? 1,
        info: productMap[sku],
      };
    })
    .filter((h): h is ResolvedHotspot => h != null);

  return { resolved, pinNumberMap };
}

// ─── Scene picker (desktop) ──────────────────────────────────────────────────

interface ScenePickerProps {
  jobs: JobDef[];
  activeIdx: number;
  onChange: (idx: number) => void;
}

function ScenePicker({ jobs, activeIdx, onChange }: ScenePickerProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const active = jobs[activeIdx];

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div className="scene-picker" ref={wrapRef}>
      <button
        type="button"
        className="scene-picker-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {active?.title?.trim() || `Scene ${activeIdx + 1}`}
        <span className="chev" aria-hidden="true" />
      </button>
      {open && (
        <div className="scene-picker-menu" role="listbox">
          {jobs.map((j, i) => {
            const count = (j.hotspots ?? []).filter((h) => h.sku?.trim()).length;
            return (
              <button
                key={i}
                type="button"
                role="option"
                aria-selected={i === activeIdx}
                className={`scene-picker-item${i === activeIdx ? " active" : ""}`}
                onClick={() => {
                  onChange(i);
                  setOpen(false);
                }}
              >
                <span style={{ minWidth: 0, flex: 1 }}>
                  <span className="name">{j.title?.trim() || `Scene ${i + 1}`}</span>
                  <span className="sub">
                    {(j.jobId?.trim() || `JOB-${i + 1}`).toUpperCase()} ·{" "}
                    {count} {count === 1 ? "ITEM" : "ITEMS"}
                  </span>
                </span>
                {i === activeIdx && (
                  <svg
                    className="check"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Hotspot popover ─────────────────────────────────────────────────────────

interface HotspotPopProps {
  h: ResolvedHotspot;
  adding: boolean;
  added: boolean;
  errored: boolean;
  onAdd: () => void;
  containerSize: { width: number; height: number };
  canPlaceOrders: boolean;
}

const POP_WIDTH = 260;
const POP_HEIGHT_ESTIMATE = 150;
const POP_GAP = 14;

function HotspotPop({ h, adding, added, errored, onAdd, containerSize, canPlaceOrders }: HotspotPopProps) {
  // Reference design flip thresholds: flipX when x > 65%, flipY when y > 65%.
  // We also fall back to overflow checks when the container is measured.
  const flipX = h.x > 65;
  const flipY = h.y > 65;

  const style: React.CSSProperties = { width: POP_WIDTH };

  if (containerSize.width > 0 && containerSize.height > 0) {
    const hxPx = (h.x / 100) * containerSize.width;
    const hyPx = (h.y / 100) * containerSize.height;
    const spaceBelow = containerSize.height - hyPx;
    const spaceAbove = hyPx;
    const wantsAbove = flipY || spaceBelow < POP_HEIGHT_ESTIMATE + POP_GAP;
    if (wantsAbove && spaceAbove > spaceBelow) {
      style.bottom = `${POP_GAP + 18}px`;
    } else {
      style.top = `${POP_GAP + 18}px`;
    }

    // Horizontal: center on hotspot, clamped to [8, width-8].
    const halfPop = POP_WIDTH / 2;
    let leftOffsetPx = flipX ? -POP_WIDTH + 18 : -halfPop;
    if (hxPx + leftOffsetPx < 8) leftOffsetPx = -hxPx + 8;
    if (hxPx + leftOffsetPx + POP_WIDTH > containerSize.width - 8) {
      leftOffsetPx = containerSize.width - 8 - hxPx - POP_WIDTH;
    }
    style.left = `${leftOffsetPx}px`;
  } else {
    // Fallback purely on reference flip thresholds.
    if (flipY) style.bottom = `${POP_GAP + 18}px`;
    else style.top = `${POP_GAP + 18}px`;
    style.left = flipX ? `${-POP_WIDTH + 18}px` : `${-POP_WIDTH / 2}px`;
  }

  const info = h.info;

  return (
    <div
      className="hotspot-pop"
      role="dialog"
      aria-label={`Item ${h.pinNumber}`}
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="row">
        <span className="sku">
          {h.sku}
          {info?.brand ? ` · ${info.brand}` : ""}
        </span>
      </div>
      <div className="name">{info?.name ?? "Loading…"}</div>
      <div className="price">
        {info ? fmtUSD(info.price) : "—"}
        <span className="ea">/EA</span>
      </div>
      <div className="foot">
        <span className="meta">QTY {h.qty}</span>
        <button
          type="button"
          onClick={onAdd}
          disabled={adding || !info}
          className={`add${added ? " ok" : ""}${errored ? " err" : ""}`}
        >
          {adding
            ? "Adding…"
            : added
              ? (canPlaceOrders ? "Added" : "Quoted")
              : errored
                ? "Failed"
                : canPlaceOrders
                  ? `Add ${h.qty}`
                  : `Quote ${h.qty}`}
        </button>
      </div>
    </div>
  );
}

// ─── Desktop layout ──────────────────────────────────────────────────────────

interface DesktopProps {
  job: JobDef;
  jobs: JobDef[];
  jobIdx: number;
  onJobChange: (idx: number) => void;
  resolved: ResolvedHotspot[];
  loading: boolean;
  addAllLabel?: string;
  activeKey: string | null;
  onActivateKey: (key: string | null) => void;
  addOne: (h: ResolvedHotspot) => void;
  addingHs: number | null;
  addedHs: number | null;
  erroredHs: number | null;
  addAll: () => void;
  addingAll: boolean;
  addedAll: boolean;
  erroredAll: boolean;
  validItemCount: number;
  subtotal: number;
  uniqueSkuCount: number;
  onSaveAsList: () => void;
  addToQuote: () => void;
  addingQuote: boolean;
  addedQuote: boolean;
  /** When false the user's role only allows quoting — swap primary CTA */
  canPlaceOrders: boolean;
}

function DesktopScene(props: DesktopProps) {
  const {
    job,
    jobs,
    jobIdx,
    onJobChange,
    resolved,
    loading,
    activeKey,
    onActivateKey,
    addOne,
    addingHs,
    addedHs,
    erroredHs,
    addAll,
    addingAll,
    addedAll,
    erroredAll,
    addAllLabel,
    validItemCount,
    subtotal,
    uniqueSkuCount,
    onSaveAsList,
    addToQuote,
    addingQuote,
    addedQuote,
    canPlaceOrders,
  } = props;

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStageSize({ width: r.width, height: r.height });
    };
    measure();
    let ro: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
    } else {
      window.addEventListener("resize", measure);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", measure);
    };
  }, []);

  const mainImageUrl = toUrl(job.mainImage);
  const jobLabel = (job.jobId?.trim() || `JOB-${jobIdx + 1}`).toUpperCase();

  return (
    <div className="scene">
      <div
        className="scene-stage"
        ref={stageRef}
        onClick={() => onActivateKey(null)}
      >
        {mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="scene-art"
            src={mainImageUrl}
            alt={job.title ?? "Shoppable scene"}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div className="scene-art-empty">Add a stage image in the editor</div>
        )}

        <div className="scene-meta">
          <span className="dot" aria-hidden="true" />
          <span>
            SCENE / {jobLabel}-A.SVG · {validItemCount}{" "}
            {validItemCount === 1 ? "ITEM" : "ITEMS"}
          </span>
        </div>

        {jobs.length > 1 && (
          <ScenePicker jobs={jobs} activeIdx={jobIdx} onChange={onJobChange} />
        )}

        {resolved.map((h) => {
          const key = `${jobIdx}:${h.hotspotIdx}`;
          const isOpen = activeKey === key;
          return (
            <div
              key={key}
              className={`hotspot${isOpen ? " on" : ""}`}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              onMouseEnter={() => onActivateKey(key)}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className="pin"
                aria-label={`Pin ${h.pinNumber} — ${h.sku}`}
                aria-pressed={isOpen}
                onClick={(e) => {
                  e.stopPropagation();
                  onActivateKey(isOpen ? null : key);
                }}
              >
                {h.pinNumber}
              </button>
              {isOpen && (
                <HotspotPop
                  h={h}
                  adding={addingHs === h.hotspotIdx}
                  added={addedHs === h.hotspotIdx}
                  errored={erroredHs === h.hotspotIdx}
                  onAdd={() => addOne(h)}
                  containerSize={stageSize}
                  canPlaceOrders={canPlaceOrders}
                />
              )}
            </div>
          );
        })}
      </div>

      <aside className="scene-bom" aria-label="Bill of materials">
        <div className="scene-bom-head">
          <div className="eyebrow">
            Bill of materials · {uniqueSkuCount} {uniqueSkuCount === 1 ? "SKU" : "SKUs"}
          </div>
          <h3>{job.title?.trim() || `Scene ${jobIdx + 1}`}</h3>
          {job.copy?.trim() && <p className="sub">{job.copy}</p>}
        </div>
        <div className="scene-bom-list">
          {resolved.length === 0 && (
            <div
              style={{
                padding: "20px 18px",
                color: "var(--muted)",
                fontSize: 13,
              }}
            >
              {loading ? "Loading products…" : "Add hotspots with SKUs to populate the BOM."}
            </div>
          )}
          {resolved.map((h) => {
            const key = `${jobIdx}:${h.hotspotIdx}`;
            const isOn = activeKey === key;
            const line = (h.info?.price ?? 0) * h.qty;
            return (
              <button
                key={key}
                type="button"
                className={`scene-bom-row${isOn ? " on" : ""}`}
                onMouseEnter={() => onActivateKey(key)}
                onMouseLeave={() => {
                  if (activeKey === key) onActivateKey(null);
                }}
                onFocus={() => onActivateKey(key)}
                onClick={() => addOne(h)}
              >
                <span className="num">{h.pinNumber}</span>
                <span className="body">
                  <span className="sku">{h.sku}</span>
                  <span className="name">{h.info?.name ?? (loading ? "Loading…" : "Product not found")}</span>
                </span>
                <span className="price">
                  <div>{fmtUSD(line)}</div>
                  <div className="qty">QTY {h.qty}</div>
                </span>
              </button>
            );
          })}
        </div>
        <div className="scene-bom-foot">
          <div className="sub-row">
            <span className="lbl">Subtotal</span>
            <span>{fmtUSD(subtotal)}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {canPlaceOrders ? (
              /* Default: ATC primary, quote + list secondary */
              <>
                <button
                  type="button"
                  className="btn btn-lg"
                  onClick={addAll}
                  disabled={addingAll || validItemCount === 0}
                  style={{
                    width: "100%",
                    ...(addedAll
                      ? { background: "var(--success)", borderColor: "var(--success)" }
                      : erroredAll
                        ? { background: "var(--danger)", borderColor: "var(--danger)" }
                        : {}),
                  }}
                >
                  <Icon name={addedAll ? "check" : "cart"} size={16} />
                  {addingAll
                    ? "Adding all…"
                    : addedAll
                      ? "Added to cart"
                      : erroredAll
                        ? "Failed — try again"
                        : (addAllLabel ?? `Add all ${validItemCount} to cart`)}
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={addToQuote}
                    disabled={addingQuote || validItemCount === 0}
                    style={{ width: "100%" }}
                  >
                    <Icon name={addedQuote ? "check" : "quote"} size={15} />
                    {addingQuote ? "Adding…" : addedQuote ? "Added to quote" : "Add to quote"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onSaveAsList}
                    disabled={validItemCount === 0}
                    style={{ width: "100%" }}
                  >
                    <Icon name="list" size={15} />
                    Add to list
                  </button>
                </div>
              </>
            ) : (
              /* Quote-only role: Add to quote primary, ATC + list secondary */
              <>
                <button
                  type="button"
                  className="btn btn-lg"
                  onClick={addToQuote}
                  disabled={addingQuote || validItemCount === 0}
                  style={{
                    width: "100%",
                    ...(addedQuote
                      ? { background: "var(--success)", borderColor: "var(--success)" }
                      : {}),
                  }}
                >
                  <Icon name={addedQuote ? "check" : "quote"} size={16} />
                  {addingQuote
                    ? "Adding to quote…"
                    : addedQuote
                      ? "Added to quote"
                      : `Add all ${validItemCount} to quote`}
                </button>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={addAll}
                    disabled={addingAll || validItemCount === 0}
                    style={{ width: "100%" }}
                  >
                    <Icon name={addedAll ? "check" : "cart"} size={15} />
                    {addingAll ? "Adding…" : addedAll ? "Added to cart" : "Add to cart"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={onSaveAsList}
                    disabled={validItemCount === 0}
                    style={{ width: "100%" }}
                  >
                    <Icon name="list" size={15} />
                    Add to list
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─── Mobile layout ───────────────────────────────────────────────────────────

interface MobileProps {
  job: JobDef;
  jobs: JobDef[];
  jobIdx: number;
  onJobChange: (idx: number) => void;
  resolved: ResolvedHotspot[];
  loading: boolean;
  activeKey: string | null;
  onActivateKey: (key: string | null) => void;
  addOne: (h: ResolvedHotspot) => void;
  addingHs: number | null;
  addedHs: number | null;
  erroredHs: number | null;
  addAll: () => void;
  addingAll: boolean;
  addedAll: boolean;
  erroredAll: boolean;
  validItemCount: number;
  subtotal: number;
  addAllLabel?: string;
  onSaveAsList: () => void;
  addToQuote: () => void;
  addingQuote: boolean;
  addedQuote: boolean;
  canPlaceOrders: boolean;
}

function MobileScene(props: MobileProps) {
  const {
    job,
    jobs,
    jobIdx,
    onJobChange,
    resolved,
    loading,
    activeKey,
    onActivateKey,
    addOne,
    addingHs,
    addedHs,
    erroredHs,
    addAll,
    addingAll,
    addedAll,
    erroredAll,
    validItemCount,
    subtotal,
    addAllLabel,
    onSaveAsList,
    addToQuote,
    addingQuote,
    addedQuote,
    canPlaceOrders,
  } = props;

  const stripRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // When a hotspot becomes active, snap-scroll the strip to the matching card.
  useEffect(() => {
    if (!activeKey) return;
    const strip = stripRef.current;
    const card = cardRefs.current[activeKey];
    if (!strip || !card) return;
    const stripRect = strip.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const delta = cardRect.left - stripRect.left - 12;
    strip.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeKey]);

  const mainImageUrl = toUrl(job.mainImage);
  const jobLabel = (job.jobId?.trim() || `JOB-${jobIdx + 1}`).toUpperCase();

  return (
    <div className="m-scene">
      {jobs.length > 1 && (
        <div className="m-scene-tabs" role="tablist">
          {jobs.map((j, i) => {
            const count = (j.hotspots ?? []).filter((h) => h.sku?.trim()).length;
            return (
              <button
                key={i}
                type="button"
                role="tab"
                aria-selected={i === jobIdx}
                className={`m-scene-tab${i === jobIdx ? " on" : ""}`}
                onClick={() => onJobChange(i)}
              >
                {j.title?.trim() || `Scene ${i + 1}`}
                <span className="ct">{count}</span>
              </button>
            );
          })}
        </div>
      )}

      <div className="m-scene-stage" onClick={() => onActivateKey(null)}>
        {mainImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="scene-art"
            src={mainImageUrl}
            alt={job.title ?? "Shoppable scene"}
            loading="lazy"
            decoding="async"
            draggable={false}
          />
        ) : (
          <div className="scene-art-empty">Add a stage image in the editor</div>
        )}

        <div className="scene-meta">
          <span className="dot" aria-hidden="true" />
          <span>
            {jobLabel}-A · {validItemCount} {validItemCount === 1 ? "ITEM" : "ITEMS"}
          </span>
        </div>
        <div className="m-scene-hint">Tap a pin to jump to item</div>

        {resolved.map((h) => {
          const key = `${jobIdx}:${h.hotspotIdx}`;
          const isOn = activeKey === key;
          return (
            <button
              key={key}
              type="button"
              className={`m-hotspot${isOn ? " on" : ""}`}
              style={{ left: `${h.x}%`, top: `${h.y}%` }}
              aria-label={`Pin ${h.pinNumber} — ${h.sku}`}
              aria-pressed={isOn}
              onClick={(e) => {
                e.stopPropagation();
                onActivateKey(key);
              }}
            >
              <span className="pin">{h.pinNumber}</span>
            </button>
          );
        })}
      </div>

      <div className="m-scene-strip" ref={stripRef}>
        {resolved.length === 0 && (
          <div
            style={{
              padding: "12px",
              color: "var(--muted)",
              fontSize: 13,
              flex: "0 0 100%",
            }}
          >
            {loading ? "Loading products…" : "Add hotspots with SKUs to populate the BOM."}
          </div>
        )}
        {resolved.map((h) => {
          const key = `${jobIdx}:${h.hotspotIdx}`;
          const isOn = activeKey === key;
          const line = (h.info?.price ?? 0) * h.qty;
          return (
            <div
              key={key}
              ref={(el) => {
                cardRefs.current[key] = el;
              }}
              className={`m-scene-card${isOn ? " on" : ""}`}
              onClick={() => onActivateKey(key)}
            >
              <div className="head">
                <span className="num">{h.pinNumber}</span>
                <span className="sku">
                  {h.sku}
                  {h.info?.brand ? ` · ${h.info.brand}` : ""}
                </span>
              </div>
              <div className="name">
                {h.info?.name ?? (loading ? "Loading…" : "Product not found")}
              </div>
              <div className="row">
                <span className="price">{fmtUSD(line)}</span>
                <span className="qty">QTY {h.qty}</span>
              </div>
              <button
                type="button"
                className={`add${addedHs === h.hotspotIdx ? " ok" : ""}${erroredHs === h.hotspotIdx ? " err" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  addOne(h);
                }}
                disabled={addingHs === h.hotspotIdx || !h.info}
              >
                {addingHs === h.hotspotIdx
                  ? "Adding…"
                  : addedHs === h.hotspotIdx
                    ? "Added"
                    : erroredHs === h.hotspotIdx
                      ? "Failed"
                      : `Add ${h.qty}`}
              </button>
            </div>
          );
        })}
      </div>

      <div className="m-scene-foot" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
        <div className="sub-col" style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <span className="lbl">Subtotal</span>
          <span className="val">{fmtUSD(subtotal)}</span>
        </div>
        {canPlaceOrders ? (
          /* Default: ATC primary, quote + list secondary */
          <>
            <button
              type="button"
              className="btn btn-lg"
              onClick={addAll}
              disabled={addingAll || validItemCount === 0}
              style={{
                width: "100%",
                ...(addedAll
                  ? { background: "var(--success)", borderColor: "var(--success)" }
                  : erroredAll
                    ? { background: "var(--danger)", borderColor: "var(--danger)" }
                    : {}),
              }}
            >
              <Icon name={addedAll ? "check" : "cart"} size={16} />
              {addingAll
                ? "Adding all…"
                : addedAll
                  ? "Added to cart"
                  : erroredAll
                    ? "Failed — retry"
                    : (addAllLabel ?? `Add all ${validItemCount} to cart`)}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addToQuote}
                disabled={addingQuote || validItemCount === 0}
                style={{ width: "100%" }}
              >
                <Icon name={addedQuote ? "check" : "quote"} size={15} />
                {addingQuote ? "Adding…" : addedQuote ? "Added to quote" : "Add to quote"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onSaveAsList}
                disabled={validItemCount === 0}
                style={{ width: "100%" }}
              >
                <Icon name="list" size={15} />
                Add to list
              </button>
            </div>
          </>
        ) : (
          /* Quote-only role: Add to quote primary, ATC + list secondary */
          <>
            <button
              type="button"
              className="btn btn-lg"
              onClick={addToQuote}
              disabled={addingQuote || validItemCount === 0}
              style={{
                width: "100%",
                ...(addedQuote
                  ? { background: "var(--success)", borderColor: "var(--success)" }
                  : {}),
              }}
            >
              <Icon name={addedQuote ? "check" : "quote"} size={16} />
              {addingQuote
                ? "Adding to quote…"
                : addedQuote
                  ? "Added to quote"
                  : `Add all ${validItemCount} to quote`}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={addAll}
                disabled={addingAll || validItemCount === 0}
                style={{ width: "100%" }}
              >
                <Icon name={addedAll ? "check" : "cart"} size={15} />
                {addingAll ? "Adding…" : addedAll ? "Added to cart" : "Add to cart"}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onSaveAsList}
                disabled={validItemCount === 0}
                style={{ width: "100%" }}
              >
                <Icon name="list" size={15} />
                Add to list
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface ShoppableDiagramProps {
  className?: string;
  eyebrow?: string;
  heading?: string;
  copy?: string;
  jobs?: JobDef[];
  addAllLabel?: string;
}

function ShoppableDiagram(props: ShoppableDiagramProps) {
  const { className, eyebrow, heading, copy, jobs: jobsProp, addAllLabel } = props;

  const jobsRaw = useMemo(() => jobsProp ?? [], [jobsProp]);
  const [activeJobIdx, setActiveJobIdx] = useState(0);

  // Session / permissions — determines CTA order (quote-only users lead with Add to Quote)
  const [session, setSession] = useState<{ b2bCompanyId?: number; permissions?: string[] } | null>(null);
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setSession(d.user); })
      .catch(() => {});
  }, []);
  // Non-B2B users can always place orders. B2B users need company.orders.create.
  const canPlaceOrders = !session?.b2bCompanyId
    || session?.permissions?.includes("company.orders.create") === true;
  const { productMap, unfinished, loading } = useJobProducts(jobsRaw);

  // Only finished SKUs are shoppable — strip parent-of-variant hotspots so they
  // never render as pins, BOM rows, or add-to-cart items. The builder notice
  // tells the author which variant SKUs to use instead.
  const jobs: JobDef[] = useMemo(
    () => jobsRaw.map((j) => ({
      ...j,
      hotspots: (j.hotspots ?? []).filter((h) => !(h.sku?.trim() && unfinished[h.sku.trim()])),
    })),
    [jobsRaw, unfinished],
  );
  const unfinishedItems: UnfinishedSkuInfo[] = useMemo(
    () => Object.entries(unfinished).map(([sku, variantSkus]) => ({ sku, variantSkus })),
    [unfinished],
  );

  const safeIdx = Math.min(activeJobIdx, Math.max(jobs.length - 1, 0));
  const activeJob: JobDef | undefined = jobs[safeIdx];

  // Per-hotspot quantities, keyed by `${jobIdx}:${hotspotIdx}`.
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  // Helper to pull per-job qty overrides keyed by hotspot idx.
  const jobQtyOverrides = useMemo(() => {
    const out: Record<number, number> = {};
    for (const [k, v] of Object.entries(quantities)) {
      const [jStr, hStr] = k.split(":");
      if (parseInt(jStr, 10) === safeIdx) out[parseInt(hStr, 10)] = v;
    }
    return out;
  }, [quantities, safeIdx]);

  const { toast } = useToast();

  const { resolved, pinNumberMap } = useMemo(
    () => resolveHotspots(activeJob, productMap, jobQtyOverrides),
    [activeJob, productMap, jobQtyOverrides],
  );

  // Active hotspot key (`${jobIdx}:${hotspotIdx}`) — shared between desktop pin
  // popover and BOM row, and between mobile pin and strip card.
  const [activeKey, setActiveKey] = useState<string | null>(null);
  useEffect(() => {
    setActiveKey(null);
  }, [safeIdx]);

  // Cart-add state, keyed by hotspot index within the active job.
  const [addingHs, setAddingHs] = useState<number | null>(null);
  const [addedHs, setAddedHs] = useState<number | null>(null);
  const [erroredHs, setErroredHs] = useState<number | null>(null);
  const [addingAll, setAddingAll] = useState(false);
  const [addedAll, setAddedAll] = useState(false);
  const [erroredAll, setErroredAll] = useState(false);

  const addOne = useCallback(async (h: ResolvedHotspot) => {
    setAddingHs(h.hotspotIdx);
    setErroredHs(null);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ sku: h.sku, quantity: h.qty }] }),
      });
      if (res.ok) {
        setAddedHs(h.hotspotIdx);
        window.dispatchEvent(new Event("storage"));
        setTimeout(() => setAddedHs(null), 2000);
      } else {
        setErroredHs(h.hotspotIdx);
        setTimeout(() => setErroredHs(null), 2500);
      }
    } catch {
      setErroredHs(h.hotspotIdx);
      setTimeout(() => setErroredHs(null), 2500);
    } finally {
      setAddingHs(null);
    }
  }, []);

  const addAll = useCallback(async () => {
    if (!resolved.length) return;

    // Collapse duplicate SKUs (two hotspots with same SKU sum their qty).
    const totals = new Map<string, number>();
    for (const h of resolved) {
      totals.set(h.sku, (totals.get(h.sku) ?? 0) + h.qty);
    }
    const items = [...totals.entries()].map(([sku, quantity]) => ({ sku, quantity }));

    setAddingAll(true);
    setErroredAll(false);
    setAddedAll(false);
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        setAddedAll(true);
        window.dispatchEvent(new Event("storage"));
        toast(`Added ${items.length} item${items.length === 1 ? "" : "s"} to your cart`, "success");
        setTimeout(() => setAddedAll(false), 3000);
      } else {
        setErroredAll(true);
        toast("Could not add to cart. Please try again.", "error");
        setTimeout(() => setErroredAll(false), 3000);
      }
    } catch {
      setErroredAll(true);
      toast("Could not add to cart. Please try again.", "error");
      setTimeout(() => setErroredAll(false), 3000);
    } finally {
      setAddingAll(false);
    }
  }, [resolved, toast]);

  // ── Add all to quote ──
  // The quote-cart endpoint is single-item only (POST /api/quotes/cart/add),
  // so we loop sequentially over the resolved lines, collapsing duplicate SKUs
  // (sum qty) first. Product metadata is pulled from the already-fetched map.
  const [addingQuote, setAddingQuote] = useState(false);
  const [addedQuote, setAddedQuote] = useState(false);
  const addToQuote = useCallback(async () => {
    if (addingQuote || !resolved.length) return;

    const totals = new Map<string, number>();
    for (const h of resolved) {
      totals.set(h.sku, (totals.get(h.sku) ?? 0) + h.qty);
    }

    setAddingQuote(true);
    setAddedQuote(false);
    let ok = 0;
    let fail = 0;
    try {
      for (const [sku, qty] of totals.entries()) {
        const info = productMap[sku];
        try {
          const res = await fetch("/api/quotes/cart/add", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sku,
              qty,
              productName: info?.name ?? sku,
              unitPrice: info?.price ?? 0,
              imageUrl: info?.imageUrl,
            }),
          });
          if (res.ok) ok++;
          else fail++;
        } catch {
          fail++;
        }
      }
      window.dispatchEvent(new Event("quoteCartUpdate"));
      if (ok > 0 && fail === 0) {
        setAddedQuote(true);
        toast(`Added ${ok} item${ok === 1 ? "" : "s"} to your quote`, "success");
        setTimeout(() => setAddedQuote(false), 3000);
      } else if (ok > 0) {
        setAddedQuote(true);
        toast(`Added ${ok} item${ok === 1 ? "" : "s"}; ${fail} failed`, "error");
        setTimeout(() => setAddedQuote(false), 3000);
      } else {
        toast("Could not add to quote. Please try again.", "error");
      }
    } finally {
      setAddingQuote(false);
    }
  }, [addingQuote, resolved, productMap, toast]);

  const savingListRef = useRef(false);
  const onSaveAsList = useCallback(async () => {
    if (savingListRef.current || !resolved.length) return;
    savingListRef.current = true;
    try {
      // SKUs + quantities; the server resolves them to productId/variantId
      // pairs, creates the B2B shopping list, and adds the items.
      const items = resolved.map((h) => ({ sku: h.sku, quantity: h.qty }));
      const res = await fetch("/api/b2b/lists/from-skus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: number; error?: string };
      if (res.ok && data.id) {
        toast("List saved — opening it now…", "success");
        window.location.href = `/account/lists/${data.id}`;
      } else if (res.status === 401) {
        window.location.href = "/login";
      } else {
        toast(data.error ?? "Could not save list. Please try again.", "error");
      }
    } catch {
      toast("Could not save list. Please try again.", "error");
    } finally {
      savingListRef.current = false;
    }
  }, [resolved, toast]);

  // Suppress unused vars in the closure form (quantities setter retained for
  // future per-hotspot stepper UI on desktop, which is intentionally omitted
  // from the popover per the reference design).
  void setQuantities;
  void pinNumberMap;

  const isMobile = useMediaQuery("(max-width: 768px)");

  // ── Empty state (editor-friendly) ──
  if (!jobs.length) {
    return (
      <section className={className ?? ""} style={{ padding: 0 }}>
        <div
          className="container"
          style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}
        >
          Add scenes in the Makeswift editor to configure this Shoppable Diagram.
        </div>
      </section>
    );
  }

  const validItemCount = resolved.length;
  const uniqueSkuCount = new Set(resolved.map((h) => h.sku)).size;
  const subtotal = resolved.reduce((sum, h) => sum + (h.info?.price ?? 0) * h.qty, 0);

  // Header above the scene (eyebrow / heading / copy) — desktop only, kept
  // for editor-driven section framing. The BOM rail already shows scene
  // title + copy on desktop, so we hide them above when active job sets
  // its own scene-level fields.
  const showSectionHeader = Boolean(
    (eyebrow && !activeJob?.eyebrow) ||
      (heading && !activeJob?.title) ||
      (copy && !activeJob?.copy),
  );

  return (
    <section className={className ?? ""} style={{ padding: 0 }}>
      <div className="container">
        {showSectionHeader && (
          <div style={{ marginBottom: 24, maxWidth: 760 }}>
            {eyebrow && <span className="eyebrow">{eyebrow}</span>}
            {heading && (
              <h2
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  margin: "6px 0 0",
                }}
              >
                {heading}
              </h2>
            )}
            {copy && (
              <p style={{ color: "var(--muted)", margin: "8px 0 0", fontSize: 14 }}>
                {copy}
              </p>
            )}
          </div>
        )}

        <FinishedSkuNotice items={unfinishedItems} />

        {activeJob &&
          (isMobile ? (
            <MobileScene
              job={activeJob}
              jobs={jobs}
              jobIdx={safeIdx}
              onJobChange={setActiveJobIdx}
              resolved={resolved}
              loading={loading}
              activeKey={activeKey}
              onActivateKey={setActiveKey}
              addOne={addOne}
              addingHs={addingHs}
              addedHs={addedHs}
              erroredHs={erroredHs}
              addAll={addAll}
              addingAll={addingAll}
              addedAll={addedAll}
              erroredAll={erroredAll}
              validItemCount={validItemCount}
              subtotal={subtotal}
              addAllLabel={addAllLabel}
              onSaveAsList={onSaveAsList}
              addToQuote={addToQuote}
              addingQuote={addingQuote}
              addedQuote={addedQuote}
              canPlaceOrders={canPlaceOrders}
            />
          ) : (
            <DesktopScene
              job={activeJob}
              jobs={jobs}
              jobIdx={safeIdx}
              onJobChange={setActiveJobIdx}
              resolved={resolved}
              loading={loading}
              activeKey={activeKey}
              onActivateKey={setActiveKey}
              addOne={addOne}
              addingHs={addingHs}
              addedHs={addedHs}
              erroredHs={erroredHs}
              addAll={addAll}
              addingAll={addingAll}
              addedAll={addedAll}
              erroredAll={erroredAll}
              addAllLabel={addAllLabel}
              validItemCount={validItemCount}
              subtotal={subtotal}
              uniqueSkuCount={uniqueSkuCount}
              onSaveAsList={onSaveAsList}
              addToQuote={addToQuote}
              addingQuote={addingQuote}
              addedQuote={addedQuote}
              canPlaceOrders={canPlaceOrders}
            />
          ))}
      </div>
    </section>
  );
}

// ─── Makeswift registration ──────────────────────────────────────────────────
//
// The per-hotspot product UI is a text-input for the BC SKU, mirroring
// `shop-by-job` and `product-carousel`. Resolution happens at runtime via
// `/api/bc/products?skus=…` (identity-only, never leaks the Algolia admin
// key). The companion `/api/bc/product-picker` endpoint exists, but the
// Makeswift stock `TextInput` control cannot drive a remote searchable
// picker without a custom control implementation.
//
// TODO(shoppable): Replace the per-hotspot SKU `TextInput` with a custom
// Makeswift control that calls `/api/bc/product-picker?q=…` to search and
// `?skus=…` to resolve, returning the selected SKU. Building a fully
// custom control is out of scope for this rewrite; until then, admins
// type SKUs by hand (same pattern as Shop by Job).
runtime.registerComponent(ShoppableDiagram, {
  type: "acme-shoppable-diagram",
  label: "Products & Ordering / Shoppable Diagram",
  props: {
    className: Style(),
    eyebrow: TextInput({
      label: "Section eyebrow (above scene, optional)",
      defaultValue: "",
    }),
    heading: TextInput({
      label: "Section heading (above scene, optional)",
      defaultValue: "",
    }),
    copy: TextArea({
      label: "Section copy (above scene, optional)",
      defaultValue: "",
    }),
    addAllLabel: TextInput({
      label: "Add-all button label (leave blank for auto)",
    }),
    jobs: List({
      label: "Scenes",
      type: Shape({
        type: {
          jobId: TextInput({
            label: "Job code (e.g. WAREHOUSE-001) — shown in the stage label",
            defaultValue: "",
          }),
          eyebrow: TextInput({ label: "Eyebrow (unused on the scene UI)", defaultValue: "" }),
          title: TextInput({ label: "Scene title", defaultValue: "New scene" }),
          copy: TextArea({ label: "Scene copy (shown in the BOM rail header)" }),
          mainImage: Image({ label: "Stage image", format: Image.Format.URL }),
          hotspots: List({
            label: "Hotspots",
            type: Shape({
              type: {
                x: NumberCtrl({
                  label: "X position (%)",
                  defaultValue: 50,
                  min: 0,
                  max: 100,
                  step: 0.1,
                }),
                y: NumberCtrl({
                  label: "Y position (%)",
                  defaultValue: 50,
                  min: 0,
                  max: 100,
                  step: 0.1,
                }),
                sku: TextInput({ label: "Product SKU" }),
                defaultQuantity: NumberCtrl({
                  label: "Default quantity",
                  defaultValue: 1,
                  min: 1,
                  step: 1,
                }),
              },
            }),
            getItemLabel: (item) => {
              const h = item as HotspotDef;
              const pos = `(${(h?.x ?? 0).toFixed(0)}, ${(h?.y ?? 0).toFixed(0)})`;
              return h?.sku ? `${h.sku} ${pos}` : `Hotspot ${pos}`;
            },
          }),
        },
      }),
      getItemLabel: (item) => {
        const j = item as JobDef;
        return j?.title?.trim() || "Scene";
      },
    }),
  },
});

export default ShoppableDiagram;
