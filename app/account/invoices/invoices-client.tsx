"use client";

// Interactive invoices table — mirrors the BC Catalyst accelerator's invoices
// UX (search + status filter, CSV export, multi-select + confirm-pay modal,
// due-date urgency pills, status badges), wired to Shopify. "Paying" here is
// Shopify's orderMarkAsPaid (POST /api/account/invoices/pay, one order per
// call), so the confirm modal marks the selected invoices paid rather than
// redirecting to a checkout.

import { useState, Fragment } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DownloadInvoiceButton, type InvoiceData } from "@/components/account/download-invoice-button";
import {
  useTableSort,
  sortRows,
  SortHeader,
  formatMoney,
  formatDate,
  DeadlinePill,
} from "@/components/account/sortable-table";

export interface InvoiceRow {
  id: string;          // numeric order id (URL segment)
  gid: string;         // order GID (pay route)
  name: string;        // order name, e.g. "#1001"
  dueDate?: number;    // epoch SECONDS
  original: number;    // invoice total
  open: number;        // outstanding balance
  status: 0 | 1 | 2;   // 0 open · 1 partial · 2 paid
  invoiceData: InvoiceData;
}

const fmtTs = (ts: number) => formatDate(ts * 1000);

// Label/colour for a status + due date (shared by table, badge and CSV).
function statusInfo(status: 0 | 1 | 2, dueDate?: number): { label: string; cls: string } {
  const overdue = status < 2 && !!dueDate && dueDate < Date.now() / 1000;
  if (status === 2) return { label: "Paid", cls: "ok" };
  if (overdue) return { label: "Overdue", cls: "err" };
  if (status === 1) return { label: "Partial", cls: "warn" };
  return { label: "Open", cls: "info" };
}

function matchesStatus(inv: InvoiceRow, filter: string): boolean {
  const overdue = inv.status < 2 && !!inv.dueDate && inv.dueDate < Date.now() / 1000;
  if (filter === "open") return inv.status === 0 && !overdue;
  if (filter === "overdue") return overdue;
  if (filter === "partial") return inv.status === 1 && !overdue;
  if (filter === "paid") return inv.status === 2;
  return true;
}

type SortCol = "name" | "dueDate" | "open" | "original" | "status";
const accessors: Record<SortCol, (i: InvoiceRow) => string | number> = {
  name: (i) => i.name,
  dueDate: (i) => i.dueDate ?? 0,
  open: (i) => i.open,
  original: (i) => i.original,
  status: (i) => i.status,
};

