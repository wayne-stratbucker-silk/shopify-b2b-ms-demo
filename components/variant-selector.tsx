"use client";

import React, { useState, useEffect } from "react";
type BCMgmtVariant = {
  id: number;
  sku: string;
  price?: number;
  inventory_level?: number;
  upc?: string;
  mpn?: string;
  option_values: Array<{ option_id: number; id: number; option_display_name: string; label: string }>;
};
type ProductOptionConfig = { displayName: string; optionId: number; displayStyle?: string; values: Array<ProductOptionValueConfig> };
type ProductOptionValueConfig = { label: string; isDefault: boolean; id: number; colors?: string[] };
import { BuyBox } from "@/components/buy-box";
import type { Product } from "@/types";

interface Props {
  baseProduct: Product;
  variants: BCMgmtVariant[];
  optionConfig?: ProductOptionConfig[];
  isLoggedIn?: boolean;
  productName: string;
  // Server-rendered Makeswift freight note, forwarded to the buy box's
  // Availability section. Opaque ReactNode — never inspected here.
  freightNote?: React.ReactNode;
}

// The brand | SKU | UPC | MPN identifier line, rendered above the title.
// Each value reflects the selected variant when the variant carries that data
// point, otherwise it falls back to the parent product's value.
function IdentifierLine({
  brand,
  sku,
  upc,
  mpn,
}: {
  brand?: string;
  sku: string;
  upc?: string;
  mpn?: string;
}) {
  const sep = <span style={{ color: "var(--line-2)" }}>|</span>;
  const segments: React.ReactNode[] = [];
  if (brand) segments.push(<span key="brand">{brand}</span>);
  segments.push(<span key="sku">SKU: {sku}</span>);
  if (upc) segments.push(<span key="upc">UPC: {upc}</span>);
  if (mpn && mpn !== sku) segments.push(<span key="mpn">MPN: {mpn}</span>);

  return (
    <div className="mono muted" style={{ fontSize: 12, display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
      {segments.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && sep}
          {seg}
        </React.Fragment>
      ))}
    </div>
  );
}

// Resolve the variant whose option_values match every selected value.
function findVariant(
  variants: BCMgmtVariant[],
  selected: Record<number, number>,
): BCMgmtVariant | undefined {
  const optionIds = Object.keys(selected).map(Number);
  return variants.find((v) =>
    optionIds.every((optId) =>
      v.option_values.some(
        (ov) => ov.option_id === optId && ov.id === selected[optId],
      ),
    ),
  );
}

