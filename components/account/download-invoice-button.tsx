"use client";

import { Icon } from "@/components/ui/icons";
import { brand } from "@/lib/brand/config";

export interface InvoiceData {
  orderId: number;
  date: string;
  buyerName: string;
  company: string;
  poNumber: string;
  status: string;
  items: { sku: string; name: string; quantity: number; price: number; total: number }[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  shipTo?: { name: string; street: string; cityStateZip: string };
}

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const esc = (s: string) =>
  String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
  );

function invoiceHtml(d: InvoiceData): string {
  const rows = d.items
    .map(
      (it) => `<tr>
        <td class="mono">${esc(it.sku)}</td>
        <td>${esc(it.name)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">${usd(it.price)}</td>
        <td class="num">${usd(it.total)}</td>
      </tr>`,
    )
    .join("");

  const shipTo = d.shipTo
    ? `<div class="addr"><div class="lbl">Ship to</div>
        <div>${esc(d.shipTo.name)}</div>
        <div>${esc(d.shipTo.street)}</div>
        <div>${esc(d.shipTo.cityStateZip)}</div></div>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8">
  <title>Invoice — Order #${d.orderId}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 40px; font-size: 13px; }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1a3a5c; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 20px; color: #1a3a5c; }
    .mark { background: #1a3a5c; color: #fff; width: 34px; height: 34px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-family: ui-monospace, monospace; }
    .doc { text-align: right; }
    .doc h1 { font-size: 22px; margin: 0 0 4px; letter-spacing: .04em; }
    .doc .meta { color: #555; font-size: 12px; line-height: 1.6; }
    .cols { display: flex; gap: 40px; margin-bottom: 24px; }
    .addr .lbl, .meta .lbl { text-transform: uppercase; font-size: 10px; letter-spacing: .08em; color: #888; margin-bottom: 4px; }
    .addr { line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #888; border-bottom: 1px solid #ddd; padding: 8px 10px; }
    td { padding: 9px 10px; border-bottom: 1px solid #eee; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .totals { width: 280px; margin-left: auto; }
    .totals .row { display: flex; justify-content: space-between; padding: 6px 10px; }
    .totals .grand { border-top: 2px solid #1a3a5c; font-weight: 700; font-size: 15px; margin-top: 4px; }
    .foot { margin-top: 40px; color: #888; font-size: 11px; border-top: 1px solid #eee; padding-top: 16px; }
    @media print { body { padding: 0; } @page { margin: 18mm; } }
  </style></head><body>
  <div class="head">
    <div>
      <div class="brand"><span class="mark">${esc(brand.name.charAt(0))}</span> ${esc(brand.name)}</div>
      <div class="meta" style="margin-top:8px;color:#555">${esc(brand.legalName)}<br>${esc(brand.tagline)}</div>
    </div>
    <div class="doc">
      <h1>INVOICE</h1>
      <div class="meta">
        <div><strong>Order #${d.orderId}</strong></div>
        <div>Date: ${esc(d.date)}</div>
        ${d.poNumber ? `<div>PO #: ${esc(d.poNumber)}</div>` : ""}
        <div>Status: ${esc(d.status)}</div>
      </div>
    </div>
  </div>
  <div class="cols">
    <div class="addr"><div class="lbl">Bill to</div>
      ${d.company ? `<div><strong>${esc(d.company)}</strong></div>` : ""}
      <div>${esc(d.buyerName)}</div>
    </div>
    ${shipTo}
  </div>
  <table>
    <thead><tr><th>SKU</th><th>Item</th><th class="num">Qty</th><th class="num">Unit</th><th class="num">Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div class="row"><span>Subtotal</span><span>${usd(d.subtotal)}</span></div>
    <div class="row"><span>Shipping</span><span>${usd(d.shipping)}</span></div>
    <div class="row"><span>Tax</span><span>${usd(d.tax)}</span></div>
    <div class="row grand"><span>Total</span><span>${usd(d.total)}</span></div>
  </div>
  <div class="foot">Thank you for your business. Questions? Contact your account rep or ${esc(brand.arEmail)}.</div>
  </body></html>`;
}

export function DownloadInvoiceButton({ invoice }: { invoice: InvoiceData }) {
  function handleClick() {
    const w = window.open("", "_blank", "width=860,height=960");
    if (!w) {
      // Popup blocked — fall back to printing the current document.
      window.print();
      return;
    }
    w.document.write(invoiceHtml(invoice));
    w.document.close();
    w.focus();
    // Give the new document a tick to lay out before invoking print.
    setTimeout(() => {
      w.print();
    }, 300);
  }

  return (
    <button className="btn btn-ghost btn-sm" onClick={handleClick} type="button">
      <Icon name="download" size={14} />
      Download invoice
    </button>
  );
}
