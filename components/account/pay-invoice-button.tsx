"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

interface Props {
  orderId: string;
  amountLabel: string;
}

/**
 * Records payment against an invoice (order on terms) via
 * POST /api/account/invoices/pay → orderMarkAsPaid. Refreshes the page on
 * success so the balance / status re-render.
 */
export function PayInvoiceButton({ orderId, amountLabel }: Props) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  async function pay() {
    if (busy) return;
    if (!window.confirm(`Record payment of ${amountLabel} for this invoice?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/account/invoices/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || "Payment could not be recorded", "error");
        return;
      }
      toast("Payment recorded", "success");
      router.refresh();
    } catch {
      toast("Payment could not be recorded", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn btn-primary btn-block" onClick={pay} disabled={busy} type="button">
      {busy ? "Recording…" : `Pay ${amountLabel}`}
    </button>
  );
}