// Next-due default ordering: unpaid first, then by due date, stable by id.
function defaultSort(rows: InvoiceRow[]): InvoiceRow[] {
  return [...rows].sort((a, b) => {
    const aPaid = a.status === 2 ? 1 : 0;
    const bPaid = b.status === 2 ? 1 : 0;
    if (aPaid !== bPaid) return aPaid - bPaid;
    const aDue = a.dueDate || Infinity;
    const bDue = b.dueDate || Infinity;
    if (aDue !== bDue) return aDue - bDue;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

export function InvoicesTable({ invoices, canPay = true }: { invoices: InvoiceRow[]; canPay?: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payAmounts, setPayAmounts] = useState<Record<string, string>>({});
  const { sortCol, sortDir, toggleSort } = useTableSort<SortCol | "default">("default", "asc");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payPending, setPayPending] = useState(false);
  const [payError, setPayError] = useState("");
  const [payDone, setPayDone] = useState(false);

  const nowSec = Date.now() / 1000;
  const openTotal = invoices.filter((i) => i.status < 2).reduce((s, i) => s + i.open, 0);
  const overdueTotal = invoices
    .filter((i) => i.status < 2 && i.dueDate && i.dueDate < nowSec)
    .reduce((s, i) => s + i.open, 0);

  const q = search.trim().toLowerCase();
  const filteredRows = invoices
    .filter((i) => matchesStatus(i, statusFilter))
    .filter((i) => (!q ? true : i.name.toLowerCase().includes(q)));
  const filtered =
    sortCol === "default"
      ? defaultSort(filteredRows)
      : sortRows(filteredRows, accessors[sortCol], sortDir, (i) => Number(i.id) || 0);

  const payableFiltered = filtered.filter((i) => i.status < 2);
  const allPayableSelected = payableFiltered.length > 0 && payableFiltered.every((i) => selected.has(i.id));
  const someSelected = selected.size > 0;

  const selectionTotal = [...selected].reduce((s, id) => {
    const inv = invoices.find((i) => i.id === id);
    const amt = payAmounts[id];
    const val = amt !== undefined ? parseFloat(amt) : inv?.open ?? 0;
    return s + (isNaN(val) ? 0 : val);
  }, 0);
  const selectedInvoices = [...selected].map((id) => invoices.find((i) => i.id === id)).filter((i): i is InvoiceRow => !!i);

  function toggleSelectAll() {
    setSelected((s) => {
      const next = new Set(s);
      if (allPayableSelected) payableFiltered.forEach((i) => next.delete(i.id));
      else payableFiltered.forEach((i) => next.add(i.id));
      return next;
    });
  }
  function toggleRow(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function openSinglePay(inv: InvoiceRow) {
    setSelected(new Set([inv.id]));
    setPayModalOpen(true);
  }

  function handleCsvExport() {
    const headers = ["Invoice #", "Due Date", "Invoice Total", "Amount Due", "Status"];
    const rows = filtered.map((inv) => {
      const { label } = statusInfo(inv.status, inv.dueDate);
      return [inv.name, inv.dueDate ? fmtTs(inv.dueDate) : "", inv.original.toFixed(2), inv.open.toFixed(2), label];
    });
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "invoices.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleConfirmPayment() {
    setPayPending(true);
    setPayError("");
    try {
      // Shopify marks a whole order paid per call — pay each selected invoice.
      const results = await Promise.all(
        selectedInvoices.map((inv) =>
          fetch("/api/account/invoices/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: inv.gid }),
          }).then((r) => r.json().then((d) => ({ ok: r.ok && d.ok, error: d.error as string | undefined }))),
        ),
      );
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        setPayError(`${failed.length} of ${results.length} could not be recorded${failed[0]?.error ? ` — ${failed[0].error}` : ""}.`);
        return;
      }
      setPayDone(true);
      setSelected(new Set());
      router.refresh();
      setTimeout(() => { setPayModalOpen(false); setPayDone(false); }, 1200);
    } catch {
      setPayError("Network error — please try again");
    } finally {
      setPayPending(false);
    }
  }

  return (
    <>
      {/* Summary header */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, fontSize: 14, fontWeight: 500 }}>
        <span>Open: <span className="mono">{formatMoney(openTotal)}</span></span>
        <span style={{ color: "var(--line-2)" }}>|</span>
        <span>Overdue: <span className="mono" style={{ color: overdueTotal > 0 ? "var(--danger)" : undefined }}>{formatMoney(overdueTotal)}</span></span>
      </div>

      {/* Payment selection bar */}
      {canPay && someSelected && (
        <div style={{ background: "var(--primary)", color: "#fff", padding: "10px 20px", borderRadius: "var(--radius-card)", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12 }}>
          <span style={{ fontSize: 13 }}><strong>{selected.size}</strong> invoice{selected.size > 1 ? "s" : ""} selected</span>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span className="mono" style={{ fontSize: 16, fontWeight: 700 }}>{formatMoney(selectionTotal)}</span>
            <button className="btn btn-sm" style={{ background: "#fff", color: "var(--primary)", fontWeight: 600 }} onClick={() => setPayModalOpen(true)}>
              Pay {selected.size} invoice{selected.size > 1 ? "s" : ""} →
            </button>
          </div>
        </div>
      )}

      <div className="card">
        {/* Toolbar */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <input className="input" placeholder="Search invoice #…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240, height: 34, fontSize: 13 }} />
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ height: 34, width: 140, fontSize: 12, cursor: "pointer" }}>
              <option value="all">All status</option>
              <option value="open">Open</option>
              <option value="overdue">Overdue</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
            <button className="btn btn-ghost btn-sm" onClick={handleCsvExport} title="Export filtered as CSV">Export CSV</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="muted" style={{ textAlign: "center", padding: "48px 24px", fontSize: 13 }}>
            {invoices.length === 0 ? "No invoices yet." : "No invoices match your search."}
          </div>
        ) : (
          <table className="tbl tbl-mobile-cards">
            <thead>
              <tr>
                {canPay && (
                  <th style={{ width: 36, padding: "0 8px 0 16px" }}>
                    <input
                      type="checkbox"
                      checked={allPayableSelected}
                      ref={(el) => { if (el) el.indeterminate = !allPayableSelected && payableFiltered.some((i) => selected.has(i.id)); }}
                      onChange={toggleSelectAll}
                      style={{ cursor: "pointer" }}
                      aria-label="Select all payable invoices"
                    />
                  </th>
                )}
                <SortHeader col="name" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>Invoice #</SortHeader>
                <SortHeader col="dueDate" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>Due date</SortHeader>
                <SortHeader col="original" activeCol={sortCol} dir={sortDir} onSort={toggleSort} className="col-hide num">Invoice total</SortHeader>
                <SortHeader col="open" activeCol={sortCol} dir={sortDir} onSort={toggleSort} className="num">Amount due</SortHeader>
                {canPay && <th className="num">Amount to pay</th>}
                <SortHeader col="status" activeCol={sortCol} dir={sortDir} onSort={toggleSort}>Status</SortHeader>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => {
                const { label, cls } = statusInfo(inv.status, inv.dueDate);
                const isPaid = inv.status === 2;
                return (
                  <tr key={inv.id}>
                    {canPay && (
                      <td style={{ padding: "0 8px 0 16px" }}>
                        {!isPaid && (
                          <input type="checkbox" checked={selected.has(inv.id)} onChange={() => toggleRow(inv.id)} style={{ cursor: "pointer" }} aria-label={`Select invoice ${inv.name}`} />
                        )}
                      </td>
                    )}
                    <td className="col-primary mono" style={{ fontSize: 13 }}>
                      <Link href={`/account/invoices/${inv.id}`} className="tbl row-link">{inv.name}</Link>
                    </td>
                    <td className="col-meta">
                      {isPaid ? <span className="muted">{inv.dueDate ? fmtTs(inv.dueDate) : "—"}</span> : <DeadlinePill ts={inv.dueDate} />}
                    </td>
                    <td className="col-hide num">{formatMoney(inv.original)}</td>
                    <td className="col-value num" style={{ fontWeight: inv.open > 0 ? 600 : 400 }}>{formatMoney(inv.open)}</td>
                    {canPay && (
                      <td className="num" style={{ minWidth: 120 }}>
                        {!isPaid ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 4, justifyContent: "flex-end" }}>
                            <span className="muted" style={{ fontSize: 12 }}>$</span>
                            <input
                              type="number" step="0.01" min="0.01" max={inv.open}
                              value={payAmounts[inv.id] ?? inv.open.toFixed(2)}
                              onChange={(e) => setPayAmounts((a) => ({ ...a, [inv.id]: e.target.value }))}
                              className="input"
                              style={{ width: 90, height: 28, textAlign: "right", fontSize: 12, padding: "0 6px" }}
                            />
                          </div>
                        ) : <span className="muted" style={{ fontSize: 12 }}>—</span>}
                      </td>
                    )}
                    <td className="col-status"><span className={`status status-${cls}`}>{label}</span></td>
                    <td className="col-action">
                      <div style={{ display: "flex", gap: 4, justifyContent: "flex-end", alignItems: "center" }}>
                        <Link href={`/account/invoices/${inv.id}`} className="btn btn-ghost btn-xs" title="View invoice details">View</Link>
                        <DownloadInvoiceButton invoice={inv.invoiceData} />
                        {canPay && !isPaid && <button className="btn btn-xs" onClick={() => openSinglePay(inv)}>Pay</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Confirm-pay modal */}
      {payModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          onClick={(e) => { if (e.target === e.currentTarget && !payPending) setPayModalOpen(false); }}
        >
          <div style={{ background: "var(--surface)", borderRadius: "var(--radius-card)", padding: 28, width: "100%", maxWidth: 520, boxShadow: "0 8px 32px rgba(0,0,0,.18)" }}>
            <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>Confirm payment</h3>
            <table className="tbl" style={{ marginBottom: 16 }}>
              <thead><tr><th>Invoice #</th><th>Due date</th><th className="num">Amount</th></tr></thead>
              <tbody>
                {selectedInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="mono" style={{ fontSize: 13 }}>{inv.name}</td>
                    <td className="muted">{inv.dueDate ? fmtTs(inv.dueDate) : "—"}</td>
                    <td className="num">{formatMoney(inv.open)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 0", borderTop: "1px solid var(--line)", marginBottom: 16 }}>
              <span style={{ fontSize: 12, color: "var(--ink-2)" }}>Marks the selected invoice{selectedInvoices.length > 1 ? "s" : ""} paid on the order.</span>
              <span className="mono" style={{ fontWeight: 700, fontSize: 18 }}>{formatMoney(selectedInvoices.reduce((s, i) => s + i.open, 0))}</span>
            </div>
            {payError && <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--danger)" }}>{payError}</p>}
            {payDone && <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--success)" }}>Payment recorded.</p>}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => { setPayModalOpen(false); setPayError(""); }} disabled={payPending}>Cancel</button>
              <button className="btn btn-sm" onClick={handleConfirmPayment} disabled={payPending || payDone}>
                {payPending ? "Recording…" : `Mark ${selectedInvoices.length} paid`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
