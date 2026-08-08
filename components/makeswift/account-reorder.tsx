"use client";

// "Account / Reorder" — recently purchased SKUs with one-tap add-to-cart.
// Data comes from GET /api/account/recent-skus (derived from the signed-in
// company's recent orders). Each "Add" resolves the SKU to its Shopify variant
// via /api/shopify/product-by-sku, then POSTs to /api/cart/add and refreshes
// the header cart badge via the "storage" event. Drop it into any account
// dashboard region.

import { useEffect, useState } from "react";
import { runtime } from "@/lib/makeswift/runtime";
import { Style, TextInput, Number as NumberCtrl } from "@makeswift/runtime/controls";
import { useToast } from "@/components/ui/toast";

interface RecentSku {
  sku: string;
  name: string;
  lastOrdered: string; // ISO date
}

interface ReorderProps {
  className?: string;
  heading?: string;
  emptyText?: string;
  maxRows?: number;
}

type LoadState = "loading" | "ready";

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "—";
  }
}

function AccountReorder(p: ReorderProps) {
  const { className, heading, emptyText } = p;
  const rows = Math.max(1, Math.min(p.maxRows ?? 4, 12));
  const { toast } = useToast();
  const [items, setItems] = useState<RecentSku[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/account/recent-skus?limit=${rows}`);
        const data = (await res.json().catch(() => ({}))) as { items?: RecentSku[] };
        if (!cancelled) setItems(data.items ?? []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setState("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [rows]);

  async function add(sku: string) {
    if (busy) return;
    setBusy(sku);
    try {
      // Resolve the SKU to its Shopify variant id — /api/cart/add takes a
      // merchandiseId. We also pass `sku` so the payload matches the batch
      // contract Quick Order uses.
      const lookup = await fetch(`/api/shopify/product-by-sku?sku=${encodeURIComponent(sku)}`);
      const prod = (await lookup.json().catch(() => ({}))) as { merchandiseId?: string; error?: string };
      if (!lookup.ok || !prod.merchandiseId) {
        toast(prod.error ?? "Couldn’t find that item.", "error");
        return;
      }
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: [{ sku, merchandiseId: prod.merchandiseId, quantity: 1 }] }),
      });
      if (res.ok) {
        window.dispatchEvent(new Event("storage")); // refresh the header cart badge
        toast("Added to your cart", "success");
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        toast(d.error ?? "Couldn’t add to cart.", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  const shown = items.slice(0, rows);

  return (
    <div className={`card ${className ?? ""}`}>
      <div className="card-h">
        <h3>{heading || "Buy it again"}</h3>
      </div>
      {state === "loading" ? (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          Loading…
        </div>
      ) : shown.length === 0 ? (
        <div className="card-b muted" style={{ fontSize: 13, padding: "24px 16px", textAlign: "center" }}>
          {emptyText || "Nothing to reorder yet — recently purchased items will appear here."}
        </div>
      ) : (
        <table className="tbl tbl-mobile-cards">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Last ordered</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {shown.map((it) => (
              <tr key={it.sku}>
                <td className="col-primary">{it.name}</td>
                <td className="col-hide mono" style={{ fontSize: 12 }}>{it.sku}</td>
                <td className="col-meta muted">{fmtDate(it.lastOrdered)}</td>
                <td className="col-value num">
                  <button
                    type="button"
                    className="btn btn-sm"
                    disabled={busy === it.sku}
                    onClick={() => add(it.sku)}
                    style={{ opacity: busy === it.sku ? 0.6 : 1 }}
                  >
                    {busy === it.sku ? "Adding…" : "Add"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

runtime.registerComponent(AccountReorder, {
  type: "acme-account-reorder",
  label: "Account / Reorder — one-tap buy-again widget",
  icon: "bolt",
  props: {
    className: Style(),
    heading: TextInput({ label: "Heading", defaultValue: "Buy it again" }),
    maxRows: NumberCtrl({ label: "Rows to show", defaultValue: 4 }),
    emptyText: TextInput({
      label: "Empty text",
      defaultValue: "Nothing to reorder yet — recently purchased items will appear here.",
    }),
  },
});

export default AccountReorder;
