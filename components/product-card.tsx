"use client";

import Link from "next/link";
import Image from "next/image";
import type { Product } from "@/types";
import { Badge } from "./ui/badge";
import { ProductPH, toneFromString } from "./ui/product-placeholder";
import { StockPill } from "./ui/stock-pill";
import { CompareToggle } from "./compare/compare-toggle";
import { trackSelectItem, toGa4Item } from "@/lib/analytics";

interface ProductCardProps {
  product: Product;
  /** List context for select_item attribution (e.g. "Search Results"). */
  listName?: string;
  /** Zero-based position within the list. */
  index?: number;
}

export function ProductCard({ product: p, listName, index }: ProductCardProps) {
  const bestSavingsPct =
    p.tiers.length > 1
      ? Math.round((1 - p.tiers[p.tiers.length - 1].unitPrice / p.price) * 100)
      : 0;

  function handleSelect() {
    trackSelectItem(toGa4Item(p, { index, listName }), listName);
  }

  return (
    <Link href={`/products/${p.handle}`} onClick={handleSelect} className="pcard" style={{ textDecoration: "none", cursor: "pointer" }}>
      <div className="img-wrap">
        {p.images?.[0] ? (
          <Image
            src={p.images[0]}
            alt={p.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
            // Cards render at ~184px; q=65 is visually identical at that size
            // while cutting bytes + on-demand optimisation time (helps LCP).
            quality={65}
            style={{ objectFit: "cover" }}
            // Prioritise the first row of cards (above the fold) so the LCP
            // image is eagerly loaded with fetchpriority=high; the rest stay
            // lazy by default. `priority` already implies eager loading, so we
            // must NOT also pass `loading` (Next suppresses fetchpriority then).
            priority={index != null && index < 4}
          />
        ) : (
          <ProductPH label={p.sku.split("-").slice(0, 2).join("-")} tone={toneFromString(p.sku)} style={{ width: "100%", height: "100%" }} />
        )}
        {p.badges.length > 0 && (
          <div className="img-badges">
            {p.badges.map((b) => (
              <Badge key={b} kind={b} />
            ))}
          </div>
        )}
        <div className="img-stock-pill">
          <StockPill
            stockQty={p.stockQty}
            lowStockLevel={p.lowStockLevel}
            trackInventory={p.trackInventory}
          />
        </div>
      </div>
      <div className="card-body">
        <div className="sku">
          {p.customerSku ?? p.sku} · {p.brand}
        </div>
        <div className="name">{p.name}</div>
        <div className="card-foot">
          {p.leadTimeDays != null && p.leadTimeDays > 0 && (
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Ships in ~{p.leadTimeDays}d
            </div>
          )}
          <div className="price-row">
          <div>
            <div className="price">
              {p.wasSalePrice != null && (
                <span className="was">${p.wasSalePrice.toFixed(2)}</span>
              )}
              ${p.price.toFixed(2)}
              <small style={{ fontSize: 11, fontWeight: 400, color: "var(--muted)", marginLeft: 4 }}>
                /ea
              </small>
            </div>
            {bestSavingsPct > 0 && (
              <div className="tier-hint">
                Save {bestSavingsPct}% at {p.tiers[p.tiers.length - 1].minQty}+
              </div>
            )}
          </div>
          <span className="list-price" style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-geist-mono, monospace)" }}>
            List ${p.listPrice.toFixed(2)}
          </span>
          </div>
          <div style={{ marginTop: 8 }}>
            <CompareToggle item={{ handle: p.handle, name: p.name, image: p.images?.[0], price: p.price, brand: p.brand }} />
          </div>
        </div>
      </div>
    </Link>
  );
}
