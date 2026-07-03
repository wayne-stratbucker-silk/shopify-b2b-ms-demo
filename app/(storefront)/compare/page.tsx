import Link from "next/link";
import Image from "next/image";
import { getProduct } from "@/lib/shopify/queries/products";
import { mapProduct } from "@/lib/shopify/product-fetcher";
import type { Product } from "@/types";

export const dynamic = "force-dynamic";

const fmt = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

type Props = { searchParams: Promise<{ handles?: string }> };

export default async function ComparePage({ searchParams }: Props) {
  const { handles } = await searchParams;
  const list = (handles ?? "")
    .split(",")
    .map((h) => decodeURIComponent(h.trim()))
    .filter(Boolean)
    .slice(0, 4);

  const products = (
    await Promise.all(list.map((h) => getProduct(h).then((sp) => (sp ? mapProduct(sp) : null)).catch(() => null)))
  ).filter((p): p is Product => !!p);

  if (products.length < 2) {
    return (
      <div className="container section" style={{ textAlign: "center" }}>
        <h1 className="text-h1" style={{ marginBottom: 12 }}>Compare products</h1>
        <p style={{ color: "var(--muted)", marginBottom: 20 }}>Add at least two products to compare — use the “Compare” button on any product.</p>
        <Link href="/" className="btn btn-primary">Browse catalog</Link>
      </div>
    );
  }

  // Union of spec keys across the compared products, in first-seen order.
  const specKeys: string[] = [];
  for (const p of products) for (const k of Object.keys(p.specs ?? {})) if (!specKeys.includes(k)) specKeys.push(k);

  const rows: Array<{ label: string; render: (p: Product) => React.ReactNode }> = [
    { label: "Price", render: (p) => <span style={{ fontWeight: 600 }}>{fmt(p.price)}</span> },
    { label: "Brand", render: (p) => p.brand || "—" },
    { label: "SKU", render: (p) => <span className="text-mono" style={{ fontSize: 12 }}>{p.sku}</span> },
    { label: "Availability", render: (p) => p.leadTime || (p.stockQty > 0 ? "In stock" : "—") },
    { label: "Unit", render: (p) => p.uom || "EA" },
    ...specKeys.map((k) => ({ label: k, render: (p: Product) => p.specs?.[k] ?? "—" })),
  ];

  return (
    <div className="container section">
      <h1 className="text-h1" style={{ marginBottom: 24 }}>Compare products</h1>
      <div className="card" style={{ overflow: "auto" }}>
        <table className="tbl" style={{ width: "100%", minWidth: 640 }}>
          <thead>
            <tr>
              <th style={{ width: 160 }} />
              {products.map((p) => (
                <th key={p.handle} style={{ verticalAlign: "top", textAlign: "left", padding: 12 }}>
                  <Link href={`/products/${p.handle}`} style={{ textDecoration: "none", color: "var(--ink)" }}>
                    <div style={{ position: "relative", width: "100%", height: 120, marginBottom: 8, background: "var(--surface-2, #f6f7f9)", borderRadius: 6 }}>
                      {p.images?.[0] && (
                        <Image src={p.images[0]} alt={p.name} fill sizes="200px" style={{ objectFit: "contain", padding: 8 }} />
                      )}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{p.name}</div>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label}>
                <td style={{ fontWeight: 500, fontSize: 13, color: "var(--ink-2)", background: "var(--surface-2, #f6f7f9)" }}>{row.label}</td>
                {products.map((p) => (
                  <td key={p.handle} style={{ fontSize: 13, padding: 12 }}>{row.render(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