export function VariantSelector({ baseProduct: base, variants, optionConfig, isLoggedIn, productName, freightNote }: Props) {
  // Per-option selected value: { [optionId]: optionValueId }. Seeded from the
  // first variant so a concrete variant is always resolved.
  const [selected, setSelected] = useState<Record<number, number>>(() => {
    const seed: Record<number, number> = {};
    for (const ov of variants[0]?.option_values ?? []) {
      seed[ov.option_id] = ov.id;
    }
    return seed;
  });

  // Customer (price-list) price per variant, pulled dynamically from
  // /api/bc/prices. Price lists carry variant-level records, so the wholesale
  // price must be resolved for the SELECTED variant — the static BC catalog
  // variant price is not the customer's price. Cached per variant id.
  const [variantPrices, setVariantPrices] = useState<Map<number, number>>(new Map());
  const selectedVariant = findVariant(variants, selected) ?? variants[0];
  const selectedVariantId = selectedVariant?.id;
  const productId = parseInt(base.id, 10);

  useEffect(() => {
    if (!isLoggedIn || selectedVariantId == null || !Number.isFinite(productId)) return;
    if (variantPrices.has(selectedVariantId)) return;
    let alive = true;
    fetch(`/api/shopify/prices?ids=${productId}:${selectedVariantId}`)
      .then((r) => r.json())
      .then((d: { prices?: Record<string, { price: number }> }) => {
        if (!alive) return;
        const price = d.prices?.[String(productId)]?.price;
        if (price != null && price > 0) {
          setVariantPrices((prev) => new Map(prev).set(selectedVariantId, price));
        }
      })
      .catch(() => { /* keep catalog price */ });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVariantId, productId, isLoggedIn]);

  const title = (
    <h1 className="pdp-title" style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-.02em", lineHeight: 1.2, margin: 0 }}>
      {productName}
    </h1>
  );

  if (!variants.length || !variants[0]?.option_values?.length) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <IdentifierLine brand={base.brand} sku={base.sku} upc={base.upc} mpn={base.mpn} />
        {title}
        <BuyBox product={base} isLoggedIn={isLoggedIn} variantId={undefined} freightNote={freightNote} />
      </div>
    );
  }

  // Build the active product by merging the selected variant's price/inventory
  // into base. Prefer the dynamically-resolved price-list (wholesale) price for
  // this variant; fall back to the static BC catalog price when none applies.
  const customerVariantPrice = selectedVariantId != null ? variantPrices.get(selectedVariantId) : undefined;
  const variantPrice = customerVariantPrice ?? selectedVariant.price ?? base.price;
  const variantListPrice = base.listPrice;
  const variantStock = selectedVariant.inventory_level ?? 0;

  // Identifiers update only when the selected variant carries that data point;
  // otherwise inherit the parent product's value.
  const displaySku = selectedVariant.sku || base.sku;
  const displayUpc = selectedVariant.upc?.trim() || base.upc;
  const displayMpn = selectedVariant.mpn?.trim() || base.mpn;

  const product: Product = {
    ...base,
    sku: displaySku,
    upc: displayUpc,
    mpn: displayMpn,
    price: variantPrice,
    listPrice: variantListPrice,
    stockQty: variantStock,
    tiers: base.tiers.map((t, i) => ({
      ...t,
      // Scale tier prices proportionally based on selected variant vs base
      unitPrice: i === 0 ? variantPrice : t.unitPrice * (variantPrice / base.price),
    })),
  };

  function selectValue(optionId: number, valueId: number) {
    setSelected((prev) => ({ ...prev, [optionId]: valueId }));
  }

  // Derive the option groups to render. Prefer the BC display-style config; if
  // it's missing, fall back to grouping the variants' own option_values into a
  // single button row (the legacy behavior).
  const groups: ProductOptionConfig[] = optionConfig && optionConfig.length
    ? optionConfig
    : deriveGroupsFromVariants(variants);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <IdentifierLine brand={base.brand} sku={displaySku} upc={displayUpc} mpn={displayMpn} />
      {title}

      {groups.map((group) => (
        <OptionGroup
          key={group.optionId}
          group={group}
          selectedValueId={selected[group.optionId]}
          variants={variants}
          onSelect={(valueId) => selectValue(group.optionId, valueId)}
        />
      ))}

      {((selectedVariant.inventory_level ?? 0) === 0) && (
        <p style={{ fontSize: 11, color: "var(--warn)", marginTop: -8 }}>
          This variant is out of stock.
        </p>
      )}

      <BuyBox
        product={product}
        isLoggedIn={isLoggedIn}
        variantId={selectedVariant.id}
        forceOutOfStock={((selectedVariant.inventory_level ?? 0) === 0)}
        freightNote={freightNote}
      />
    </div>
  );
}

// ─── A single option, rendered per its BC display style ──────────────────────

