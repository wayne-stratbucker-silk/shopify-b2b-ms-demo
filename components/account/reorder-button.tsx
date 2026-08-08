"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icons";

// One-tap reorder — adds an order's line items back to the cart via the same
// endpoint the buy box uses. Rendered in the order-detail header (accelerator
// parity). No-ops when the order has no SKU'd line items.
export function ReorderButton({ items, label = "Reorder" }: { items: Array<{ sku: string; quantity: number }>; label?: string }) {
  const [state, setState] = useState<"idle" | "adding" | "done">("idle");
  const skuItems = items.filter((i) => i.sku);
  if (!skuItems.length) return null;

  async function reorder() {
    setState("adding");
    try {
      const res = await fetch("/api/cart/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: skuItems }),
      });
      if (res.ok) {
        setState("done");
        window.dispatchEvent(new Event("storage"));
        setTimeout(() => setState("idle"), 2500);
      } else {
        setState("idle");
      }
    } catch {
      setState("idle");
    }
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={reorder} disabled={state === "adding"} style={{ gap: 6 }}>
      <Icon name={state === "done" ? "check" : "cart"} size={14} />
      {state === "adding" ? "Adding…" : state === "done" ? "Added to cart" : label}
    </button>
  );
}