function OptionGroup({
  group,
  selectedValueId,
  variants,
  onSelect,
}: {
  group: ProductOptionConfig;
  selectedValueId?: number;
  variants: BCMgmtVariant[];
  onSelect: (valueId: number) => void;
}) {
  // Whether a given option-value id has any in-stock variant.
  const valueInStock = (valueId: number) =>
    variants.some(
      (v) =>
        ((v.inventory_level ?? 0) > 0) &&
        v.option_values.some((ov) => ov.id === valueId),
    );

  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>
        {group.displayName}
      </div>

      {group.displayStyle === "dropdown" ? (
        <select
          value={selectedValueId ?? ""}
          onChange={(e) => onSelect(Number(e.target.value))}
          aria-label={group.displayName}
          style={{
            width: "100%",
            maxWidth: 320,
            height: 40,
            padding: "0 12px",
            border: "1px solid var(--line-2)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13,
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          {group.values.map((val) => {
            const inStock = valueInStock(val.id);
            return (
              <option key={val.id} value={val.id}>
                {val.label}
                {inStock ? "" : " — out of stock"}
              </option>
            );
          })}
        </select>
      ) : group.displayStyle === "swatch" ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {group.values.map((val) => (
            <SwatchChip
              key={val.id}
              val={val}
              isSelected={val.id === selectedValueId}
              inStock={valueInStock(val.id)}
              onSelect={() => onSelect(val.id)}
            />
          ))}
        </div>
      ) : group.displayStyle === "radio" ? (
        // True radio-button style with circular inputs (BC "Radio buttons" type)
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {group.values.map((val) => {
            const isSelected = val.id === selectedValueId;
            const inStock = valueInStock(val.id);
            return (
              <label
                key={val.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  cursor: inStock ? "pointer" : "default",
                  opacity: inStock ? 1 : 0.55,
                }}
              >
                <input
                  type="radio"
                  name={`option-${group.optionId}`}
                  value={val.id}
                  checked={isSelected}
                  onChange={() => onSelect(val.id)}
                  disabled={!inStock}
                  style={{
                    width: 16,
                    height: 16,
                    cursor: inStock ? "pointer" : "default",
                    accentColor: "var(--primary)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    color: inStock ? "var(--ink)" : "var(--muted)",
                    fontWeight: isSelected ? 600 : 400,
                    textDecoration: !inStock ? "line-through" : "none",
                    textDecorationColor: "var(--muted)",
                  }}
                >
                  {val.label}
                  {!inStock && " — out of stock"}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        // "buttons" — rectangle list / product list
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {group.values.map((val) => {
            const isSelected = val.id === selectedValueId;
            const inStock = valueInStock(val.id);
            return (
              <button
                key={val.id}
                type="button"
                onClick={() => onSelect(val.id)}
                aria-pressed={isSelected}
                aria-label={`${val.label}${!inStock ? " — out of stock" : ""}`}
                style={{
                  padding: "6px 14px",
                  border: `1.5px solid ${isSelected ? "var(--primary)" : "var(--line)"}`,
                  borderRadius: "var(--radius)",
                  background: isSelected ? "var(--primary)" : "var(--surface)",
                  color: isSelected ? "#fff" : inStock ? "var(--ink)" : "var(--muted)",
                  fontSize: 12,
                  fontWeight: isSelected ? 600 : 400,
                  cursor: "pointer",
                  opacity: inStock ? 1 : 0.65,
                  fontFamily: "var(--font-geist-mono, monospace)",
                  letterSpacing: "-.01em",
                  transition: "all .12s",
                  textDecoration: !inStock ? "line-through" : "none",
                  textDecorationColor: "var(--muted)",
                  textDecorationThickness: "1.5px",
                }}
              >
                {val.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Color swatch chip ───────────────────────────────────────────────────────

function SwatchChip({
  val,
  isSelected,
  inStock,
  onSelect,
}: {
  val: ProductOptionValueConfig;
  isSelected: boolean;
  inStock: boolean;
  onSelect: () => void;
}) {
  const colors = val.colors && val.colors.length ? val.colors : ["var(--line)"];
  // Split swatches (2–3 colors) get a linear-gradient fill.
  const background =
    colors.length === 1
      ? colors[0]
      : `linear-gradient(135deg, ${colors
          .map((c, i) => `${c} ${(i / colors.length) * 100}% ${((i + 1) / colors.length) * 100}%`)
          .join(", ")})`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      title={val.label}
      aria-label={`${val.label}${!inStock ? " — out of stock" : ""}`}
      style={{
        width: 34,
        height: 34,
        borderRadius: "50%",
        background,
        cursor: "pointer",
        padding: 0,
        opacity: inStock ? 1 : 0.45,
        border: `2px solid ${isSelected ? "var(--ink)" : "var(--line)"}`,
        outline: isSelected ? "2px solid var(--surface)" : "none",
        outlineOffset: -4,
        boxShadow: isSelected ? "0 0 0 1px var(--ink)" : "none",
        transition: "all .12s",
      }}
    />
  );
}

// ─── Fallback: derive option groups from the variants themselves ─────────────
// Used when BC option display config is unavailable. Renders as button rows.

function deriveGroupsFromVariants(variants: BCMgmtVariant[]): ProductOptionConfig[] {
  const byOption = new Map<number, ProductOptionConfig>();
  for (const v of variants) {
    for (const ov of v.option_values) {
      let group = byOption.get(ov.option_id);
      if (!group) {
        group = {
          optionId: ov.option_id,
          displayName: ov.option_display_name ?? "Option",
          displayStyle: "buttons",
          values: [],
        };
        byOption.set(ov.option_id, group);
      }
      if (!group.values.some((existing) => existing.id === ov.id)) {
        if (group) group.values.push({ id: ov.id, label: ov.label, isDefault: false });
      }
    }
  }
  return [...byOption.values()];
}
